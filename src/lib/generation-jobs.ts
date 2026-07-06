import type { Prisma } from "@prisma/client";

import { AppError } from "./app-error";
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
import { resolveReferenceImagesForJob } from "./uploads";

const generationJobInclude = {
  images: true,
  referenceImages: {
    orderBy: {
      sortOrder: "asc",
    },
    include: {
      image: true,
    },
  },
} as const;

const adminGenerationJobInclude = {
  ...generationJobInclude,
  user: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
} as const;

type GeneratedImageRecord = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  mimeType: string | null;
  isPublic: boolean;
  isDeleted: boolean;
  takenDownAt: string | null;
  takenDownReason: string | null;
};

type ReferenceImageRecord = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
};

export type GenerationJobView = {
  id: string;
  status: string;
  provider: GenerationProviderName;
  queuePosition: number | null;
  queueWaitingCount: number;
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
  referenceImages: ReferenceImageRecord[];
};

export type AdminGenerationJobView = GenerationJobView & {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
  };
};

type GenerationJobRecord = Prisma.GenerationJobGetPayload<{
  include: typeof generationJobInclude;
}>;

type AdminGenerationJobRecord = Prisma.GenerationJobGetPayload<{
  include: typeof adminGenerationJobInclude;
}>;

export type CreateGenerationJobInput = {
  promptZh: string;
  promptEn?: string;
  negativePrompt?: string;
  ratio?: string;
  quality?: ImageQuality | string;
  imageCount?: number;
  provider?: GenerationProviderName;
  referenceImageIds?: string[];
};

type CreateGenerationJobOptions = {
  schedule?: boolean;
};

const runningJobIds = new Set<string>();
let chatGPTWebQueuePump: Promise<void> | null = null;
const chatGPTWebActiveJobIds = new Set<string>();
const MAX_CONCURRENT_CHATGPT_WEB_JOBS = 2;
const STALE_JOB_MS = 20 * 60 * 1000;
const ACTIVE_GENERATION_STATUSES = ["QUEUED", "POLISHING", "GENERATING", "UPLOADING"] as const;
const ADMIN_FILTERABLE_STATUSES = [...ACTIVE_GENERATION_STATUSES, "COMPLETED", "FAILED", "CANCELED"] as const;

type QueueMeta = {
  queuePosition: number | null;
  queueWaitingCount: number;
};

const emptyQueueMeta: QueueMeta = {
  queuePosition: null,
  queueWaitingCount: 0,
};

const text = {
  promptRequired: "\u8bf7\u8f93\u5165\u4e2d\u6587\u63d0\u793a\u8bcd",
  generationFailed: "\u751f\u6210\u4efb\u52a1\u6267\u884c\u5931\u8d25",
  staleFailed: "\u4efb\u52a1\u957f\u65f6\u95f4\u672a\u5b8c\u6210\uff0c\u5df2\u81ea\u52a8\u6807\u8bb0\u5931\u8d25\u5e76\u9000\u56de\u51bb\u7ed3\u79ef\u5206\u3002",
  referenceImagesDisabled: "\u5f53\u524d\u6b63\u5f0f\u7248\u6682\u672a\u5f00\u653e\u53c2\u8003\u56fe\u53c2\u4e0e\u751f\u56fe\uff0c\u8bf7\u5148\u79fb\u9664\u53c2\u8003\u56fe\u540e\u518d\u751f\u6210\u3002",
};

function serializeDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function assertReferenceImagesNotUsed(referenceImageCount?: number) {
  if (referenceImageCount) {
    throw new AppError("BAD_REQUEST", text.referenceImagesDisabled, 400);
  }
}

function isActiveStatus(status: string) {
  return ACTIVE_GENERATION_STATUSES.includes(status as (typeof ACTIVE_GENERATION_STATUSES)[number]);
}

function isChatGPTWebProvider(provider?: string | null) {
  return provider === "chatgpt_web";
}

