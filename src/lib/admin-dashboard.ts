import { GenerationStatus, RechargeOrderStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

const activeGenerationStatuses = [
  GenerationStatus.QUEUED,
  GenerationStatus.POLISHING,
  GenerationStatus.GENERATING,
  GenerationStatus.UPLOADING,
];

function serializeDate(value: Date) {
  return value.toISOString();
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function statusCountMap<T extends string>(rows: Array<{ status: T; _count: { status: number } }>) {
  return Object.fromEntries(rows.map((row) => [row.status, row._count.status])) as Record<T, number | undefined>;
}

export type AdminDashboardReport = Awaited<ReturnType<typeof getAdminDashboardReport>>;

export async function getAdminDashboardReport() {
  const today = startOfToday();

  const [
    userCount,
    adminCount,
    totalJobs,
    todayJobs,
    jobStatusGroups,
    totalGeneratedImages,
    publicGeneratedImages,
    curatedImages,
    uploadedImages,
    creditTotals,
    orderStatusGroups,
    paidOrders,
    paidAmount,
    recentJobs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.generationJob.count(),
    prisma.generationJob.count({ where: { createdAt: { gte: today } } }),
    prisma.generationJob.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.generatedImage.count({ where: { isDeleted: false } }),
    prisma.generatedImage.count({ where: { isDeleted: false, isPublic: true, takenDownAt: null } }),
    prisma.curatedGalleryImage.count({ where: { isDeleted: false, isActive: true, takenDownAt: null } }),
    prisma.uploadedImage.count({ where: { isDeleted: false } }),
    prisma.creditAccount.aggregate({
      _sum: {
        available: true,
        frozen: true,
      },
    }),
    prisma.rechargeOrder.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.rechargeOrder.count({ where: { status: RechargeOrderStatus.PAID } }),
    prisma.rechargeOrder.aggregate({
      where: { status: RechargeOrderStatus.PAID },
      _sum: {
        amountCents: true,
      },
    }),
    prisma.generationJob.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        originalInput: true,
        polishedPromptZh: true,
        provider: true,
        providerRequestId: true,
        creditCost: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    }),
  ]);

  const jobCounts = statusCountMap(jobStatusGroups);
  const orderCounts = statusCountMap(orderStatusGroups);
  const runningJobs = activeGenerationStatuses.reduce((total, status) => total + (jobCounts[status] || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    users: {
      total: userCount,
      admins: adminCount,
      regular: Math.max(0, userCount - adminCount),
    },
    jobs: {
      total: totalJobs,
      today: todayJobs,
      running: runningJobs,
      completed: jobCounts[GenerationStatus.COMPLETED] || 0,
      failed: jobCounts[GenerationStatus.FAILED] || 0,
      canceled: jobCounts[GenerationStatus.CANCELED] || 0,
    },
    images: {
      generated: totalGeneratedImages,
      public: publicGeneratedImages,
      curated: curatedImages,
      uploads: uploadedImages,
    },
    credits: {
      available: creditTotals._sum.available || 0,
      frozen: creditTotals._sum.frozen || 0,
    },
    billing: {
      paidOrders,
      pendingOrders: orderCounts[RechargeOrderStatus.PENDING] || 0,
      paidAmountCents: paidAmount._sum.amountCents || 0,
    },
    recentJobs: recentJobs.map((job) => ({
      id: job.id,
      status: job.status,
      prompt: job.polishedPromptZh || job.originalInput,
      provider: job.provider,
      model: job.providerRequestId,
      creditCost: job.creditCost,
      userLabel: job.user.email || job.user.displayName || "匿名用户",
      createdAt: serializeDate(job.createdAt),
    })),
  };
}
