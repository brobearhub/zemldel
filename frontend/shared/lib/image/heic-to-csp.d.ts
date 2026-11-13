declare module "heic-to/csp" {
  export function heicTo(options: {
    blob: Blob;
    type: "image/png";
  }): Promise<Blob>;
}
