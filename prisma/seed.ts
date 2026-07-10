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

  const stylePresets = [
    {
      slug: "cyberpunk",
      name: "赛博朋克",
      description: "霓虹夜色、未来都市、高对比光影",
      promptSuffix: "赛博朋克风格，霓虹灯光，未来都市夜景，高对比光影，电影质感",
      negativeSuffix: "低分辨率，模糊，畸变"
    },
    {
      slug: "minimalist",
      name: "极简主义",
      description: "干净留白、简洁构图、柔和色彩",
      promptSuffix: "极简主义风格，干净背景，大量留白，简洁构图，柔和自然光",
      negativeSuffix: "杂乱背景，过多元素"
    },
    {
      slug: "film-photography",
      name: "复古胶片",
      description: "胶片颗粒、暖色调、怀旧氛围",
      promptSuffix: "复古胶片摄影风格，胶片颗粒感，暖色调，柔和光线，怀旧氛围",
      negativeSuffix: "数码感，过度锐化"
    },
    {
      slug: "watercolor",
      name: "水彩插画",
      description: "水彩晕染、手绘质感、清新配色",
      promptSuffix: "水彩插画风格，柔和晕染，手绘质感，清新配色，纸张纹理",
      negativeSuffix: "照片写实，硬边缘"
    },
    {
      slug: "3d-render",
      name: "3D 渲染",
      description: "C4D 质感、柔和全局光、清透材质",
      promptSuffix: "3D 渲染风格，C4D，柔和全局光照，清透材质，细腻质感，柔和阴影",
      negativeSuffix: "噪点，粗糙材质"
    },
    {
      slug: "japanese-anime",
      name: "日系动漫",
      description: "赛璐璐上色、通透光影、精致线条",
      promptSuffix: "日系动漫风格，赛璐璐上色，通透光影，精致线条，鲜明色彩",
      negativeSuffix: "写实照片，脏乱线条"
    }
  ];

  for (let index = 0; index < stylePresets.length; index += 1) {
    const preset = stylePresets[index];
    await prisma.stylePreset.upsert({
      where: { slug: preset.slug },
      update: {
        name: preset.name,
        description: preset.description,
        promptSuffix: preset.promptSuffix,
        negativeSuffix: preset.negativeSuffix,
        sortOrder: index * 10,
        isActive: true
      },
      create: {
        slug: preset.slug,
        name: preset.name,
        description: preset.description,
        promptSuffix: preset.promptSuffix,
        negativeSuffix: preset.negativeSuffix,
        sortOrder: index * 10,
        isActive: true
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
