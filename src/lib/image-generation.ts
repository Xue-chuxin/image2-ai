import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

import { generateWithChatGPTWeb } from "@/lib/chatgpt-web";
import {
  getOpenAICompatibleRuntimeChannels,
  getPublicAppSettings,
  getStabilityAiRuntimeConfig,
  getStorageRuntimeConfig,
  type GenerationProviderName,
  type OpenAICompatibleRuntimeChannel,
} from "./settings";

export type ImageQuality = "standard" | "high" | "low";

export type ImageGenerationRequest = {
  promptZh?: string;
  promptEn?: string;
  negativePrompt?: string;
  ratio?: string;
  quality?: ImageQuality | string;
  imageCount?: number;
  referenceImages?: Array<{
    id: string;
    url: string;
    thumbnailUrl?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    width?: number | null;
    height?: number | null;
  }>;
};

export type GeneratedImagePayload = {
  buffer: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
};

export type ImageGenerationResult = {
  provider: GenerationProviderName;
  model: string;
  images: GeneratedImagePayload[];
};

export interface ImageGenerationProvider {
  name: GenerationProviderName;
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function buildPrompt(request: ImageGenerationRequest, referenceAnalysis?: string) {
  const prompt = (request.promptEn || request.promptZh || "").trim();
  const negativePrompt = request.negativePrompt?.trim();

  if (!prompt) {
    throw new Error("请输入生成提示词。");
  }

  const parts = [prompt];

  if (referenceAnalysis) {
    parts.unshift(`[Reference image visual analysis: ${referenceAnalysis}]`);
  }

  if (negativePrompt) {
    parts.push(`Avoid: ${negativePrompt}`);
  }

  return parts.join("\n\n");
}

function extractImagePathname(imageUrl: string) {
  try {
    return new URL(imageUrl).pathname;
  } catch {
    return imageUrl;
  }
}

function safeDecodePathname(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveLocalImagePath(imageUrl: string, storageLocalBaseDir: string) {
  const clean = safeDecodePathname(extractImagePathname(imageUrl).split("?")[0].split("#")[0])
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const publicPath = path.resolve(process.cwd(), "public", clean);
  const localBaseDir = path.resolve(storageLocalBaseDir);
  const localPath = path.resolve(localBaseDir, clean);
  const publicDir = path.resolve(process.cwd(), "public");
  const publicRelativeBase = path.relative(publicDir, localBaseDir).replace(/\\/g, "/");

  if (existsSync(publicPath)) {
    return publicPath;
  }

  if (publicRelativeBase && !publicRelativeBase.startsWith("..") && !path.isAbsolute(publicRelativeBase)) {
    const prefix = `${publicRelativeBase.replace(/^\/+|\/+$/g, "")}/`;
    if (clean.startsWith(prefix)) {
      const pathInsideLocalBase = clean.slice(prefix.length);
      const nestedLocalPath = path.resolve(localBaseDir, pathInsideLocalBase);
      if (existsSync(nestedLocalPath)) {
        return nestedLocalPath;
      }
      return nestedLocalPath;
    }
  }

  return localPath;
}

async function readImageAsBase64Url(filePath: string, mimeType?: string | null) {
  const buffer = await readFile(filePath);
  const mime = mimeType || "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

const REFERENCE_ANALYSIS_PROMPT = [
  "You are a visual analyst for an image generation pipeline.",
  "Analyze the provided reference image(s) and extract key visual characteristics.",
  "Describe: overall composition, color palette, lighting style, subject matter, art style, texture quality, and any distinctive visual elements.",
  "Output ONLY a concise English description (under 200 words) suitable for enhancing an image generation prompt.",
  "Do NOT include markdown, explanations, or any text that is not the description itself.",
].join("\n");

async function analyzeReferenceImages(
  images: Array<{ url: string; mimeType?: string | null }>,
  channel: OpenAICompatibleRuntimeChannel,
  visionModel: string,
): Promise<string | null> {
  if (!images.length) {
    return null;
  }

  try {
    const storageConfig = await getStorageRuntimeConfig();
    const imageContents: Array<{ type: "image_url"; image_url: { url: string } }> = [];

    for (const image of images) {
      const localPath = resolveLocalImagePath(image.url, storageConfig.localBaseDir);
      const dataUrl = await readImageAsBase64Url(localPath, image.mimeType);
      imageContents.push({
        type: "image_url",
        image_url: { url: dataUrl },
      });
    }

    const response = await fetch(`${channel.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channel.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: visionModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: REFERENCE_ANALYSIS_PROMPT },
              ...imageContents,
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Reference image analysis failed (status ${response.status}): ${errorText.slice(0, 200)}`);
      return null;
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.warn("Reference image analysis returned empty content.");
      return null;
    }

    return content;
  } catch (error) {
    console.warn(`Reference image analysis error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function normalizeImageCount(imageCount?: number) {
  if (!Number.isFinite(imageCount)) {
    return 1;
  }

  return Math.min(Math.max(Math.floor(Number(imageCount)), 1), 4);
}

function mapOpenAISize(ratio?: string, model?: string) {
  if (model === "dall-e-3") {
    if (ratio === "16:9") {
      return "1792x1024";
    }

    if (ratio === "3:4" || ratio === "9:16") {
      return "1024x1792";
    }

    return "1024x1024";
  }

  if (ratio === "16:9") {
    return "1536x1024";
  }

  if (ratio === "3:4" || ratio === "9:16") {
    return "1024x1536";
  }

  return "1024x1024";
}

function mapOpenAIQuality(quality?: ImageQuality | string, model?: string) {
  if (model === "dall-e-3") {
    return quality === "high" ? "hd" : "standard";
  }

  if (quality === "high") {
    return "high";
  }

  if (quality === "low") {
    return "low";
  }

  return "medium";
}

function normalizeImageCountForModel(imageCount?: number, model?: string) {
  const count = normalizeImageCount(imageCount);
  if (model === "dall-e-3") {
    return 1;
  }
  return count;
}

function sanitizeUpstreamMessage(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9._-]{8,}/g, "[redacted]")
    .replace(/key-[A-Za-z0-9._-]{8,}/g, "[redacted]")
    .replace(/authorization["']?\s*:\s*["'][^"']+["']/gi, "authorization: [redacted]")
    .slice(0, 240);
}

async function readOpenAIError(response: Response) {
  const bodyText = await response.text();

  if (!bodyText) {
    return `OpenAI 生图请求失败，状态码 ${response.status}`;
  }

  try {
    const data = JSON.parse(bodyText) as OpenAIImageResponse;
    return sanitizeUpstreamMessage(data.error?.message || bodyText);
  } catch {
    return sanitizeUpstreamMessage(bodyText);
  }
}

function isRetryableOpenAIStatus(status: number, message: string) {
  if (status === 401 || status === 403 || status === 404 || status === 408 || status === 409 || status === 429 || status >= 500) {
    return true;
  }

  if (status === 400) {
    return /model|not found|does not exist|unsupported|base url|endpoint|path/i.test(message);
  }

  return false;
}

class OpenAICompatibleChannelError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "OpenAICompatibleChannelError";
    this.retryable = retryable;
  }
}

function buildOpenAICompatibleUrl(channel: OpenAICompatibleRuntimeChannel) {
  return `${channel.baseUrl.replace(/\/+$/, "")}/images/generations`;
}

function buildOpenAIRequestBody(request: ImageGenerationRequest, model: string, referenceAnalysis?: string) {
  const prompt = buildPrompt(request, referenceAnalysis);
  const imageCount = normalizeImageCountForModel(request.imageCount, model);
  const requestBody: Record<string, unknown> = {
    model,
    prompt,
    n: imageCount,
    size: mapOpenAISize(request.ratio, model),
  };
  const quality = mapOpenAIQuality(request.quality, model);

  if (quality) {
    requestBody.quality = quality;
  }

  return requestBody;
}

async function generateWithOpenAICompatibleChannel(
  channel: OpenAICompatibleRuntimeChannel,
  request: ImageGenerationRequest,
  referenceAnalysis?: string,
): Promise<ImageGenerationResult> {
  if (!channel.apiKey) {
    throw new OpenAICompatibleChannelError(`${channel.name} 未配置 API Key。`, true);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), channel.timeoutSeconds * 1000);
  let response: Response;

  try {
    response = await fetch(buildOpenAICompatibleUrl(channel), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channel.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildOpenAIRequestBody(request, channel.model, referenceAnalysis)),
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "请求超时" : error instanceof Error ? error.message : "网络请求失败";
    throw new OpenAICompatibleChannelError(`${channel.name} ${message}。`, true);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const message = await readOpenAIError(response);
    throw new OpenAICompatibleChannelError(
      `${channel.name} 返回 ${response.status}：${message}`,
      isRetryableOpenAIStatus(response.status, message),
    );
  }

  try {
    const payload = (await response.json()) as OpenAIImageResponse;
    const data = payload.data || [];

    if (!data.length) {
      throw new Error("未返回生成图片");
    }

    const images = await Promise.all(
      data.map((item) => {
        if (item.b64_json) {
          return Promise.resolve(imageFromBase64(item.b64_json));
        }

        if (item.url) {
          return imageFromUrl(item.url);
        }

        throw new Error("返回的图片数据为空");
      }),
    );

    return {
      provider: "openai",
      model: `${channel.name} / ${channel.model}`,
      images,
    };
  } catch (error) {
    throw new OpenAICompatibleChannelError(
      `${channel.name} 响应解析失败：${error instanceof Error ? sanitizeUpstreamMessage(error.message) : "未知错误"}`,
      true,
    );
  }
}

function imageFromBase64(value: string): GeneratedImagePayload {
  return {
    buffer: Buffer.from(value, "base64"),
    mimeType: "image/png",
  };
}

async function imageFromUrl(url: string): Promise<GeneratedImagePayload> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`下载 OpenAI 生成图片失败，状态码 ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const mimeType =
    contentType.includes("jpeg") || contentType.includes("jpg")
      ? "image/jpeg"
      : contentType.includes("webp")
        ? "image/webp"
        : "image/png";

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
  };
}

class OpenAIImageProvider implements ImageGenerationProvider {
  name: GenerationProviderName = "openai";

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const channels = await getOpenAICompatibleRuntimeChannels();

    if (!channels.length) {
      throw new Error("后台尚未配置 OpenAI 兼容通道，请先到后台配置页保存通道。");
    }

    let referenceAnalysis: string | undefined;

    if (request.referenceImages?.length) {
      const { openaiVisionModel } = await getPublicAppSettings();
      const referenceAnalysisChannel = channels.find((channel) => channel.apiKey);

      if (openaiVisionModel && referenceAnalysisChannel) {
        referenceAnalysis = (await analyzeReferenceImages(
          request.referenceImages.map((img) => ({ url: img.url, mimeType: img.mimeType })),
          referenceAnalysisChannel,
          openaiVisionModel,
        )) || undefined;
      }
    }

    const errors: string[] = [];

    for (const channel of channels) {
      try {
        return await generateWithOpenAICompatibleChannel(channel, request, referenceAnalysis);
      } catch (error) {
        if (error instanceof OpenAICompatibleChannelError) {
          errors.push(error.message);
          if (!error.retryable) {
            throw new Error(error.message);
          }
          continue;
        }

        errors.push(error instanceof Error ? sanitizeUpstreamMessage(error.message) : "未知错误");
      }
    }

    throw new Error(`OpenAI 兼容通道全部失败：${errors.join("；") || "没有可用通道"}`);
  }
}

class ChatGPTWebProvider implements ImageGenerationProvider {
  name: GenerationProviderName = "chatgpt_web";

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const images = await generateWithChatGPTWeb(request);

    return {
      provider: this.name,
      model: "chatgpt-web",
      images,
    };
  }
}

class StabilityAIProvider implements ImageGenerationProvider {
  name: GenerationProviderName = "stability_ai";

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const config = await getStabilityAiRuntimeConfig();

