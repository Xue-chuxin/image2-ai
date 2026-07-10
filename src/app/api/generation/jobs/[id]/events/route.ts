import { getUserSession } from "@/lib/auth";
import { findGenerationJob } from "@/lib/generation-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 15000;
const MAX_STREAM_MS = 6 * 60 * 1000;

function isTerminalStatus(status?: string) {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELED";
}

/**
 * SSE 实时推送单个生成任务的状态：服务端轮询数据库，仅在状态/数据变化时下发，
 * 到达终态或超时后关闭。替代前端 2s 轮询，降低请求数与到账延迟。
 * 说明：当前为单实例内联执行模型，服务端轮询已足够；无需额外事件总线。
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession();
  if (!session) {
    return new Response("event: error\ndata: {\"error\":\"unauthorized\"}\n\n", {
      status: 401,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const { id } = await params;
  const initial = await findGenerationJob(session.userId, id);
  if (!initial) {
    return new Response("event: error\ndata: {\"error\":\"not_found\"}\n\n", {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let lastSerialized = "";
      const startedAt = Date.now();
      let pollTimer: ReturnType<typeof setTimeout> | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      const cleanup = () => {
        if (closed) {
          return;
        }
        closed = true;
        if (pollTimer) {
          clearTimeout(pollTimer);
        }
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }
        request.signal.removeEventListener("abort", cleanup);
        try {
          controller.close();
        } catch {
          // 已关闭，忽略。
        }
      };

      const send = (job: unknown) => {
        const serialized = JSON.stringify(job);
        if (serialized === lastSerialized) {
          return false;
        }
        lastSerialized = serialized;
        controller.enqueue(encoder.encode(`data: ${serialized}\n\n`));
        return true;
      };

      const tick = async () => {
        if (closed) {
          return;
        }

        try {
          const job = await findGenerationJob(session.userId, id);
          if (!job) {
            controller.enqueue(encoder.encode("event: error\ndata: {\"error\":\"not_found\"}\n\n"));
            cleanup();
            return;
          }

          send(job);

          if (isTerminalStatus(job.status)) {
            cleanup();
            return;
          }
        } catch {
          // 单次读取失败不终止流，等待下次轮询。
        }

        if (Date.now() - startedAt > MAX_STREAM_MS) {
          controller.enqueue(encoder.encode("event: timeout\ndata: {}\n\n"));
          cleanup();
          return;
        }

        if (!closed) {
          pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      };

      request.signal.addEventListener("abort", cleanup);

      // 立即下发初始状态，随后进入轮询。
      send(initial);
      if (isTerminalStatus(initial.status)) {
        cleanup();
        return;
      }

      heartbeatTimer = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(": ping\n\n"));
        }
      }, HEARTBEAT_INTERVAL_MS);

      pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
