"use client";

export const IMAGE_INPUT_ACCEPT = "image/*,.heic,.heif";
export const MAX_IMAGE_INPUT_BYTES = 50 * 1024 * 1024;

type Options = {
  maxBytes: number;
  maxDimension?: number;
};

const IMAGE_ERROR = "Не удалось обработать изображение. Попробуйте другой файл.";

function isHeic(file: File) {
  return /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
}

export function validateImageInput(file: File): string | null {
  if (!file.size) return "Файл изображения пустой.";
  if (file.size > MAX_IMAGE_INPUT_BYTES) return "Максимальный размер исходного изображения — 50 МБ.";
  if (file.type && !file.type.startsWith("image/") && !isHeic(file)) {
    return "Выберите файл изображения.";
  }
  return null;
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(IMAGE_ERROR));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some browsers decode images with an HTML image but not createImageBitmap.
    }
  }
  try {
    return await loadImage(file);
  } catch {
    if (!isHeic(file)) throw new Error(IMAGE_ERROR);
    try {
      const { heicTo } = await import("heic-to/csp");
      return await loadImage(await heicTo({ blob: file, type: "image/png" }));
    } catch {
      throw new Error(IMAGE_ERROR);
    }
  }
}

/** Converts a browser-decodable image to WebP before it leaves the device. */
export async function convertImageToWebp(file: File, { maxBytes, maxDimension = 4096 }: Options): Promise<File> {
  const validation = validateImageInput(file);
  if (validation) throw new Error(validation);

  const image = await decodeImage(file);
  try {
    const width = "naturalWidth" in image ? image.naturalWidth : image.width;
    const height = "naturalHeight" in image ? image.naturalHeight : image.height;
    if (!width || !height) throw new Error(IMAGE_ERROR);
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error(IMAGE_ERROR);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob || blob.type !== "image/webp" || !blob.size) {
      throw new Error("Браузер не смог создать WebP. Попробуйте другой браузер.");
    }
    if (blob.size > maxBytes) {
      throw new Error(`После обработки фото превышает ${Math.round(maxBytes / 1024 / 1024)} МБ. Выберите изображение поменьше.`);
    }
    const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`;
    return new File([blob], name, { type: "image/webp", lastModified: file.lastModified });
  } finally {
    if ("close" in image && typeof image.close === "function") image.close();
  }
}