function isStaleJob(job: { status: string; updatedAt: Date | string }) {
  if (!isActiveStatus(job.status)) {
    return false;
  }

  return Date.now() - new Date(job.updatedAt).getTime() > STALE_JOB_MS;
}

async function getChatGPTWebQueueMetaMap() {
  const jobs = await prisma.generationJob.findMany({
    where: {
      provider: "chatgpt_web",
      status: {
        in: [...ACTIVE_GENERATION_STATUSES],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });

  return new Map<string, QueueMeta>(
    jobs.map((job, index) => [
      job.id,
      {
        queuePosition: index + 1,
        queueWaitingCount: index,
      },
    ]),
  );
}

function serializeJob(job: GenerationJobRecord, queueMetaMap?: Map<string, QueueMeta>): GenerationJobView {
  const queueMeta = isChatGPTWebProvider(job.provider) ? queueMetaMap?.get(job.id) || emptyQueueMeta : emptyQueueMeta;

  return {
    id: job.id,
    status: job.status,
    provider: job.provider as GenerationProviderName,
    queuePosition: queueMeta.queuePosition,
    queueWaitingCount: queueMeta.queueWaitingCount,
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
    images: job.images.filter((image) => !(image as typeof image & { isDeleted?: boolean }).isDeleted).map((image) => {
      const imageRecord = image as typeof image & {
        thumbnailUrl?: string | null;
        fileSize?: number | null;
        mimeType?: string | null;
        isPublic?: boolean;
        isDeleted?: boolean;
        takenDownAt?: Date | null;
        takenDownReason?: string | null;
      };

      return {
        id: imageRecord.id,
        url: imageRecord.url,
        thumbnailUrl: imageRecord.thumbnailUrl || null,
        width: imageRecord.width,
        height: imageRecord.height,
        fileSize: imageRecord.fileSize || null,
        mimeType: imageRecord.mimeType || null,
        isPublic: Boolean(imageRecord.isPublic),
        isDeleted: Boolean(imageRecord.isDeleted),
        takenDownAt: imageRecord.takenDownAt ? serializeDate(imageRecord.takenDownAt) : null,
        takenDownReason: imageRecord.takenDownReason || null,
      };
    }),
    referenceImages: job.referenceImages.map((item) => ({
      id: item.image.id,
      url: item.image.url,
      thumbnailUrl: item.image.thumbnailUrl,
      mimeType: item.image.mimeType,
      fileSize: item.image.fileSize,
      width: item.image.width,
      height: item.image.height,
    })),
  };
}

function serializeAdminJob(job: AdminGenerationJobRecord, queueMetaMap?: Map<string, QueueMeta>): AdminGenerationJobView {
  return {
    ...serializeJob(job, queueMetaMap),
    user: job.user,
  };
}

async function serializeJobWithQueueMeta(job: GenerationJobRecord) {
  return serializeJob(job, await getChatGPTWebQueueMetaMap());
}

async function serializeAdminJobWithQueueMeta(job: AdminGenerationJobRecord) {
  return serializeAdminJob(job, await getChatGPTWebQueueMetaMap());
}

async function serializeJobsWithQueueMeta(jobs: GenerationJobRecord[]) {
  const queueMetaMap = await getChatGPTWebQueueMetaMap();
  return jobs.map((job) => serializeJob(job, queueMetaMap));
}

async function serializeAdminJobsWithQueueMeta(jobs: AdminGenerationJobRecord[]) {
  const queueMetaMap = await getChatGPTWebQueueMetaMap();
  return jobs.map((job) => serializeAdminJob(job, queueMetaMap));
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
    referenceImages: job.referenceImages.map((item) => ({
      id: item.image.id,
      url: item.image.url,
      thumbnailUrl: item.image.thumbnailUrl || item.image.url,
      mimeType: item.image.mimeType,
      fileSize: item.image.fileSize,
      width: item.image.width,
      height: item.image.height,
    })),
  };
}

async function getJobForExecution(jobId: string, userId: string) {
  return prisma.generationJob.findFirst({
    where: {
      id: jobId,
      userId,
    },
    include: generationJobInclude,
  });
}

async function findAdminGenerationJob(jobId: string) {
  const job = await prisma.generationJob.findUnique({
    where: {
      id: jobId,
    },
    include: adminGenerationJobInclude,
  });

  return job ? serializeAdminJobWithQueueMeta(job) : null;
}

async function failGenerationJob(jobId: string, userId: string, creditCost: number, error: unknown) {
  // 状态守卫：仅当任务仍处于活跃态时才翻转为 FAILED，避免 stale 回收与真实失败并发时
  // 对同一任务重复退款（配合 credits 的 frozen 下限保护形成双保险）。
  const transitioned = await prisma.generationJob.updateMany({
    where: {
      id: jobId,
      status: {
        in: [...ACTIVE_GENERATION_STATUSES],
      },
    },
    data: {
      status: "FAILED",
      errorMessage: getErrorMessage(error),
    },
  });

  if (transitioned.count > 0) {
    await refundReservedCreditsForJob(userId, creditCost, jobId).catch(() => null);
  }

  const failedJob = await prisma.generationJob.findUniqueOrThrow({
    where: {
      id: jobId,
    },
    include: generationJobInclude,
  });

  return serializeJob(failedJob);
}

async function recoverStaleGenerationJobs(userId?: string) {
  const staleJobs = await prisma.generationJob.findMany({
    where: {
      userId,
      status: {
        in: [...ACTIVE_GENERATION_STATUSES],
      },
      updatedAt: {
        lt: new Date(Date.now() - STALE_JOB_MS),
      },
    },
    take: 30,
    include: generationJobInclude,
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
    include: generationJobInclude,
  });

  try {
    const provider = await getImageGenerationProvider(activeJob.provider as GenerationProviderName);
    const result = await provider.generate(toGenerationRequest(activeJob));

    await prisma.generationJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: "UPLOADING",
      },
    });

    for (const [index, image] of result.images.entries()) {
      const storedImage = await saveGeneratedImage(jobId, index, image.buffer, image.mimeType);

      await prisma.generatedImage.create({
        data: {
          jobId,
          url: storedImage.url,
          thumbnailUrl: storedImage.thumbnailUrl,
          width: storedImage.width,
          height: storedImage.height,
          fileSize: storedImage.fileSize,
          mimeType: storedImage.mimeType,
        },
      });
    }

    const latestJob = await prisma.generationJob.findUnique({
      where: {
        id: jobId,
      },
      include: generationJobInclude,
    });

    if (!latestJob || latestJob.status !== "UPLOADING") {
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
      include: generationJobInclude,
    });

    return serializeJob(completedJob);
  } catch (error) {
    return failGenerationJob(jobId, userId, activeJob.creditCost, error);
  }
}

