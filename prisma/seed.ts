import { PrismaClient } from "@prisma/client";
import { categories, promptCards } from "../src/lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  const categoryRecords = new Map<string, string>();

  for (const [index, name] of categories.filter((name) => name !== "全部").entries()) {
    const record = await prisma.promptCategory.upsert({
      where: { slug: name.toLowerCase().replace(/\s+/g, "-") },
      update: {
        name,
        sortOrder: index
      },
      create: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        sortOrder: index
      }
    });
    categoryRecords.set(name, record.id);
  }

  for (const prompt of promptCards) {
    const categoryId = categoryRecords.get(prompt.category);
    await prisma.prompt.upsert({
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
        viewCount: Number.parseInt(prompt.views.replace(/\D/g, ""), 10) || 0,
        favoriteCount: Number.parseInt(prompt.likes.replace(/\D/g, ""), 10) || 0
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
        viewCount: Number.parseInt(prompt.views.replace(/\D/g, ""), 10) || 0,
        favoriteCount: Number.parseInt(prompt.likes.replace(/\D/g, ""), 10) || 0,
        tags: {
          create: prompt.tags.map((name) => ({ name }))
        }
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