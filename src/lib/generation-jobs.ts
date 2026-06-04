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
  updatedAt: string;
  isStale: boolean;
  images: GeneratedImageRecord[];
};

export type AdminGenerationJobView = GenerationJobView & {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
  };
};

type GenerationJobRecord = Prisma.GenerationJobGetPayload<{
  include: {
    images: true;
  };
}>;

type AdminGenerationJobRecord = Prisma.GenerationJobGetPayload<{
  include: {
    images: true;
    user: {
      select: {
        id: true;
        email: true;
        displayName: true;
      };
    };
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
const STALE_JOB_MS = 20 * 60 * 1000;

const text = {
  promptRequired: "\u8bf7\u8f93\u5165\u4e2d\u6587\u63d0\u793a\u8bcd",
  generationFailed: "\u751f\u6210\u4efb\u52a1\u6267\u884c\u5931\u8d25",
  staleFailed: "\u4efb\u52a1\u957f\u65f6\u95f4\u672a\u5b8c\u6210\uff0c\u5df2\u81ea\u52a8\u6807\u8bb0\u5931\u8d25\u5e76\u9000\u56de\u51bb\u7ed3\u79ef\u5206\u3002",
};

function serializeDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isActiveStatus(status: string) {
  return status === "QUEUED" || status === "GENERATING";
}

function isStaleJob(job: { status: string; updatedAt: Date | string }) {
  if (!isActiveStatus(job.status)) {
    return false;
  }

  return Date.now() - new Date(job.updatedAt).getTime() > STALE_JOB_MS;
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
    updatedAt: serializeDate(job.updatedAt),
    isStale: isStaleJob(job),
    images: job.images.map((image) => ({
      id: image.id,
      url: image.url,
      width: image.width,
      height: image.height,
    })),
  };
}

function serializeAdminJob(job: AdminGenerationJobRecord): AdminGenerationJobView {
  return {
    ...serializeJob(job),
    user: job.user,
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

async function findAdminGenerationJob(jobId: string) {
  const job = await prisma.generationJob.findUnique({
    where: {
      id: jobId,
    },
    include: {
      images: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });

  return job ? serializeAdminJob(job) : null;
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

async function recoverStaleGenerationJobs(userId?: string) {
  const staleJobs = await prisma.generationJob.findMany({
    where: {
      userId,
      status: {
        in: ["QUEUED", "GENERATING"],
      },
      updatedAt: {
        lt: new Date(Date.now() - STALE_JOB_MS),
      },
    },
    take: 30,
    include: {
      images: true,
    },
  });

  for (const job of staleJobs) {
    if (runningJobIds.has(job.id)) {
      continue;
    }

    await failGenerationJob(job.id, job.userId, job.creditCost, new Error(text.staleFailed)).catch(() => null);
  }
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

    const latestJob = await prisma.generationJob.findUnique({
      where: {
        id: jobId,
      },
      include: {
        images: true,
      },
    });

    if (!latestJob || latestJob.status !== "GENERATING") {
      return latestJob ? serializeJob(latestJob) : null;
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

async function resetGenerationJobForRetry(job: { id: string; userId: string; creditCost: number }) {
  await reserveCreditsForJob(job.userId, job.creditCost, job.id);

  await prisma.$transaction(async (tx) => {
    await tx.generatedImage.deleteMany({
      where: {
        jobId: job.id,
      },
    });

    await tx.generationJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "QUEUED",
        errorMessage: null,
        providerRequestId: null,
      },
    });
  });
}

async function rescheduleGenerationJobForAdmin(jobId: string, userId: string) {
  scheduleGenerationJob(jobId, userId);
  return findAdminGenerationJob(jobId);
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

export async function retryGenerationJobForUser(userId: string, jobId: string) {
  await recoverStaleGenerationJobs(userId);

  const job = await prisma.generationJob.findFirst({
    where: {
      id: jobId,
      userId,
    },
    include: {
      images: true,
    },
  });

  if (!job) {
    throw new Error("\u4efb\u52a1\u4e0d\u5b58\u5728");
  }

  if (job.status !== "FAILED" && job.status !== "CANCELED") {
    if (isActiveStatus(job.status)) {
      scheduleGenerationJob(job.id, job.userId);
      const currentJob = await getJobForExecution(job.id, job.userId);
      return currentJob ? serializeJob(currentJob) : null;
    }

    throw new Error("\u53ea\u80fd\u91cd\u8bd5\u5931\u8d25\u6216\u5df2\u53d6\u6d88\u7684\u4efb\u52a1");
  }

  await resetGenerationJobForRetry(job);
  scheduleGenerationJob(job.id, job.userId);

  const currentJob = await getJobForExecution(job.id, job.userId);
  return currentJob ? serializeJob(currentJob) : null;
}

export async function listRecentGenerationJobs(userId: string, limit = 20) {
  await recoverStaleGenerationJobs(userId);

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
  await recoverStaleGenerationJobs(userId);

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

export async function listAdminGenerationJobs(limit = 50): Promise<AdminGenerationJobView[]> {
  return listAdminGenerationJobsFiltered({ limit });
}

export async function listAdminGenerationJobsFiltered({
  limit = 50,
  status,
  q,
}: {
  limit?: number;
  status?: string;
  q?: string;
} = {}): Promise<AdminGenerationJobView[]> {
  await recoverStaleGenerationJobs();

  const cleanStatus = status && ["QUEUED", "GENERATING", "COMPLETED", "FAILED", "CANCELED"].includes(status) ? status : undefined;
  const cleanQuery = q?.trim();

  const jobs = await prisma.generationJob.findMany({
    where: {
      ...(cleanStatus ? { status: cleanStatus as never } : {}),
      OR: cleanQuery
        ? [
            {
              id: {
                contains: cleanQuery,
                mode: "insensitive",
              },
            },
            {
              user: {
                email: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
            },
            {
              user: {
                displayName: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
            },
          ]
        : undefined,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: Math.min(Math.max(Math.floor(limit), 1), 100),
    include: {
      images: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });

  return jobs.map(serializeAdminJob);
}

export async function findAdminGenerationJobById(jobId: string) {
  await recoverStaleGenerationJobs();
  return findAdminGenerationJob(jobId);
}

export async function retryFailedGenerationJobByAdmin(jobId: string) {
  await recoverStaleGenerationJobs();

  const job = await prisma.generationJob.findUnique({
    where: {
      id: jobId,
    },
    include: {
      images: true,
    },
  });

  if (!job) {
    throw new Error("\u4efb\u52a1\u4e0d\u5b58\u5728");
  }

  if (job.status !== "FAILED" && job.status !== "CANCELED") {
    if (job.status === "QUEUED" || job.status === "GENERATING") {
      return rescheduleGenerationJobForAdmin(job.id, job.userId);
    }

    throw new Error("\u53ea\u80fd\u91cd\u8bd5\u5931\u8d25\u6216\u5df2\u53d6\u6d88\u7684\u4efb\u52a1");
  }

  await resetGenerationJobForRetry(job);
  return rescheduleGenerationJobForAdmin(job.id, job.userId);
}

export async function markGenerationJobFailedByAdmin(jobId: string) {
  await recoverStaleGenerationJobs();

  const job = await prisma.generationJob.findUnique({
    where: {
      id: jobId,
    },
    include: {
      images: true,
    },
  });

  if (!job) {
    throw new Error("\u4efb\u52a1\u4e0d\u5b58\u5728");
  }

  if (runningJobIds.has(job.id)) {
    throw new Error("\u5f53\u524d\u8fdb\u7a0b\u6b63\u5728\u6267\u884c\u8be5\u4efb\u52a1\uff0c\u8bf7\u7a0d\u540e\u518d\u5904\u7406\u3002");
  }

  if (job.status === "COMPLETED") {
    throw new Error("\u5df2\u5b8c\u6210\u4efb\u52a1\u4e0d\u80fd\u6807\u8bb0\u5931\u8d25");
  }

  if (job.status === "FAILED" || job.status === "CANCELED") {
    return findAdminGenerationJob(job.id);
  }

  await failGenerationJob(job.id, job.userId, job.creditCost, new Error("\u7ba1\u7406\u5458\u624b\u52a8\u6807\u8bb0\u5931\u8d25\uff0c\u5df2\u9000\u56de\u51bb\u7ed3\u79ef\u5206\u3002"));
  return findAdminGenerationJob(job.id);
}
