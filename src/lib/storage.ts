import { mkdir, writeFile } from "fs/promises";
import path from "path";

export type StoredImage = {
  url: string;
  width?: number;
  height?: number;
};

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }
  if (mimeType.includes("webp")) {
    return "webp";
  }
  return "png";
}

export async function saveGeneratedImage(jobId: string, index: number, buffer: Buffer, mimeType: string): Promise<StoredImage> {
  const extension = extensionFromMime(mimeType);
  const directory = path.join(process.cwd(), "public", "generated");
  const filename = `${jobId}-${index + 1}.${extension}`;

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer);

  return {
    url: `/generated/${filename}`
  };
}
