import net from "net";
import tls from "tls";
import { randomBytes } from "crypto";

import { AppError } from "@/lib/app-error";
import { getEmailRuntimeConfig, type EmailRuntimeConfig } from "@/lib/settings";

type EmailPayload = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

const SMTP_TIMEOUT_MS = 20000;

function normalizeRecipients(value: string | string[]) {
  const recipients = (Array.isArray(value) ? value : [value])
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (!recipients.length) {
    throw new AppError("BAD_REQUEST", "请填写收件邮箱。", 400);
  }

  for (const recipient of recipients) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      throw new AppError("BAD_REQUEST", `收件邮箱格式不正确：${recipient}`, 400);
    }
  }

  return recipients;
}

function assertEmailReady(config: EmailRuntimeConfig) {
  if (!config.enabled) {
    throw new AppError("PROVIDER_CONFIG", "SMTP 发信未启用。", 400);
  }

  if (!config.host || !config.port || !config.fromEmail) {
    throw new AppError("PROVIDER_CONFIG", "SMTP Host、端口和发件邮箱未配置完整。", 400);
  }

  if (config.username && !config.password) {
    throw new AppError("PROVIDER_CONFIG", "SMTP 用户名已填写，但密码未配置。", 400);
  }
}

function escapeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string) {
  const clean = escapeHeader(value);
  return /^[\x00-\x7F]*$/.test(clean) ? clean : `=?UTF-8?B?${Buffer.from(clean).toString("base64")}?=`;
}

function formatAddress(email: string, name?: string) {
  const cleanEmail = escapeHeader(email);
  const cleanName = name ? encodeHeader(name) : "";
  return cleanName ? `${cleanName} <${cleanEmail}>` : cleanEmail;
}

function dotStuff(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function buildMessage(config: EmailRuntimeConfig, recipients: string[], payload: EmailPayload) {
  const text = payload.text || "";
  const html = payload.html || "";
  const boundary = `image2-${randomBytes(12).toString("hex")}`;
  const headers = [
    `From: ${formatAddress(config.fromEmail, config.fromName)}`,
    `To: ${recipients.map((recipient) => formatAddress(recipient)).join(", ")}`,
    `Subject: ${encodeHeader(payload.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomBytes(16).toString("hex")}@image2.local>`,
    "MIME-Version: 1.0",
  ];

  if (config.replyTo) {
    headers.push(`Reply-To: ${formatAddress(config.replyTo)}`);
  }

  if (html && text) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    return dotStuff(
      [
        ...headers,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=utf-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        text,
        `--${boundary}`,
        "Content-Type: text/html; charset=utf-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        html,
        `--${boundary}--`,
        "",
      ].join("\r\n"),
    );
  }

  headers.push(`Content-Type: ${html ? "text/html" : "text/plain"}; charset=utf-8`);
  headers.push("Content-Transfer-Encoding: 8bit");
  return dotStuff([...headers, "", html || text].join("\r\n"));
}

function connectSocket(config: EmailRuntimeConfig): Promise<SmtpSocket> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (socket: SmtpSocket, error: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error);
    };
    const succeed = (socket: SmtpSocket, errorListener: (error: Error) => void) => {
      if (settled) return;
      settled = true;
      socket.off("error", errorListener);
      resolve(socket);
    };

    if (config.secure) {
      const socket = tls.connect({
        host: config.host,
        port: config.port,
        servername: config.host,
        timeout: SMTP_TIMEOUT_MS,
      });
      const onError = (error: Error) => fail(socket, error);
      socket.once("error", onError);
      socket.once("timeout", () => fail(socket, new Error("SMTP 连接超时。")));
      socket.once("secureConnect", () => succeed(socket, onError));
      return;
    }

    const socket = net.connect({
      host: config.host,
      port: config.port,
      timeout: SMTP_TIMEOUT_MS,
    });
    const onNetError = (error: Error) => fail(socket, error);
    socket.once("error", onNetError);
    socket.once("timeout", () => fail(socket, new Error("SMTP 连接超时。")));
    socket.once("connect", () => succeed(socket, onNetError));
  });
}

