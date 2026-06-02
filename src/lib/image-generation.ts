import { getOpenAIRuntimeConfig, getPublicAppSettings, type GenerationProviderName } from "@/lib/settings";

export type ImageGenerationRequest = {
  promptZh: string;
  promptEn?: string;
  negativePrompt?: string;
  ratio: string;
  quality: string;
  imageCount: number;
};

export type ImageGenerationResult = {
  providerRequestId?: string;
  images: Array<{
    buffer: Buffer;
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    width?: number;
    height?: number;
  }>;
};

export interface ImageGenerationProvider {
  name: GenerationProviderName;
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

type OpenAIImageResponse = {
  id?: string;
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

function mapSize(ratio: string) {
  if (ratio === "16:9") {
    return "1536x1024";
  }
  if (ratio === "3:4" || ratio === "9:16") {
    return "1024x1536";
  }
  return "1024x1024";
}

function mapQuality(quality: string) {
  if (quality === "high") {
    return "high";
  }
  if (quality === "low") {
    return "low";
  }
  return "medium";
}

function buildPrompt(request: ImageGenerationRequest) {
  const prompt = request.promptEn?.trim() || request.promptZh.trim();
  const negative = request.negativePrompt?.trim();

  return negative ? `${prompt}\n\nAvoid: ${negative}` : prompt;
}

async function imageFromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`图片下载失败：${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/png";

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType.includes("webp") ? "image/webp" : contentType.includes("jpeg") || contentType.includes("jpg") ? "image/jpeg" : "image/png"
  } as ImageGenerationResult["images"][number];
}

class OpenAIImageProvider implements ImageGenerationProvider {
  name: GenerationProviderName = "openai";

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const config = await getOpenAIRuntimeConfig();

    if (!config.apiKey) {
      throw new Error("未配置 OpenAI API Key，请先在后台配置页填写。");
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        prompt: buildPrompt(request),
        size: mapSize(request.ratio),
        quality: mapQuality(request.quality),
        n: Math.min(Math.max(request.imageCount, 1), 4)
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `OpenAI 生图请求失败：${response.status}`);
    }

    const data = (await response.json()) as OpenAIImageResponse;
    const images = await Promise.all(
      (data.data || []).map(async (item) => {
        if (item.b64_json) {
          return {
            buffer: Buffer.from(item.b64_json, "base64"),
            mimeType: "image/png" as const
          };
        }
        if (item.url) {
          return imageFromUrl(item.url);
        }
        throw new Error("OpenAI 返回了空图片。");
      })
    );

    if (images.length === 0) {
      throw new Error("OpenAI 没有返回图片结果。");
    }

    return {
      providerRequestId: data.id,
      images
    };
  }
}

class ChatGPTWebProvider implements ImageGenerationProvider {
  name: GenerationProviderName = "chatgpt_web";

  async generate(): Promise<ImageGenerationResult> {
    throw new Error("chatgpt_web Provider 暂未启用。当前只预留接口，不保存账号、cookie 或 token。");
  }
}

export async function getDefaultGenerationProviderName() {
  const settings = await getPublicAppSettings();
  return settings.defaultGenerationProvider;
}

export function getImageGenerationProvider(name: GenerationProviderName): ImageGenerationProvider {
  if (name === "chatgpt_web") {
    return new ChatGPTWebProvider();
  }
  return new OpenAIImageProvider();
}
