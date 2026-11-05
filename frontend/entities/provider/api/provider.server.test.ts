import { BackendApiError, fetchBackendJson } from "@/shared/api/backend/server";
import { getPublicProviderBySlug, getPublicProviderProfile } from "./provider.server";

vi.mock("@/shared/api/backend/server", () => ({
  fetchBackendJson: vi.fn(),
  BackendApiError: class extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
}));

describe.each([
  ["slug", getPublicProviderBySlug],
  ["id", getPublicProviderProfile],
] as const)("public provider lookup by %s", (_, lookup) => {
  beforeEach(() => vi.resetAllMocks());

  it("returns null only when the provider does not exist", async () => {
    vi.mocked(fetchBackendJson).mockRejectedValue(new BackendApiError("Missing", 404, null));
    await expect(lookup("missing")).resolves.toBeNull();
  });

  it("preserves temporary backend failures instead of causing a false 404", async () => {
    vi.mocked(fetchBackendJson).mockRejectedValue(new BackendApiError("Unavailable", 503, null));
    await expect(lookup("existing")).rejects.toThrow("Unavailable");
  });

  it("does not treat malformed responses as a missing provider", async () => {
    vi.mocked(fetchBackendJson).mockResolvedValue({ id: "incomplete" });
    await expect(lookup("existing")).rejects.toThrow("Invalid public provider response");
  });
});
