import ServicesAdminListPage from "./page";

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

vi.mock("@/core/auth", () => ({
  __esModule: true,
  getServerAuthSession: vi.fn(),
}));

vi.mock("@/shared/api/backend/server", () => ({
  __esModule: true,
  fetchBackendJsonAsUser: vi.fn(),
}));

import { fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";

const mockedFetchBackendJsonAsUser = vi.mocked(fetchBackendJsonAsUser);
const mockedGetServerAuthSession = vi.mocked(getServerAuthSession);

function setNodeEnv(value: "development" | "production" | "test") {
  process.env = { ...process.env, NODE_ENV: value } as NodeJS.ProcessEnv;
}

describe("Admin services list page", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetServerAuthSession.mockResolvedValue({
      user: {
        id: "user-1",
        systemRole: "PLATFORM_ADMIN",
      },
    });
  });

  afterAll(() => {
    setNodeEnv((originalNodeEnv as "development" | "production" | "test" | undefined) ?? "test");
  });

  it("loads services with expected ordering", async () => {
    setNodeEnv("test");
    mockedFetchBackendJsonAsUser.mockResolvedValue([]);

    const element = await ServicesAdminListPage();

    expect(element).toBeTruthy();
    expect(mockedFetchBackendJsonAsUser).toHaveBeenCalledWith("/admin/services", "user-1");
  });
});
