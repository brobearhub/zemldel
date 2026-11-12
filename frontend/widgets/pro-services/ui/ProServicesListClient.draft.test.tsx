import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { mainService } from "@/tests/fixtures/services";
import { clearMatchingServiceDraft, serviceDraftStorageKey } from "../lib/new-service-draft";
import { ProServicesListClient } from "./ProServicesListClient";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), router: { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => "/pro/services",
  useSearchParams: () => navigation.params,
}));
vi.mock("@/core/store/hooks", () => ({ useAppSelector: () => ({ user: { id: "user-1", activeProviderId: "prov-1", memberships: [{ providerId: "prov-1", role: "OWNER" }] } }) }));
vi.mock("@/shared/ui/confirm", () => ({ useConfirm: () => vi.fn() }));
vi.mock("../lib/new-service-draft", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/new-service-draft")>(),
  clearMatchingServiceDraft: vi.fn(async () => undefined),
}));
vi.mock("./ProServiceManageCard", () => ({
  ProServiceManageCard: ({ onStatusChange }: { onStatusChange: (status: "PUBLISHED") => void }) => (
    <button onClick={() => onStatusChange("PUBLISHED")}>Опубликовать черновик</button>
  ),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());
it.each([true, false])("clears the matching draft only when list publication succeeds: %s", async (success) => {
  vi.stubGlobal("fetch", vi.fn(async () => success
    ? Response.json(mainService)
    : Response.json({ error: "Сбой публикации" }, { status: 502 })));
  render(
    <ThemeProvider theme={createAppTheme("light")}>
      <ProServicesListClient initialServices={[{ ...mainService, status: "DRAFT" }]} />
    </ThemeProvider>,
  );
  await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать черновик" })[0]);
  if (success) {
    await waitFor(() => expect(clearMatchingServiceDraft).toHaveBeenCalledWith(serviceDraftStorageKey("user-1", mainService.provider.id), mainService.id));
  } else {
    await screen.findByText("Сбой публикации");
    expect(clearMatchingServiceDraft).not.toHaveBeenCalled();
  }
});