async function findNextQueuedChatGPTWebJob() {
  return prisma.generationJob.findFirst({
    where: {
      provider: "chatgpt_web",
      status: "QUEUED",
    },
    orderBy: {
      createdAt: "asc",
    },
    include: generationJobInclude,
  });
}

async function runChatGPTWebQueue() {
  while (chatGPTWebActiveJobIds.size < MAX_CONCURRENT_CHATGPT_WEB_JOBS) {
    const job = await findNextQueuedChatGPTWebJob();
    if (!job) {
      return;
    }

    if (runningJobIds.has(job.id) || chatGPTWebActiveJobIds.has(job.id)) {
      return;
    }

    runningJobIds.add(job.id);
    chatGPTWebActiveJobIds.add(job.id);

    void executeGenerationJob(job.id, job.userId)
      .catch(() => null)
      .finally(() => {
        runningJobIds.delete(job.id);
        chatGPTWebActiveJobIds.delete(job.id);
        scheduleChatGPTWebQueue();
      });
  }
}

function scheduleChatGPTWebQueue() {
  if (chatGPTWebQueuePump) {
    return;
  }

  chatGPTWebQueuePump = new Promise<void>((resolve) => {
    setTimeout(() => {
      void runChatGPTWebQueue()
        .catch(() => null)
        .finally(() => {
          chatGPTWebQueuePump = null;
          resolve();
          if (chatGPTWebActiveJobIds.size < MAX_CONCURRENT_CHATGPT_WEB_JOBS) {
            scheduleChatGPTWebQueue();
          }
        });
    }, 0);
  });
}