    if (!config.apiKey) {
      throw new Error("后台尚未配置 Stability AI API Key，请先到后台配置页保存密钥。");
    }

    const prompt = (request.promptEn || request.promptZh || "").trim();
    if (!prompt) {
      throw new Error("请输入生成提示词。");
    }

    const negativePrompt = request.negativePrompt?.trim();
    const count = Math.min(Math.max(Math.floor(Number(request.imageCount || 1)), 1), 4);

    const body: Record<string, unknown> = {
      text_prompts: [
        { text: prompt, weight: 1 },
        ...(negativePrompt ? [{ text: negativePrompt, weight: -1 }] : []),
      ],
      cfg_scale: 7,
      samples: count,
    };

    const size = this.mapSize(request.ratio);
    if (size) {
      body.height = size.height;
      body.width = size.width;
    }

    if (request.referenceImages?.length) {
      const storageConfig = await getStorageRuntimeConfig();
      const refImage = request.referenceImages[0];
      const localPath = resolveLocalImagePath(refImage.url, storageConfig.localBaseDir);
      const imageBuffer = await readFile(localPath);
      const formData = new FormData();
      formData.append("init_image", new Blob([imageBuffer]), "reference.png");
      formData.append("init_image_mode", "IMAGE_STRENGTH");
      formData.append("image_strength", "0.35");
      formData.append("text_prompts[0][text]", prompt);
      formData.append("text_prompts[0][weight]", "1");
      if (negativePrompt) {
        formData.append("text_prompts[1][text]", negativePrompt);
        formData.append("text_prompts[1][weight]", "-1");
      }
      formData.append("cfg_scale", "7");
      formData.append("samples", String(count));

      const response = await fetch(`https://api.stability.ai/v1/generation/${config.model}/image-to-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability AI 请求失败：${response.status} ${errorText.slice(0, 240)}`);
      }

