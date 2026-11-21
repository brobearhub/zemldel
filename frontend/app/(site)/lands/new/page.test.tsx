import { makeAuthSession } from "@/tests/fixtures/auth-session";
import { LandEditor } from "@/widgets/lands/LandEditor";
import NewLandPage from "./page";

const { session, headers } = vi.hoisted(() => ({
  session: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("@/core/auth", () => ({ getServerAuthSession: session }));
vi.mock("next/headers", () => ({ headers }));
vi.mock("next/navigation", () => ({
  redirect(href: string) {
    throw new Error(href);
  },
}));
vi.mock("@/widgets/lands/LandEditor", () => ({ LandEditor: () => null }));

it.each([undefined, "SELECTION"])(
  "отправляет гостя на вход с адресом формы для kind=%s",
  async (kind) => {
    const search = kind ? `?kind=${kind}` : "";
    session.mockResolvedValue(null);
    headers.mockResolvedValue(new Headers({
      "x-pathname": "/lands/new",
      "x-search": search,
    }));

    const page = NewLandPage({ searchParams: Promise.resolve({ kind }) });
    const returnTo = encodeURIComponent(`/lands/new${search}`);
    await expect(page).rejects.toEqual(new Error(`/signin?returnTo=${returnTo}`));
  },
);

it.each([
  [undefined, "SALE"],
  ["SELECTION", "SELECTION"],
])("открывает нужную форму после входа для kind=%s", async (kind, expectedKind) => {
  session.mockResolvedValue(makeAuthSession());

  const page = await NewLandPage({ searchParams: Promise.resolve({ kind }) });
  expect(page.type).toBe(LandEditor);
  expect(page.props.initialKind).toBe(expectedKind);
});