async function runGenerationJobOnce(jobId: string, userId: string) {
  if (runningJobIds.has(jobId)) {
    const currentJob = await getJobForExecution(jobId, userId);
    return currentJob ? serializeJobWithQueueMeta(currentJob) : null;
  }

  runningJobIds.add(jobId);
  try {
    return await executeGenerationJob(jobId, userId);
  } finally {
    runningJobIds.delete(jobId);
  }
}

function scheduleGenerationJob(jobId: string, userId: string, provider?: GenerationProviderName | string | null) {
  if (isChatGPTWebProvider(provider)) {
    scheduleChatGPTWebQueue();
    return;
  }

  setTimeout(() => {
    void runGenerationJobOnce(jobId, userId);
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
  const job = await prisma.generationJob.findUnique({
    where: {
      id: jobId,
    },
    select: {
      provider: true,
    },
  });

  scheduleGenerationJob(jobId, userId, job?.provider);
  return findAdminGenerationJob(jobId);
}

export async function createAndQueueGenerationJob(userId: string, input: CreateGenerationJobInput, options: CreateGenerationJobOptions = {}) {
  const promptZh = normalizePrompt(input.promptZh);

  if (!promptZh) {
    throw new AppError("BAD_REQUEST", text.promptRequired, 400);
  }

  const publicSettings = await getPublicAppSettings();
  const providerName = input.provider || publicSettings.defaultGenerationProvider;
  const imageCount = normalizeImageCount(input.imageCount);
  const quality = normalizeQuality(input.quality);
  const ratio = input.ratio || "1:1";
  const creditCost = estimateGenerationCreditCost(quality, imageCount);
  const referenceImages = await resolveReferenceImagesForJob(userId, input.referenceImageIds);

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
      referenceImages: referenceImages.length
        ? {
            create: referenceImages.map((image, index) => ({
              imageId: image.id,
              sortOrder: index,
            })),
          }
        : undefined,
    },
    include: generationJobInclude,
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

  if (options.schedule !== false) {
    scheduleGenerationJob(job.id, userId, providerName);
  }

  return serializeJobWithQueueMeta(job);
}

export async function createAndRunGenerationJob(userId: string, input: CreateGenerationJobInput) {
  const queuedJob = await createAndQueueGenerationJob(userId, input, { schedule: false });

  if (queuedJob.provider === "chatgpt_web") {
    scheduleGenerationJob(queuedJob.id, userId, queuedJob.provider);
    return findGenerationJob(userId, queuedJob.id);
  }

  return runGenerationJobOnce(queuedJob.id, userId);
}

export async function retryGenerationJobForUser(userId: string, jobId: string) {
  await recoverStaleGenerationJobs(userId);

  const job = await prisma.generationJob.findFirst({
    where: {
      id: jobId,
      userId,
    },
    include: generationJobInclude,
  });

  if (!job) {
    throw new AppError("NOT_FOUND", "\u4efb\u52a1\u4e0d\u5b58\u5728", 404);
  }

  if (job.status !== "FAILED" && job.status !== "CANCELED") {
    if (isActiveStatus(job.status)) {
      scheduleGenerationJob(job.id, job.userId, job.provider);
      const currentJob = await getJobForExecution(job.id, job.userId);
      return currentJob ? serializeJobWithQueueMeta(currentJob) : null;
    }

    throw new AppError("CONFLICT", "\u53ea\u80fd\u91cd\u8bd5\u5931\u8d25\u6216\u5df2\u53d6\u6d88\u7684\u4efb\u52a1", 409);
  }

  await resetGenerationJobForRetry(job);
  scheduleGenerationJob(job.id, job.userId, job.provider);

  const currentJob = await getJobForExecution(job.id, job.userId);
  return currentJob ? serializeJobWithQueueMeta(currentJob) : null;
}

export async function listRecentGenerationJobs(userId: string, limit = 20) {
  await recoverStaleGenerationJobs(userId);
  scheduleChatGPTWebQueue();

  const jobs = await prisma.generationJob.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: generationJobInclude,
  });

  return serializeJobsWithQueueMeta(jobs);
}

