import type { Prisma } from "@prisma/client";

import { prisma } from "./db";
import {
  getImageGenerationProvider,
  type ImageGenerationRequest,
  type ImageQuality,
} from "./image-generation";
import {
  estimateGenerationCreditCost,
  refundReservedCreditsForJob,
  reserveCreditsForJob,
  spendReservedCreditsForJob,
} from "./credits";
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

const runningJobIds = new Set<string>();

const text = {
  promptRequired: "\u8bf7\u8f93\u5165\u4e2d\u6587\u63d0\u793a\u8bcd",
  generationFailed: "\u751f\u6210\u4efb\u52a1\u6267\u884c\u5931\u8d25",
};

function serializeDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeJob(job: GenerationJobRecord): GenerationJobView {
  return {
    id: job.id,
    status: job.status,
    provider: job.provider as GenerationProviderName,
    model: job.providerRequestId,
    promptZh: job.polishedPromptZh || job.originalInput,
    promptEn: job.polishedPromptEn,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : text.generationFailed;
}

function toGenerationRequest(job: GenerationJobRecord): ImageGenerationRequest {
  return {
    promptZh: job.polishedPromptZh || job.originalInput,
    promptEn: job.polishedPromptEn || undefined,
    negativePrompt: job.negativePrompt || undefined,
    ratio: job.ratio,
    quality: job.quality,
    imageCount: job.imageCount,
  };
}

async function getJobForExecution(jobId: string, userId: string) {
  return prisma.generationJob.findFirst({
    where: {
      id: jobId,
      userId,
    },
    include: {
      images: true,
    },
  });
}

async function failGenerationJob(jobId: string, userId: string, creditCost: number, error: unknown) {
  await refundReservedCreditsForJob(userId, creditCost, jobId).catch(() => null);

  const failedJob = await prisma.generationJob.update({
    where: {
      id: jobId,
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

export async function executeGenerationJob(jobId: string, userId: string) {
  const initialJob = await getJobForExecution(jobId, userId);
  if (!initialJob || initialJob.status === "COMPLETED" || initialJob.status === "FAILED" || initialJob.status === "CANCELED") {
    return initialJob ? serializeJob(initialJob) : null;
  }

  const activeJob = await prisma.generationJob.update({
    where: {
      id: jobId,
    },
    data: {
      status: "GENERATING",
      errorMessage: null,
    },
    include: {
      images: true,
    },
  });

  try {
    const provider = await getImageGenerationProvider(activeJob.provider as GenerationProviderName);
    const result = await provider.generate(toGenerationRequest(activeJob));

    for (const [index, image] of result.images.entries()) {
      const storedImage = await saveGeneratedImage(jobId, index, image.buffer, image.mimeType);

      await prisma.generatedImage.create({
        data: {
          jobId,
          url: storedImage.url,
        },
      });
    }

    await spendReservedCreditsForJob(userId, activeJob.creditCost, jobId);

    const completedJob = await prisma.generationJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: "COMPLETED",
        provider: result.provider,
        providerRequestId: result.model,
        errorMessage: null,
      },
      include: {
        images: true,
      },
    });

    return serializeJob(completedJob);
  } catch (error) {
    return failGenerationJob(jobId, userId, activeJob.creditCost, error);
  }
}

function scheduleGenerationJob(jobId: string, userId: string) {
  if (runningJobIds.has(jobId)) {
    return;
  }

  runningJobIds.add(jobId);
  setTimeout(() => {
    void executeGenerationJob(jobId, userId).finally(() => {
      runningJobIds.delete(jobId);
    });
  }, 0);
}

export async function createAndQueueGenerationJob(userId: string, input: CreateGenerationJobInput) {
  const promptZh = normalizePrompt(input.promptZh);

  if (!promptZh) {
    throw new Error(text.promptRequired);
  }

  const publicSettings = await getPublicAppSettings();
  const providerName = input.provider || publicSettings.defaultGenerationProvider;
  const imageCount = normalizeImageCount(input.imageCount);
  const quality = normalizeQuality(input.quality);
  const ratio = input.ratio || "1:1";
  const creditCost = estimateGenerationCreditCost(quality, imageCount);

  const job = await prisma.generationJob.create({
    data: {
      userId,
      status: "QUEUED",
      provider: providerName,
      originalInput: promptZh,
      polishedPromptZh: promptZh,
      polishedPromptEn: input.promptEn?.trim() || null,
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

  try {
    await reserveCreditsForJob(userId, creditCost, job.id);
  } catch (error) {
    await prisma.generationJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "FAILED",
        errorMessage: getErrorMessage(error),
      },
    });
    throw error;
  }

  scheduleGenerationJob(job.id, userId);
  return serializeJob(job);
}

export async function createAndRunGenerationJob(userId: string, input: CreateGenerationJobInput) {
  const queuedJob = await createAndQueueGenerationJob(userId, input);
  return executeGenerationJob(queuedJob.id, userId);
}

export async function listRecentGenerationJobs(userId: string, limit = 20) {
  const jobs = await prisma.generationJob.findMany({
    where: {
      userId,
    },
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

export async function findGenerationJob(userId: string, id: string) {
  const job = await prisma.generationJob.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      images: true,
    },
  });

  return job ? serializeJob(job) : null;
}
