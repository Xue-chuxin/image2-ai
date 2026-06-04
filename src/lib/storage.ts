import { mkdir, writeFile } from "fs/promises";
import path from "path";

export type StoredImage = {
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
};

export interface StorageService {
  saveGeneratedImage(jobId: string, index: number, buffer: Buffer, mimeType: string): Promise<StoredImage>;
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }
  if (mimeType.includes("webp")) {
    return "webp";
  }
  return "png";
}

export const localStorageService: StorageService = {
  async saveGeneratedImage(jobId: string, index: number, buffer: Buffer, mimeType: string): Promise<StoredImage> {
    const extension = extensionFromMime(mimeType);
    const directory = path.join(process.cwd(), "public", "generated");
    const thumbnailDirectory = path.join(directory, "thumbs");
    const filename = `${jobId}-${index + 1}.${extension}`;

    await mkdir(directory, { recursive: true });
    await mkdir(thumbnailDirectory, { recursive: true });
    await writeFile(path.join(directory, filename), buffer);
    await writeFile(path.join(thumbnailDirectory, filename), buffer);

    return {
      url: `/generated/${filename}`,
      thumbnailUrl: `/generated/thumbs/${filename}`,
      fileSize: buffer.byteLength,
      mimeType,
    };
  },
};

export async function saveGeneratedImage(jobId: string, index: number, buffer: Buffer, mimeType: string): Promise<StoredImage> {
  return localStorageService.saveGeneratedImage(jobId, index, buffer, mimeType);
}
