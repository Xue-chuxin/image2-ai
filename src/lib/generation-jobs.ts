import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultGenerationProviderName, getImageGenerationProvider, type ImageGenerationRequest } from "@/lib/image-generation";
import { saveGeneratedImage } from "@/lib/storage";
import type { GenerationProviderName } from "@/lib/settings";

export type GenerationJobView = {
  id: string;
  status: string;
  originalInput: string;
  polishedPromptZh?: string | null;
  polishedPromptEn?: string | null;
  negativePrompt?: string | null;
  ratio: string;
  quality: string;
  imageCount: number;
  creditCost: number;
  provider: string;
  errorMessage?: string | null;
  createdAt: string;
  images: Array<{
    id: string;
    url: string;
    width?: number | null;
    height?: number | null;
  }>;
};

type GenerationJobRecord = {
  id: string;
  status: string;
  originalInput: string;
  polishedPromptZh?: string | null;
  polishedPromptEn?: string | null;
  negativePrompt?: string | null;
  ratio: string;
  quality: string;
  imageCount: number;
  creditCost: number;
  provider: string;
  errorMessage?: string | null;
  createdAt: Date;
  images?: Array<{
    id: string;
    url: string;
    width?: number | null;
    height?: number | null;
  }>;
};

export type CreateGenerationJobInput = ImageGenerationRequest & {
  provider?: GenerationProviderName;
};

function createId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function calculateCreditCost(quality: string, imageCount: number) {
  const unitCost = quality === "high" ? 12 : quality === "low" ? 3 : 5;
  return unitCost * Math.min(Math.max(imageCount, 1), 4);
}

function serializeJob(job: GenerationJobRecord): GenerationJobView {
  return {
    id: job.id,
    status: job.status,
    originalInput: job.originalInput,
    polishedPromptZh: job.polishedPromptZh,
    polishedPromptEn: job.polishedPromptEn,
    negativePrompt: job.negativePrompt,
    ratio: job.ratio,
    quality: job.quality,
    imageCount: job.imageCount,
    creditCost: job.creditCost,
    provider: job.provider,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    images: (job.images || []).map((image) => ({
      id: image.id,
      url: image.url,
      width: image.width,
      height: image.height
    }))
  };
}

export async function ensureDemoUser() {
  const email = "demo@image2.local";
  const users = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM "User" WHERE email = ${email} LIMIT 1`);

  if (users[0]) {
    return users[0].id;
  }

  const id = createId("usr");
  await prisma.$executeRaw(
    Prisma.sql`INSERT INTO "User" (id, email, "displayName", role, "createdAt", "updatedAt") VALUES (${id}, ${email}, '演示用户', 'USER', now(), now())`
  );
  return id;
}

export async function createAndRunGenerationJob(input: CreateGenerationJobInput) {
  const userId = await ensureDemoUser();
  const providerName = input.provider || (await getDefaultGenerationProviderName());
  const imageCount = Math.min(Math.max(Number(input.imageCount) || 1, 1), 4);
  const quality = input.quality || "standard";
  const creditCost = calculateCreditCost(quality, imageCount);
  const provider = getImageGenerationProvider(providerName);

  const job = (await (prisma as any).generationJob.create({
    data: {
      userId,
      status: "GENERATING",
      originalInput: input.promptZh,
      polishedPromptZh: input.promptZh,
      polishedPromptEn: input.promptEn || null,
      negativePrompt: input.negativePrompt || null,
      ratio: input.ratio || "1:1",
      quality,
      imageCount,
      creditCost,
      provider: providerName
    },
    include: { images: true }
  })) as GenerationJobRecord;

  try {
    const result = await provider.generate({
      promptZh: input.promptZh,
      promptEn: input.promptEn,
      negativePrompt: input.negativePrompt,
      ratio: input.ratio || "1:1",
      quality,
      imageCount
    });

    for (const [index, image] of result.images.entries()) {
      const stored = await saveGeneratedImage(job.id, index, image.buffer, image.mimeType);
      await (prisma as any).generatedImage.create({
        data: {
          jobId: job.id,
          url: stored.url,
          width: image.width || stored.width || null,
          height: image.height || stored.height || null
        }
      });
    }

    const completedJob = (await (prisma as any).generationJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        providerRequestId: result.providerRequestId || null
      },
      include: { images: true }
    })) as GenerationJobRecord;

    return serializeJob(completedJob);
  } catch (error) {
    const failedJob = (await (prisma as any).generationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "生图任务失败。"
      },
      include: { images: true }
    })) as GenerationJobRecord;

    return serializeJob(failedJob);
  }
}

export async function listRecentGenerationJobs(limit = 12) {
  const userId = await ensureDemoUser();
  const jobs = (await (prisma as any).generationJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { images: true }
  })) as GenerationJobRecord[];

  return jobs.map(serializeJob);
}

export async function findGenerationJob(id: string) {
  const job = (await (prisma as any).generationJob.findUnique({
    where: { id },
    include: { images: true }
  })) as GenerationJobRecord | null;

  return job ? serializeJob(job) : null;
}
