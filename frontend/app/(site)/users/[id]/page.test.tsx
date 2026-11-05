import PublicUserPage from "./page";
import { BackendApiError, fetchBackendJson, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/core/auth", () => ({ getServerAuthSession: vi.fn() }));
vi.mock("@/shared/api/backend/server", () => ({
  fetchBackendJson: vi.fn(),
  fetchBackendJsonAsUser: vi.fn(),
  BackendApiError: class extends Error {
    constructor(message: string, readonly status: number) { super(message); }
  },
}));

describe("public user page status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerAuthSession).mockResolvedValue(null);
  });

  it("returns not found for a missing or hidden public profile", async () => {
    vi.mocked(fetchBackendJson).mockRejectedValue(new BackendApiError("Hidden", 404, null));
    await expect(PublicUserPage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("does not turn backend outages into missing profiles", async () => {
    vi.mocked(fetchBackendJson).mockRejectedValue(new BackendApiError("Unavailable", 503, null));
    await expect(PublicUserPage({ params: Promise.resolve({ id: "user" }) })).rejects.toThrow("Unavailable");
  });

  it("preserves authenticated access checks for owners and contract participants", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({ user: { id: "viewer" } } as Awaited<ReturnType<typeof getServerAuthSession>>);
    vi.mocked(fetchBackendJsonAsUser).mockResolvedValue({
      id: "user", name: "Пользователь", reviewsWritten: [], reviewsReceived: [],
    });
    await PublicUserPage({ params: Promise.resolve({ id: "user" }) });
    expect(fetchBackendJsonAsUser).toHaveBeenCalledWith("/users/user/public", "viewer");
    expect(fetchBackendJson).not.toHaveBeenCalled();
  });
});
