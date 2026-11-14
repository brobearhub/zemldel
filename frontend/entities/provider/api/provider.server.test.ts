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

  it("preserves the provider work geography from the API", async () => {
    const serviceGeography = [
      { id: "local", title: "Межевание", places: [{ kind: "city", cityId: "ekb", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" }] },
      { id: "national", title: "Консультация", places: [{ kind: "region", name: "Вся Россия", regionCode: "RU", regionName: "Вся Россия" }] },
    ];
    vi.mocked(fetchBackendJson).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Иван П.", slug: "ivan-p", type: "INDIVIDUAL", rating: null,
      reviewCount: 0, city: null, subtitle: "", verified: false,
      availabilityLabel: "", stats: [], serviceGeography,
    });
    expect((await lookup("ivan-p"))?.serviceGeography).toEqual(serviceGeography);
  });

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
