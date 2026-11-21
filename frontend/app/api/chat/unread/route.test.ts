/** @vitest-environment node */

import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { GET } from "./route";

vi.mock("@/core/auth", () => ({ getServerAuthSession: vi.fn() }));
vi.mock("@/shared/api/backend/server", () => ({ fetchBackendAsUser: vi.fn() }));

describe("GET /api/chat/unread", () => {
  beforeEach(() => vi.resetAllMocks());

  it("forwards the selected role with the authenticated identity", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: {
        id: "session-user",
        person: null,
        systemRole: "CUSTOMER",
        accountKind: "PROVIDER",
        activeProviderId: "provider",
        phone: null,
        customerCity: null,
        memberships: [],
      },
      expires: "2099-01-01",
    });
    const rows = [{ conversationId: "c1", serviceRequestId: "r1", unreadCount: 3 }];
    vi.mocked(fetchBackendAsUser).mockResolvedValue(Response.json(rows));

    const response = await GET(new Request("http://localhost/api/chat/unread?role=provider"));
    expect(fetchBackendAsUser).toHaveBeenCalledWith("/chat/unread?role=provider", "session-user");
    expect(await response.json()).toEqual(rows);
  });

  it("rejects unauthenticated visitors without calling the backend", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/chat/unread?role=customer"));
    expect(response.status).toBe(401);
    expect(fetchBackendAsUser).not.toHaveBeenCalled();
  });
});
