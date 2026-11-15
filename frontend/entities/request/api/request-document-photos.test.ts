import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convertImageToWebp } from "@/shared/lib/image/convert-to-webp";
import { fetchIdempotentWrite } from "@/shared/api/idempotent-write";
import {
  prepareRequestDocumentUpload,
  REQUEST_DOCUMENT_MAX_BYTES,
} from "../lib/request-document-upload";
import { uploadProRequestMiscFiles } from "./pro-contract-bundles";
import { uploadCustomerRequestDocument } from "./request-document-requests";

vi.mock("@/shared/lib/image/convert-to-webp", async (original) => ({
  ...(await original<typeof import("@/shared/lib/image/convert-to-webp")>()),
  convertImageToWebp: vi.fn(),
}));
vi.mock("@/shared/api/idempotent-write", () => ({
  fetchIdempotentWrite: vi.fn(),
  forgetWriteIntent: vi.fn(),
}));

const photo = new File(["original photo"], "Участок.jpg", {
  type: "image/jpeg",
});
const converted = new File(["converted webp"], "Участок.webp", {
  type: "image/webp",
});
const pdf = new File(["pdf"], "Документ.pdf", { type: "application/pdf" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(convertImageToWebp).mockResolvedValue(converted);
  vi.mocked(fetchIdempotentWrite).mockResolvedValue(
    new Response(JSON.stringify({ ok: true })),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ created: [] }))),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("photos attached to request documents", () => {
  it.each([
    photo,
    new File(["png"], "photo.png", { type: "image/png" }),
    new File(["heic"], "phone.HEIC"),
    new File(["webp"], "photo.webp", { type: "image/webp" }),
  ])("uses the shared WebP converter for $name", async (file) => {
    expect(await prepareRequestDocumentUpload(file)).toBe(converted);
    expect(convertImageToWebp).toHaveBeenCalledWith(file, {
      maxBytes: REQUEST_DOCUMENT_MAX_BYTES,
    });
  });

  it("sends mixed provider attachments with WebP metadata and unchanged visibility", async () => {
    await uploadProRequestMiscFiles("request", [photo, pdf], false);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const form = options!.body as FormData;
    expect(form.getAll("files")).toEqual([converted, pdf]);
    expect(form.get("visibleToCustomer")).toBe("false");
    expect(convertImageToWebp).toHaveBeenCalledTimes(1);
  });

  it("sends a converted customer photo and recovers by its converted bytes and filename", async () => {
    const bytes = new TextEncoder().encode("converted webp");
    Object.defineProperty(converted, "arrayBuffer", {
      value: async () => bytes.buffer,
      configurable: true,
    });
    vi.stubGlobal("crypto", webcrypto);
    await uploadCustomerRequestDocument("request", "document", photo);
    const [url, options, recovery] =
      vi.mocked(fetchIdempotentWrite).mock.calls[0];
    expect(url).toBe("/api/requests/request/document-requests/document/upload");
    expect((options.body as FormData).get("file")).toBe(converted);
    const digest = await webcrypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "document",
            status: "UPLOADED",
            originalName: converted.name,
            sha256,
          },
        ]),
      ),
    );
    expect((await recovery?.recover?.())?.ok).toBe(true);
  });

  it("keeps PDF and DOCX unchanged", async () => {
    const docx = new File(["docx"], "file.docx");
    expect(await prepareRequestDocumentUpload(pdf)).toBe(pdf);
    expect(await prepareRequestDocumentUpload(docx)).toBe(docx);
    expect(convertImageToWebp).not.toHaveBeenCalled();
  });

  it("sends no files if photo conversion fails, including a mixed batch", async () => {
    vi.mocked(convertImageToWebp).mockRejectedValue(
      new Error("Не удалось обработать изображение"),
    );
    await expect(
      uploadProRequestMiscFiles("request", [pdf, photo], true),
    ).rejects.toThrow("обработать");
    await expect(
      uploadCustomerRequestDocument("request", "document", photo),
    ).rejects.toThrow("обработать");
    expect(fetch).not.toHaveBeenCalled();
    expect(fetchIdempotentWrite).not.toHaveBeenCalled();
  });

  it("allows source photos above 20 MB but enforces the converter's 50 MB limit", async () => {
    const source = new File(["x"], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(source, "size", {
      value: 25 * 1024 * 1024,
      configurable: true,
    });
    expect(await prepareRequestDocumentUpload(source)).toBe(converted);
    Object.defineProperty(source, "size", { value: 51 * 1024 * 1024 });
    await expect(prepareRequestDocumentUpload(source)).rejects.toThrow("50 МБ");
  });
});
