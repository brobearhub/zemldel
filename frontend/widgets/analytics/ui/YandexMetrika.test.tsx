import { StrictMode } from "react";
import { render } from "@testing-library/react";
import { YandexMetrika } from "./YandexMetrika";

const route = vi.hoisted(() => ({ pathname: "/", search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useSearchParams: () => new URLSearchParams(route.search),
}));

beforeEach(() => {
  delete window.ym;
  delete window.__zemledelMetrika;
  document.querySelectorAll('script[src*="mc.yandex.ru/metrika/tag.js"]').forEach((script) => script.remove());
  window.history.replaceState({}, "", "/");
  route.pathname = "/";
  route.search = "";
});

afterEach(() => {
  delete window.ym;
  delete window.__zemledelMetrika;
  document.querySelectorAll('script[src*="mc.yandex.ru/metrika/tag.js"]').forEach((script) => script.remove());
});

it("initializes once and sends one hit for the first page in Strict Mode", () => {
  render(<StrictMode><YandexMetrika /></StrictMode>);

  expect(document.querySelectorAll('script[src="https://mc.yandex.ru/metrika/tag.js?id=114100847"]')).toHaveLength(1);
  expect(window.ym?.a).toHaveLength(2);
  expect(window.ym?.a?.[0]).toEqual([114100847, "init", expect.objectContaining({
    defer: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    trackLinks: true,
  })]);
  expect(window.ym?.a?.[1]).toEqual([114100847, "hit", window.location.origin + "/", { referer: "" }]);
});

it("counts pathname and query changes once, with the preceding page as referer", () => {
  const { rerender } = render(<YandexMetrika />);
  const origin = window.location.origin;

  window.history.pushState({}, "", "/about");
  route.pathname = "/about";
  rerender(<YandexMetrika />);

  window.history.pushState({}, "", "/about?utm_source=menu");
  route.search = "utm_source=menu";
  rerender(<YandexMetrika />);
  rerender(<YandexMetrika />);

  expect(window.ym?.a?.filter((entry) => entry[1] === "init")).toHaveLength(1);
  expect(window.ym?.a?.filter((entry) => entry[1] === "hit")).toEqual([
    [114100847, "hit", origin + "/", { referer: "" }],
    [114100847, "hit", origin + "/about", { referer: origin + "/" }],
    [114100847, "hit", origin + "/about?utm_source=menu", { referer: origin + "/about" }],
  ]);
});

it("ignores fragment navigation and does not duplicate a hit on remount", () => {
  const { rerender, unmount } = render(<YandexMetrika />);
  window.history.pushState({}, "", "/#services");
  rerender(<YandexMetrika />);
  unmount();
  render(<YandexMetrika />);

  expect(window.ym?.a?.filter((entry) => entry[1] === "init")).toHaveLength(1);
  expect(window.ym?.a?.filter((entry) => entry[1] === "hit")).toHaveLength(1);
});


it("does not send authentication tokens or arbitrary query data to the counter", () => {
  window.history.replaceState({}, "", "/reset-password?token=secret-value&utm_source=test");
  route.pathname = "/reset-password";
  route.search = "token=secret-value&utm_source=test";
  const { rerender } = render(<YandexMetrika />);
  const origin = window.location.origin;
  expect(window.ym?.a?.[0]).toEqual([114100847, "init", expect.objectContaining({ url: origin + "/reset-password" })]);
  expect(window.ym?.a?.[1]).toEqual([114100847, "hit", origin + "/reset-password", { referer: "" }]);

  window.history.pushState({}, "", "/about?email=private%40example.com&utm_source=menu");
  route.pathname = "/about";
  route.search = "email=private%40example.com&utm_source=menu";
  rerender(<YandexMetrika />);
  expect(window.ym?.a?.[2]).toEqual([
    114100847, "hit", origin + "/about?utm_source=menu", { referer: origin + "/reset-password" },
  ]);
  expect(JSON.stringify(window.ym?.a)).not.toContain("secret-value");
  expect(JSON.stringify(window.ym?.a)).not.toContain("private");
});

it("не отправляет токен приглашения в аналитику", () => {
  route.pathname = `/team-invitations/${"a".repeat(43)}`;
  window.history.replaceState({}, "", route.pathname);
  const { rerender } = render(<YandexMetrika />);
  expect(window.ym).toBeUndefined();
  route.pathname = "/about";
  window.history.replaceState({}, "", "/about");
  rerender(<YandexMetrika />);
  expect(JSON.stringify(window.ym?.a)).not.toContain("a".repeat(43));
});