export async function findGenerationJob(userId: string, id: string) {
  await recoverStaleGenerationJobs(userId);
  scheduleChatGPTWebQueue();

  const job = await prisma.generationJob.findFirst({
    where: {
      id,
      userId,
    },
    include: generationJobInclude,
  });

  return job ? serializeJobWithQueueMeta(job) : null;
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
  scheduleChatGPTWebQueue();

  const cleanStatus = status && ADMIN_FILTERABLE_STATUSES.includes(status as (typeof ADMIN_FILTERABLE_STATUSES)[number]) ? status : undefined;
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
    include: adminGenerationJobInclude,
  });

  return serializeAdminJobsWithQueueMeta(jobs);
}

export async function findAdminGenerationJobById(jobId: string) {
  await recoverStaleGenerationJobs();
  scheduleChatGPTWebQueue();
  return findAdminGenerationJob(jobId);
}

export async function retryFailedGenerationJobByAdmin(jobId: string) {
  await recoverStaleGenerationJobs();

  const job = await prisma.generationJob.findUnique({
    where: {
      id: jobId,
    },
    include: generationJobInclude,
  });

  if (!job) {
    throw new AppError("NOT_FOUND", "\u4efb\u52a1\u4e0d\u5b58\u5728", 404);
  }

  if (job.status !== "FAILED" && job.status !== "CANCELED") {
    if (isActiveStatus(job.status)) {
      return rescheduleGenerationJobForAdmin(job.id, job.userId);
    }

    throw new AppError("CONFLICT", "\u53ea\u80fd\u91cd\u8bd5\u5931\u8d25\u6216\u5df2\u53d6\u6d88\u7684\u4efb\u52a1", 409);
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
    include: generationJobInclude,
  });

  if (!job) {
    throw new AppError("NOT_FOUND", "\u4efb\u52a1\u4e0d\u5b58\u5728", 404);
  }

  if (runningJobIds.has(job.id)) {
    throw new AppError("CONFLICT", "\u5f53\u524d\u8fdb\u7a0b\u6b63\u5728\u6267\u884c\u8be5\u4efb\u52a1\uff0c\u8bf7\u7a0d\u540e\u518d\u5904\u7406\u3002", 409);
  }

  if (job.status === "COMPLETED") {
    throw new AppError("CONFLICT", "\u5df2\u5b8c\u6210\u4efb\u52a1\u4e0d\u80fd\u6807\u8bb0\u5931\u8d25", 409);
  }

  if (job.status === "FAILED" || job.status === "CANCELED") {
    return findAdminGenerationJob(job.id);
  }

  await failGenerationJob(job.id, job.userId, job.creditCost, new Error("\u7ba1\u7406\u5458\u624b\u52a8\u6807\u8bb0\u5931\u8d25\uff0c\u5df2\u9000\u56de\u51bb\u7ed3\u79ef\u5206\u3002"));
  if (isChatGPTWebProvider(job.provider)) {
    scheduleChatGPTWebQueue();
  }
  return findAdminGenerationJob(job.id);
}

export function getChatGPTWebQueueRuntimeState() {
  return {
    busy: chatGPTWebActiveJobIds.size > 0,
    activeJobIds: Array.from(chatGPTWebActiveJobIds),
    activeJobCount: chatGPTWebActiveJobIds.size,
    maxConcurrentJobs: MAX_CONCURRENT_CHATGPT_WEB_JOBS,
    pumpRunning: Boolean(chatGPTWebQueuePump),
  };
}
