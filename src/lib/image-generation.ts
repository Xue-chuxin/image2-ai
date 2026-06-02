import { getOpenAIRuntimeConfig, getPublicAppSettings, type GenerationProviderName } from "./settings";

export type ImageQuality = "standard" | "high" | "low";

export type ImageGenerationRequest = {
  promptZh?: string;
  promptEn?: string;
  negativePrompt?: string;
  ratio?: string;
  quality?: ImageQuality | string;
  imageCount?: number;
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

function buildPrompt(request: ImageGenerationRequest) {
  const prompt = (request.promptEn || request.promptZh || "").trim();
  const negativePrompt = request.negativePrompt?.trim();

  if (!prompt) {
    throw new Error("请输入生成提示词");
  }

  if (!negativePrompt) {
    return prompt;
  }

  return `${prompt}\n\nAvoid: ${negativePrompt}`;
}

function normalizeImageCount(imageCount?: number) {
  if (!Number.isFinite(imageCount)) {
    return 1;
  }

  return Math.min(Math.max(Math.floor(Number(imageCount)), 1), 4);
}

function mapOpenAISize(ratio?: string) {
  if (ratio === "16:9") {
    return "1536x1024";
  }

  if (ratio === "3:4" || ratio === "9:16") {
    return "1024x1536";
  }

  return "1024x1024";
}

function mapOpenAIQuality(quality?: ImageQuality | string) {
  if (quality === "high") {
    return "high";
  }

  if (quality === "low") {
    return "low";
  }

  return "medium";
}

async function readOpenAIError(response: Response) {
  const bodyText = await response.text();

  if (!bodyText) {
    return `OpenAI 生图请求失败，状态码 ${response.status}`;
  }

  try {
    const data = JSON.parse(bodyText) as OpenAIImageResponse;
    return data.error?.message || bodyText;
  } catch {
    return bodyText;
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
    const runtimeConfig = await getOpenAIRuntimeConfig();

    if (!runtimeConfig.apiKey) {
      throw new Error("后台尚未配置 OpenAI API Key，请先到后台配置页保存密钥");
    }

    const prompt = buildPrompt(request);
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runtimeConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: runtimeConfig.model,
        prompt,
        n: normalizeImageCount(request.imageCount),
        size: mapOpenAISize(request.ratio),
        quality: mapOpenAIQuality(request.quality),
      }),
    });

    if (!response.ok) {
      throw new Error(await readOpenAIError(response));
    }

    const payload = (await response.json()) as OpenAIImageResponse;
    const data = payload.data || [];

    if (!data.length) {
      throw new Error("OpenAI 未返回生成图片");
    }

    const images = await Promise.all(
      data.map((item) => {
        if (item.b64_json) {
          return Promise.resolve(imageFromBase64(item.b64_json));
        }

        if (item.url) {
          return imageFromUrl(item.url);
        }

        throw new Error("OpenAI 返回的图片数据为空");
      }),
    );

    return {
      provider: this.name,
      model: runtimeConfig.model,
      images,
    };
  }
}

class ChatGPTWebProvider implements ImageGenerationProvider {
  name: GenerationProviderName = "chatgpt_web";

  async generate(): Promise<ImageGenerationResult> {
    throw new Error("ChatGPT 网页版生图通道尚未启用，请在后台切换为 OpenAI Provider");
  }
}

export async function getImageGenerationProvider(name?: GenerationProviderName): Promise<ImageGenerationProvider> {
  const publicSettings = await getPublicAppSettings();
  const providerName = name || publicSettings.defaultGenerationProvider;

  if (providerName === "chatgpt_web") {
    return new ChatGPTWebProvider();
  }

  return new OpenAIImageProvider();
}