class SmtpSession {
  private socket: SmtpSocket;
  private buffer = "";

  constructor(socket: SmtpSocket) {
    this.socket = socket;
  }

  private readResponse(): Promise<{ code: number; message: string }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("SMTP 响应超时。"));
      }, SMTP_TIMEOUT_MS);

      const cleanup = () => {
        clearTimeout(timer);
        this.socket.off("data", onData);
        this.socket.off("error", onError);
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onData = (chunk: Buffer) => {
        this.buffer += chunk.toString("utf8");
        const lines = this.buffer.split(/\r?\n/);
        const completeIndex = lines.findIndex((line) => /^\d{3} /.test(line));
        if (completeIndex < 0) {
          return;
        }

        const responseLines = lines.slice(0, completeIndex + 1);
        this.buffer = lines.slice(completeIndex + 1).join("\n");
        cleanup();
        resolve({
          code: Number(responseLines[completeIndex].slice(0, 3)),
          message: responseLines.join("\n"),
        });
      };

      this.socket.on("data", onData);
      this.socket.on("error", onError);
      if (this.buffer) {
        onData(Buffer.alloc(0));
      }
    });
  }

  async expect(expectedCodes: number[]) {
    const response = await this.readResponse();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(response.message);
    }
    return response;
  }

  async command(command: string, expectedCodes = [250]) {
    this.socket.write(`${command}\r\n`);
    return this.expect(expectedCodes);
  }

  async upgradeToTls(host: string) {
    const nextSocket = tls.connect({
      socket: this.socket,
      servername: host,
      timeout: SMTP_TIMEOUT_MS,
    });
    this.socket = nextSocket;

    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onSecure = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        nextSocket.off("error", onError);
        nextSocket.off("secureConnect", onSecure);
      };

      nextSocket.once("error", onError);
      nextSocket.once("secureConnect", onSecure);
    });
  }

  close() {
    this.socket.end();
  }
}

export async function sendSystemEmail(payload: EmailPayload) {
  const config = await getEmailRuntimeConfig();
  assertEmailReady(config);
  const recipients = normalizeRecipients(payload.to);
  const session = new SmtpSession(await connectSocket(config));

  try {
    await session.expect([220]);
    const ehlo = await session.command(`EHLO ${config.host}`, [250]);

    if (!config.secure && /STARTTLS/i.test(ehlo.message)) {
      await session.command("STARTTLS", [220]);
      await session.upgradeToTls(config.host);
      await session.command(`EHLO ${config.host}`, [250]);
    }

    if (config.username) {
      await session.command("AUTH LOGIN", [334]);
      await session.command(Buffer.from(config.username).toString("base64"), [334]);
      await session.command(Buffer.from(config.password).toString("base64"), [235]);
    }

    await session.command(`MAIL FROM:<${config.fromEmail}>`, [250]);
    for (const recipient of recipients) {
      await session.command(`RCPT TO:<${recipient}>`, [250, 251]);
    }
    await session.command("DATA", [354]);
    await session.command(`${buildMessage(config, recipients, payload)}\r\n.`, [250]);
    await session.command("QUIT", [221]).catch(() => null);
  } catch (error) {
    throw new AppError("PROVIDER_CONFIG", error instanceof Error ? `邮件发送失败：${error.message}` : "邮件发送失败。", 400);
  } finally {
    session.close();
  }
}

export async function sendTestEmail(to?: string) {
  const config = await getEmailRuntimeConfig();
  const recipient = to?.trim() || config.testRecipient || config.fromEmail;

  await sendSystemEmail({
    to: recipient,
    subject: "造图台邮件测试",
    text: "如果你收到这封邮件，说明造图台 SMTP 发信配置已经生效。",
    html: "<p>如果你收到这封邮件，说明<strong>造图台 SMTP 发信配置已经生效</strong>。</p>",
  });

  return recipient;
}
