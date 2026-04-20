import ServicesAdminCreatePage from "./page";

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

vi.mock("@/core/auth/server-authorization", () => ({
  __esModule: true,
  getServiceManagementContext: vi.fn(),
}));

import { getServiceManagementContext } from "@/core/auth/server-authorization";

const mockedGetServiceManagementContext = vi.mocked(getServiceManagementContext);

function setNodeEnv(value: "development" | "production" | "test") {
  process.env = { ...process.env, NODE_ENV: value } as NodeJS.ProcessEnv;
}

describe("Admin services create page", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetServiceManagementContext.mockResolvedValue({
      context: {
        actorUserId: "user-1",
        providerId: "provider-1",
        isPlatformAdmin: false,
      },
    });
  });

  afterAll(() => {
    setNodeEnv((originalNodeEnv as "development" | "production" | "test" | undefined) ?? "test");
  });

  it("renders create flow when authorized", async () => {
    setNodeEnv("test");
    const element = await ServicesAdminCreatePage();

    expect(element).toBeTruthy();
  });
});
