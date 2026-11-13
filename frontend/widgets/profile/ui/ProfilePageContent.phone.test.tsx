import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppTheme } from "@/core/theme/createAppTheme";
import ProfilePage from "./ProfilePageContent";

const mocks = vi.hoisted(() => ({
  updateSession: vi.fn(),
  save: vi.fn(),
  convertImage: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() },
  user: {
    id: "user",
    name: "Павел",
    email: "user@example.test",
    accountKind: "CUSTOMER",
    phone: "+7 922 124-59-19" as string | null,
    memberships: [],
  },
}));

vi.mock("@/shared/lib/image/convert-to-webp", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/shared/lib/image/convert-to-webp")>(),
  convertImageToWebp: mocks.convertImage,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  usePathname: () => "/profile",
  useSearchParams: () => new URLSearchParams("section=profile"),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: mocks.updateSession }),
}));
vi.mock("@/core/store/hooks", () => ({
  useAppSelector: () => ({ status: "authenticated", user: mocks.user }),
}));
vi.mock("@/widgets/messenger-settings/ui/MessengerSettings", () => ({
  MessengerSettings: () => null,
}));
vi.mock("@/widgets/customer-requests/ui/CustomerRequestsSection", () => ({
  CustomerRequestsSection: () => null,
}));
vi.mock("@/widgets/customer-documents/ui/CustomerDocumentsSection", () => ({
  CustomerDocumentsSection: () => null,
}));
vi.mock("@/views/stories-page", () => ({ StoriesPage: () => null }));
vi.mock("@/widgets/cabinet-chrome", () => ({ CabinetNotices: () => null }));
vi.mock("@/features/select-city", () => ({ LocationField: () => null }));

function setup(providerSettings: boolean) {
  mocks.user.accountKind = providerSettings ? "PROVIDER" : "CUSTOMER";
  const theme = createAppTheme("light");
  const profile = () => (
    <ThemeProvider theme={theme}>
      <ProfilePage providerSettings={providerSettings} />
    </ThemeProvider>
  );
  const view = render(profile());
  return {
    input: screen.getByRole("textbox", { name: "Телефон" }),
    refreshProfile: () => view.rerender(profile()),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.phone = "+7 922 124-59-19";
  mocks.save.mockResolvedValue(Response.json({}));
  mocks.updateSession.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", vi.fn((input, init?: RequestInit) =>
    init?.method === "PATCH"
      ? mocks.save(input, init)
      : Promise.resolve(Response.json({})),
  ));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each([
  { name: "customer profile", providerSettings: false },
  { name: "provider account", providerSettings: true },
])("phone editing in $name", ({ providerSettings }) => {
  it("keeps save buttons present and disabled until the phone changes", () => {
    const { input } = setup(providerSettings);
    const buttons = [
      screen.getByText("Сохранить").closest("button"),
      screen.getByLabelText("Сохранить телефон"),
    ];
    for (const button of buttons) expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "+7 912 345-67-89" } });
    for (const button of buttons) expect(button).toBeEnabled();

    fireEvent.change(input, { target: { value: "+7 922 124-59-19" } });
    for (const button of buttons) expect(button).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Сохранить телефон"));
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("restores the saved phone, clears validation and blurs on Escape without saving", () => {
    const { input } = setup(providerSettings);
    act(() => input.focus());
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "+7 9" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Введите 10 цифр после +7")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");

    expect(fireEvent.keyDown(input, { key: "Escape" })).toBe(false);
    expect(input).toHaveValue("+7 922 124-59-19");
    expect(input).not.toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText("Введите 10 цифр после +7")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Сохранить телефон")).toBeDisabled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("saves the normalized phone on Enter and uses it for the next cancellation", async () => {
    const { input, refreshProfile } = setup(providerSettings);
    mocks.updateSession.mockImplementationOnce(async () => {
      mocks.user.phone = "+7 912 345-67-89";
    });
    fireEvent.change(input, { target: { value: "89123456789" } });
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
    await waitFor(() => expect(input).not.toBeDisabled());
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save).toHaveBeenCalledWith("/api/users/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "+7 912 345-67-89" }),
    });
    expect(mocks.updateSession).toHaveBeenCalledTimes(1);

    refreshProfile();
    fireEvent.change(input, { target: { value: "+7 9" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("+7 912 345-67-89");
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
});

it("restores an empty phone on Escape when no number was saved", () => {
  mocks.user.phone = null;
  const { input } = setup(true);
  act(() => input.focus());
  fireEvent.change(input, { target: { value: "+7 9" } });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(input).toHaveValue("");
  expect(input).not.toHaveFocus();
  expect(screen.getByLabelText("Сохранить телефон")).toBeDisabled();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("preserves the saved phone when Escape blurs a cleared field", () => {
  const { input } = setup(false);
  act(() => input.focus());
  fireEvent.change(input, { target: { value: "" } });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(input).toHaveValue("+7 922 124-59-19");
  expect(input).not.toHaveFocus();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("shows progress until the converted profile image is uploaded", async () => {
  let complete!: (file: File) => void;
  let finishUpload!: (response: Response) => void;
  mocks.convertImage.mockReturnValueOnce(new Promise((resolve) => { complete = resolve; }));
  vi.mocked(fetch).mockImplementation((input) => String(input) === "/api/users/me/image"
    ? new Promise((resolve) => { finishUpload = resolve; })
    : Promise.resolve(Response.json({})));
  setup(false);
  const button = screen.getAllByRole("button", { name: "Загрузить фото" })[0];
  const input = button.querySelector('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [new File(["image"], "avatar.jpg", { type: "image/jpeg" })] } });
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url) === "/api/users/me/image")).toBe(false);

  const converted = new File(["webp"], "avatar.webp", { type: "image/webp" });
  await act(async () => complete(converted));
  await waitFor(() => {
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url) === "/api/users/me/image");
    expect((call?.[1]?.body as FormData).get("file")).toBe(converted);
  });
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  await act(async () => finishUpload(Response.json({})));
  await waitFor(() => expect(button).not.toHaveAttribute("aria-disabled", "true"));
});
