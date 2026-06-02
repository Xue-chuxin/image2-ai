import { Prisma, prisma } from "./db";
import {
  getImageGenerationProvider,
  type ImageGenerationRequest,
  type ImageQuality,
} from "./image-generation";
import {
  estimateGenerationCreditCost,
  refundReservedCreditsForJob,
  reserveCreditsForJob,
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
  return error instanceof Error ? error.message : "生成任务执行失败";
}

export async function createAndRunGenerationJob(userId: string, input: CreateGenerationJobInput) {
  const promptZh = normalizePrompt(input.promptZh);

  if (!promptZh) {
    throw new Error("请输入中文提示词");
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
      status: "GENERATING",
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

  let creditsReserved = false;
  const request: ImageGenerationRequest = {
    promptZh,
    promptEn: input.promptEn,
    negativePrompt: input.negativePrompt,
    ratio,
    quality,
    imageCount,
  };

  try {
    await reserveCreditsForJob(userId, creditCost, job.id);
    creditsReserved = true;

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
          jobId: job.id,
          url: storedImage.url,
        },
      });
    }

    const completedJob = await prisma.$transaction(async (tx) => {
      await tx.creditAccount.update({
        where: {
          userId,
        },
        data: {
          frozen: {
            decrement: creditCost,
          },
        },
      });

      const account = await tx.creditAccount.findUniqueOrThrow({
        where: {
          userId,
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          type: "SPEND",
          amount: -creditCost,
          balance: account.available,
          jobId: job.id,
          memo: "生图成功扣除积分",
        },
      });

      return tx.generationJob.update({
        where: {
          id: job.id,
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
    });
    creditsReserved = false;

    return serializeJob(completedJob);
  } catch (error) {
    if (creditsReserved) {
      await refundReservedCreditsForJob(userId, creditCost, job.id).catch(() => null);
    }

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
