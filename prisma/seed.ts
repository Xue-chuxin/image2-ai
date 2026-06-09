import { PrismaClient } from "@prisma/client";
import { categories, promptCards } from "../src/lib/mock-data";

const prisma = new PrismaClient();

function slugifyCategory(name: string) {
  return encodeURIComponent(name).replace(/%/g, "").toLowerCase();
}

function parseMetric(value: string) {
  const normalized = value.toLowerCase().replace("k", "");
  const number = Number.parseFloat(normalized);
  if (Number.isNaN(number)) return 0;
  return value.toLowerCase().includes("k") ? Math.round(number * 1000) : Math.round(number);
}

async function main() {
  const categoryRecords = new Map<string, string>();

  for (const [index, name] of categories.filter((name) => name !== "全部").entries()) {
    const record = await prisma.promptCategory.upsert({
      where: { slug: slugifyCategory(name) },
      update: {
        name,
        sortOrder: index
      },
      create: {
        name,
        slug: slugifyCategory(name),
        sortOrder: index
      }
    });
    categoryRecords.set(name, record.id);
  }

  for (const prompt of promptCards) {
    const categoryId = categoryRecords.get(prompt.category);
    const promptRecord = await prisma.prompt.upsert({
      where: { slug: prompt.slug },
      update: {
        categoryId,
        title: prompt.title,
        summary: prompt.summary,
        promptZh: prompt.promptZh,
        promptEn: prompt.promptEn,
        negativePrompt: prompt.negativePrompt,
        sourceName: prompt.sourceName,
        sourceUrl: prompt.sourceUrl || null,
        authorName: prompt.authorName,
        licenseNote: prompt.licenseNote,
        viewCount: parseMetric(prompt.views),
        favoriteCount: parseMetric(prompt.likes)
      },
      create: {
        categoryId,
        slug: prompt.slug,
        title: prompt.title,
        summary: prompt.summary,
        promptZh: prompt.promptZh,
        promptEn: prompt.promptEn,
        negativePrompt: prompt.negativePrompt,
        sourceName: prompt.sourceName,
        sourceUrl: prompt.sourceUrl || null,
        authorName: prompt.authorName,
        licenseNote: prompt.licenseNote,
        viewCount: parseMetric(prompt.views),
        favoriteCount: parseMetric(prompt.likes)
      }
    });

    await prisma.promptTag.deleteMany({ where: { promptId: promptRecord.id } });
    await prisma.promptTag.createMany({
      data: prompt.tags.map((name) => ({ promptId: promptRecord.id, name }))
    });

    await prisma.curatedGalleryImage.upsert({
      where: { id: `curated_${prompt.slug}` },
      update: {
        title: prompt.title,
        summary: prompt.summary,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(prompt.slug)}/960/1280`,
        thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(prompt.slug)}/640/860`,
        ratio: prompt.ratio,
        category: prompt.category,
        tags: prompt.tags.join(","),
        promptZh: prompt.promptZh,
        promptEn: prompt.promptEn,
        negativePrompt: prompt.negativePrompt,
        authorName: prompt.authorName,
        sourceName: prompt.sourceName,
        sourceUrl: prompt.sourceUrl || null,
        sortOrder: promptCards.indexOf(prompt) * 10,
        isActive: true,
        isDeleted: false,
        takenDownAt: null,
        takenDownReason: null,
        publishedAt: new Date()
      },
      create: {
        id: `curated_${prompt.slug}`,
        title: prompt.title,
        summary: prompt.summary,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(prompt.slug)}/960/1280`,
        thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(prompt.slug)}/640/860`,
        ratio: prompt.ratio,
        category: prompt.category,
        tags: prompt.tags.join(","),
        promptZh: prompt.promptZh,
        promptEn: prompt.promptEn,
        negativePrompt: prompt.negativePrompt,
        authorName: prompt.authorName,
        sourceName: prompt.sourceName,
        sourceUrl: prompt.sourceUrl || null,
        sortOrder: promptCards.indexOf(prompt) * 10,
        isActive: true,
        publishedAt: new Date()
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
