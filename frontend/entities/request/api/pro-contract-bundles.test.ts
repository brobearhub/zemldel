import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadProRequestContractBundle } from "./pro-contract-bundles";

afterEach(() => vi.unstubAllGlobals());

describe("optional signature multipart payload", () => {
  it.each([false, true])("sends a signature only when supplied: %s", async (withSignature) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ bundleId: "b1" })));
    vi.stubGlobal("fetch", fetcher);
    const document = new File(["document"], "contract.pdf");
    const signature = withSignature ? new File(["signature"], "contract.sig") : null;
    await uploadProRequestContractBundle("r1", { document, signature });
    const form = fetcher.mock.calls[0][1].body as FormData;
    expect(form.get("document")).toBe(document);
    expect(form.has("signature")).toBe(withSignature);
    if (withSignature) expect(form.get("signature")).toBe(signature);
  });
});
