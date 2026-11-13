import { convertImageToWebp, validateImageInput } from "./convert-to-webp";

const heic = vi.hoisted(() => ({ convert: vi.fn() }));
vi.mock("heic-to/csp", () => ({ heicTo: heic.convert }));

describe("convertImageToWebp", () => {
  const drawImage = vi.fn();
  const close = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 8000, height: 4000, close }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["webp"], { type: "image/webp" }));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("converts and resizes an image while preserving the aspect ratio", async () => {
    const file = new File(["image"], "фото.png", { type: "image/png", lastModified: 123 });
    const result = await convertImageToWebp(file, { maxBytes: 100, maxDimension: 2048 });
    expect(result).toMatchObject({ name: "фото.webp", type: "image/webp", lastModified: 123 });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1024);
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.86);
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not send PNG when the browser cannot encode WebP", async () => {
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((callback) => callback(new Blob(["png"], { type: "image/png" })));
    await expect(convertImageToWebp(new File(["x"], "a.jpg", { type: "image/jpeg" }), { maxBytes: 100 }))
      .rejects.toThrow("Браузер не смог создать WebP");
  });

  it("uses the HEIC decoder only when native decoding fails", async () => {
    vi.mocked(createImageBitmap).mockRejectedValue(new Error("unsupported"));
    heic.convert.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:test"), revokeObjectURL: revoke });
    let attempts = 0;
    class FakeImage {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        attempts++;
        queueMicrotask(() => attempts === 1 ? this.onerror?.() : this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    const file = new File(["heic"], "phone.heic", { type: "image/heic" });
    const result = await convertImageToWebp(file, { maxBytes: 100 });
    expect(result.type).toBe("image/webp");
    expect(heic.convert).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it("rejects empty and non-image files before decoding", () => {
    expect(validateImageInput(new File([], "empty.png", { type: "image/png" }))).toContain("пустой");
    expect(validateImageInput(new File(["x"], "file.pdf", { type: "application/pdf" }))).toContain("изображения");
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
});
