import {
  convertImageToWebp,
  IMAGE_INPUT_ACCEPT,
  validateImageInput,
} from "@/shared/lib/image/convert-to-webp";

export const REQUEST_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const REQUEST_DOCUMENT_INPUT_ACCEPT = `.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,${IMAGE_INPUT_ACCEPT}`;

function isPhoto(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i.test(file.name)
  );
}

export function validateRequestDocumentUpload(file: File): string | null {
  if (isPhoto(file)) return validateImageInput(file);
  if (!file.size) return "Выберите непустой файл.";
  if (file.size > REQUEST_DOCUMENT_MAX_BYTES)
    return "Размер документа не должен превышать 20 МБ.";
  if (
    !/\.(pdf|docx?|xlsx?)$/i.test(file.name) &&
    ![
      "application/pdf",
      "application/msword",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(file.type)
  )
    return "Выберите PDF, Word, Excel или фотографию.";
  return null;
}

export async function prepareRequestDocumentUpload(file: File): Promise<File> {
  const error = validateRequestDocumentUpload(file);
  if (error) throw new Error(error);
  return isPhoto(file)
    ? convertImageToWebp(file, { maxBytes: REQUEST_DOCUMENT_MAX_BYTES })
    : file;
}
