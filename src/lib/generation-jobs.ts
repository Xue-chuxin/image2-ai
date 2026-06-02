import { Prisma, prisma } from "./db";
import {
  getImageGenerationProvider,
  type ImageGenerationRequest,
  type ImageQuality,
} from "./image-generation";
import { saveGeneratedImage } from "./storage";
import { getPublicAppSettings, type GenerationProviderName } from "./settings";

type GeneratedImageRecord = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
};

export type GenerationJobView = {
  id: string;
  status: string;
  provider: GenerationProviderName;
  model: string | null;
  promptZh: string;
  promptEn: string | null;
  negativePrompt: string | null;
  ratio: string;
  quality: string;
  imageCount: number;
  creditCost: number;
  errorMessage: string | null;
  createdAt: string;
  images: GeneratedImageRecord[];
};

type GenerationJobRecord = Prisma.GenerationJobGetPayload<{
  include: {
    images: true;
  };
}>;

export type CreateGenerationJobInput = {
  promptZh: string;
  promptEn?: string;
  negativePrompt?: string;
  ratio?: string;
  quality?: ImageQuality | string;
  imageCount?: number;
  provider?: GenerationProviderName;
};

function serializeDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeJob(job: GenerationJobRecord): GenerationJobView {
  return {
    id: job.id,
    status: job.status,
    provider: job.provider as GenerationProviderName,
    model: job.model,
    promptZh: job.promptZh,
    promptEn: job.promptEn,
    negativePrompt: job.negativePrompt,
    ratio: job.ratio,
    quality: job.quality,
    imageCount: job.imageCount,
    creditCost: job.creditCost,
    errorMessage: job.errorMessage,
    createdAt: serializeDate(job.createdAt),
    images: job.images.map((image) => ({
      id: image.id,
      url: image.url,
      width: image.width,
      height: image.height,
    })),
  };
}

function normalizePrompt(value: string) {
  return value.trim();
}

function normalizeImageCount(value?: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.floor(Number(value)), 1), 4);
}

function normalizeQuality(value?: ImageQuality | string) {
  if (value === "high" || value === "low" || value === "standard") {
    return value;
  }

  return "standard";
}

function estimateCreditCost(quality: string, imageCount: number) {
  const singleCost = quality === "high" ? 12 : quality === "low" ? 3 : 5;
  return singleCost * imageCount;
}

async function ensureDemoUser() {
  const email = "demo@image2.local";
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      email,
      displayName: "演示用户",
      role: "USER",
      credits: 100,
    },
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "生成任务执行失败";
}

export async function createAndRunGenerationJob(input: CreateGenerationJobInput) {
  const promptZh = normalizePrompt(input.promptZh);

  if (!promptZh) {
    throw new Error("请输入中文提示词");
  }

  const publicSettings = await getPublicAppSettings();
  const providerName = input.provider || publicSettings.defaultGenerationProvider;
  const imageCount = normalizeImageCount(input.imageCount);
  const quality = normalizeQuality(input.quality);
  const ratio = input.ratio || "1:1";
  const creditCost = estimateCreditCost(quality, imageCount);
  const user = await ensureDemoUser();

  const job = await prisma.generationJob.create({
    data: {
      userId: user.id,
      status: "GENERATING",
      provider: providerName,
      promptZh,
      promptEn: input.promptEn?.trim() || null,
      negativePrompt: input.negativePrompt?.trim() || null,
      ratio,
      quality,
      imageCount,
      creditCost,
    },
    include: {
      images: true,
    },
  });

  const request: ImageGenerationRequest = {
    promptZh,
    promptEn: input.promptEn,
    negativePrompt: input.negativePrompt,
    ratio,
    quality,
    imageCount,
  };

  try {
    const provider = await getImageGenerationProvider(providerName);
    const result = await provider.generate(request);

    for (const [index, image] of result.images.entries()) {
      const storedImage = await saveGeneratedImage({
        jobId: job.id,
        index,
        buffer: image.buffer,
        mimeType: image.mimeType,
      });

      await prisma.generatedImage.create({
        data: {
          userId: user.id,
          jobId: job.id,
          url: storedImage.url,
          storageKey: storedImage.storageKey,
          mimeType: image.mimeType,
        },
      });
    }

    const completedJob = await prisma.generationJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "COMPLETED",
        provider: result.provider,
        model: result.model,
        errorMessage: null,
      },
      include: {
        images: true,
      },
    });

    return serializeJob(completedJob);
  } catch (error) {
    const failedJob = await prisma.generationJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "FAILED",
        errorMessage: getErrorMessage(error),
      },
      include: {
        images: true,
      },
    });

    return serializeJob(failedJob);
  }
}

export async function listRecentGenerationJobs(limit = 20) {
  const jobs = await prisma.generationJob.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      images: true,
    },
  });

  return jobs.map(serializeJob);
}

export async function findGenerationJob(id: string) {
  const job = await prisma.generationJob.findUnique({
    where: {
      id,
    },
    include: {
      images: true,
    },
  });

  return job ? serializeJob(job) : null;
}