      const result = (await response.json()) as {
        artifacts?: Array<{ base64: string; finishReason: string }>;
      };

      const images = (result.artifacts || []).map((artifact) => ({
        buffer: Buffer.from(artifact.base64, "base64"),
        mimeType: "image/png" as const,
      }));

      return {
        provider: this.name,
        model: config.model,
        images,
      };
    }

    const response = await fetch(`https://api.stability.ai/v1/generation/${config.model}/text-to-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stability AI 请求失败：${response.status} ${errorText.slice(0, 240)}`);
    }

    const result = (await response.json()) as {
      artifacts?: Array<{ base64: string; finishReason: string }>;
    };

    const images = (result.artifacts || []).map((artifact) => ({
      buffer: Buffer.from(artifact.base64, "base64"),
      mimeType: "image/png" as const,
    }));

    return {
      provider: this.name,
      model: config.model,
      images,
    };
  }

  private mapSize(ratio?: string): { width: number; height: number } | null {
    if (ratio === "16:9") return { width: 1536, height: 640 };
    if (ratio === "3:4") return { width: 768, height: 1024 };
    if (ratio === "9:16") return { width: 640, height: 1536 };
    return { width: 1024, height: 1024 };
  }
}

export async function getImageGenerationProvider(name?: GenerationProviderName): Promise<ImageGenerationProvider> {
  const publicSettings = await getPublicAppSettings();
  const providerName = name || publicSettings.defaultGenerationProvider;

  if (providerName === "chatgpt_web") {
    return new ChatGPTWebProvider();
  }

  if (providerName === "stability_ai") {
    return new StabilityAIProvider();
  }

  return new OpenAIImageProvider();
}
