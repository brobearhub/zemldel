import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadProRequestContractBundle } from "./pro-contract-bundles";

afterEach(() => vi.unstubAllGlobals());

describe("contract upload errors", () => {
  const document = new File(["test"], "contract.pdf", {type:"application/pdf"});
  it("reports a network failure in Russian without automatic retries", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadProRequestContractBundle("r",{document})).rejects.toThrow("Нет соединения");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("keeps a specific validation error from a 422 response", async () => {
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({error:"Unprocessable Entity",message:"Выберите договор PDF или DOCX."}),{status:422})));
    await expect(uploadProRequestContractBundle("r",{document})).rejects.toThrow("Выберите договор PDF или DOCX.");
  });
  it("rejects an unsupported file or oversized file before sending", async () => {
    const fetchMock=vi.fn(); vi.stubGlobal("fetch",fetchMock);
    await expect(uploadProRequestContractBundle("r",{document:new File(["x"],"invalid.exe")})).rejects.toThrow("PDF или DOCX");
    const large=new File([new Uint8Array(20*1024*1024+1)],"large.pdf");
    await expect(uploadProRequestContractBundle("r",{document:large})).rejects.toThrow("20 МБ");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
