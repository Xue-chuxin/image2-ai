import { vi } from "vitest";

// 几乎所有 src/lib/* 顶层都 import { prisma } from "@/lib/db"，会实例化 PrismaClient。
// 本批次只测纯逻辑，不触达任何 prisma 方法，用空对象屏蔽真实 DB 连接。
vi.mock("@/lib/db", () => ({ prisma: {} }));
