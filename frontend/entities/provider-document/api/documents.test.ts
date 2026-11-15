import { uploadProviderDocuments } from "./documents";
import {
  uploadProRequestContractBundle,
  uploadProRequestMiscFiles,
} from "@/entities/request/api/pro-contract-bundles";

afterEach(() => vi.unstubAllGlobals());

const source = {
  id: "library-file",
  folderId: null,
  originalName: "Договор.doc",
  mimeType: "application/msword",
  sizeBytes: 20,
  createdAt: "2026-11-15",
};

it("sends library IDs for both attachment blocks without downloading the source in the browser", async () => {
  const fetchMock = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ bundleId: "bundle", created: [{ id: "attached" }] }),
        ),
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  await uploadProRequestContractBundle("request", {
    document: null,
    sourceDocument: source,
  });
  const contract = fetchMock.mock.calls[0][1].body as FormData;
  expect(contract.get("sourceDocumentId")).toBe(source.id);
  expect(contract.has("document")).toBe(false);
  await uploadProRequestMiscFiles("request", [], false, [source]);
  const misc = fetchMock.mock.calls[1][1].body as FormData;
  expect(misc.get("sourceDocumentIds")).toBe(JSON.stringify([source.id]));
  expect(misc.get("visibleToCustomer")).toBe("false");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it.each(["doc", "docx", "xls", "xlsx", "pdf"])(
  "uploads %s to a selected folder",
  async (extension) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ created: [] })));
    vi.stubGlobal("fetch", fetchMock);
    await uploadProviderDocuments(
      [new File(["file"], `document.${extension}`)],
      "folder",
    );
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("folderId")).toBe("folder");
    expect((body.get("files") as File).name).toBe(`document.${extension}`);
  },
);
