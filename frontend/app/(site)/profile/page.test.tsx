import ProfilePage from "./page";

const mocks = vi.hoisted(() => ({ session: vi.fn(), redirect: vi.fn() }));
vi.mock("@/core/auth", () => ({ getServerAuthSession: mocks.session }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/widgets/profile/ui/ProfilePageContent", () => ({
  default: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation(() => {
    throw new Error("redirect");
  });
});

it("перенаправляет старую ссылку контактного лица в личные данные исполнителя", async () => {
  mocks.session.mockResolvedValue({ user: { accountKind: "PROVIDER" } });
  await expect(
    ProfilePage({
      searchParams: Promise.resolve({
        section: "profile",
        notice: "contact-avatar-failed",
      }),
    }),
  ).rejects.toThrow("redirect");
  expect(mocks.redirect).toHaveBeenCalledWith(
    "/pro/settings/account?notice=contact-avatar-failed",
  );
});

it("старые ссылки на заявки не показывают исполнителю предупреждение про другой аккаунт", async () => {
  mocks.session.mockResolvedValue({ user: { accountKind: "PROVIDER" } });
  await expect(
    ProfilePage({ searchParams: Promise.resolve({ section: "requests" }) }),
  ).rejects.toThrow("redirect");
  expect(mocks.redirect).toHaveBeenCalledWith("/pro/requests/feed");
});

it.each([null, { user: { accountKind: "CUSTOMER" } }])(
  "сохраняет клиентскую страницу",
  async (session) => {
    mocks.session.mockResolvedValue(session);
    await ProfilePage({
      searchParams: Promise.resolve({ section: "profile" }),
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  },
);
