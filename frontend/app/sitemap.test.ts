import sitemap from "./sitemap";
import { fetchBackendJson } from "@/shared/api/backend/server";

vi.mock("@/shared/api/backend/server", () => ({ fetchBackendJson: vi.fn() }));

describe("public sitemap", () => {
  beforeEach(() => vi.resetAllMocks());

  it("includes child hubs and deduplicates providers", async () => {
    vi.mocked(fetchBackendJson).mockImplementation(async (path) => {
      if (path === "/service-categories") return [
        { id: "root", slug: "root-slug", parentId: null },
        { id: "child", slug: "child-slug", parentId: "root" },
      ];
      return [
        { id: "one", provider: { slug: "specialist" } },
        { id: "two", provider: { slug: "specialist" } },
      ];
    });
    const urls = (await sitemap()).map((item) => new URL(item.url).pathname);
    expect(urls).toContain("/service-categories/child-slug");
    expect(urls).toContain("/services/one");
    expect(urls.filter((url) => url === "/providers/specialist")).toHaveLength(1);
  });

  it("does not publish a partial successful sitemap when a dependency fails", async () => {
    vi.mocked(fetchBackendJson).mockImplementation(async (path) => {
      if (path === "/services") throw new Error("Backend unavailable");
      return [];
    });
    await expect(sitemap()).rejects.toThrow("Backend unavailable");
  });
});
