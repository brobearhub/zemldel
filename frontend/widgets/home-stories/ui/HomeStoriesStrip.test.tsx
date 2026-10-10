import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { HomeStoriesStrip } from "./HomeStoriesStrip";
import { authReducer, type AuthUser } from "@/core/store/authSlice";
import { CitySelectProvider } from "@/features/select-city";
import type { StoryDto } from "@/entities/story";

const PROVIDER_ID = "11111111-1111-4111-8111-111111111111";

function renderStrip(providerId?: string, signedIn = false, user: AuthUser | null = null) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        status: signedIn ? ("authenticated" as const) : ("unauthenticated" as const),
        user: signedIn ? user : null,
        error: null,
      },
    },
  });
  return render(
    <Provider store={store}>
      <CitySelectProvider>
        <HomeStoriesStrip providerId={providerId} />
      </CitySelectProvider>
    </Provider>,
  );
}

const story: StoryDto = {
  id: "story-1",
  authorType: "USER",
  authorName: "Анна",
  authorImageUrl: null,
  authorHref: null,
  cityId: null,
  text: "Ищу кадастрового инженера",
  imageUrl: null,
  durationDays: 1,
  publishedAt: "2026-10-06T10:00:00.000Z",
  expiresAt: "2026-10-07T10:00:00.000Z",
  expired: false,
};

function rect(top: number, height: number): DOMRect {
  return {
    top,
    left: 0,
    right: 100,
    bottom: top + height,
    width: 100,
    height,
    x: 0,
    y: top,
    toJSON() {
      return {};
    },
  };
}

function placeSlides(scroller: HTMLElement, tops: Record<string, number>) {
  Object.defineProperty(scroller, "clientHeight", { configurable: true, get: () => 800 });
  vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(rect(0, 800));
  for (const [id, top] of Object.entries(tops)) {
    const slide = scroller.querySelector<HTMLElement>(`[data-story-id="${id}"]`);
    if (!slide) throw new Error(`Нет кадра ${id}`);
    vi.spyOn(slide, "getBoundingClientRect").mockReturnValue(rect(top, 800));
  }
}

describe("HomeStoriesStrip", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("на странице провайдера запрашивает только его сторис", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ items: [] })));
    renderStrip(PROVIDER_ID);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(`/api/stories?providerId=${PROVIDER_ID}`);
  });

  it("не рисует полосу, если сторис нет", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ items: [] })));
    const { container } = renderStrip();
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("открывает модалку с текстом кликнутой сторис", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ items: [story] })));
    renderStrip();
    const user = userEvent.setup();
    const button = await screen.findByRole("button", { name: /анна/i });
    await user.click(button);
    expect(await screen.findByText("Ищу кадастрового инженера")).toBeInTheDocument();
  });

  it("закрывает просмотр по крестику и по клику на фон", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ items: [story] })));
    renderStrip();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /анна/i }));
    expect(await screen.findByText("Ищу кадастрового инженера")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Закрыть" }));
    await waitFor(() => expect(screen.queryByText("Ищу кадастрового инженера")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /анна/i }));
    expect(await screen.findByText("Ищу кадастрового инженера")).toBeInTheDocument();
    const backdrop = document.querySelector("[data-story-id]");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    await waitFor(() => expect(screen.queryByText("Ищу кадастрового инженера")).not.toBeInTheDocument());
  });

  it("открывает кликнутый кружок и после загрузки фото подгружает соседей", async () => {
    class SilentObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", SilentObserver);
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            { ...story, id: "s1", authorName: "Анна", text: "Первая", imageUrl: "https://cdn.example/1.jpg" },
            { ...story, id: "s2", authorName: "Борис", text: "Вторая", imageUrl: "https://cdn.example/2.jpg" },
            { ...story, id: "s3", authorName: "Вера", text: "Третья", imageUrl: "https://cdn.example/3.jpg" },
            { ...story, id: "s4", authorName: "Глеб", text: "Четвёртая", imageUrl: "https://cdn.example/4.jpg" },
          ],
        }),
      ),
    );
    renderStrip();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /борис/i }));

    const opened = await screen.findByRole("img", { name: "Фото истории" });
    expect(opened).toHaveAttribute("src", "https://cdn.example/2.jpg");
    expect(document.querySelector('[data-story-id="s2"]')).toBeTruthy();

    fireEvent.load(opened);

    await waitFor(() => {
      const srcs = screen.getAllByRole("img", { name: "Фото истории" }).map((node) => node.getAttribute("src"));
      expect(srcs).toEqual(["https://cdn.example/1.jpg", "https://cdn.example/2.jpg", "https://cdn.example/3.jpg"]);
    });
  });

  it("сторис без фото сразу подгружает кадры сверху и снизу", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            { ...story, id: "s1", authorName: "Анна", text: "Первая", imageUrl: "https://cdn.example/1.jpg" },
            { ...story, id: "s2", authorName: "Борис", text: "Вторая", imageUrl: null },
            { ...story, id: "s3", authorName: "Вера", text: "Третья", imageUrl: "https://cdn.example/3.jpg" },
          ],
        }),
      ),
    );
    renderStrip();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /борис/i }));
    await waitFor(() => {
      const srcs = screen.getAllByRole("img", { name: "Фото истории" }).map((node) => node.getAttribute("src"));
      expect(srcs).toEqual(["https://cdn.example/1.jpg", "https://cdn.example/3.jpg"]);
    });
  });

  it("отмечает просмотренной только историю в центре и шлёт запрос при перелистывании", async () => {
    const anna = { ...story, id: "story-a", authorName: "Анна", text: "Первая" };
    const boris = { ...story, id: "story-b", authorName: "Борис", text: "Вторая" };
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/view")) return new Response(JSON.stringify({ ok: true, counted: true }));
      return new Response(JSON.stringify({ items: [anna, boris] }));
    });
    renderStrip(undefined, true);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /анна/i }));
    expect(await screen.findByText("Первая")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /анна/i, hidden: true })).toHaveAttribute("data-viewed", "true"),
    );
    expect(screen.getByRole("button", { name: /борис/i, hidden: true })).toHaveAttribute("data-viewed", "false");

    const scroller = document.querySelector("[data-story-id]")?.parentElement as HTMLElement;
    placeSlides(scroller, { "story-a": 0, "story-b": 800 });
    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
    });
    act(() => {
      scroller.dispatchEvent(new Event("scrollend"));
    });
    expect(screen.getByRole("button", { name: /борис/i, hidden: true })).toHaveAttribute("data-viewed", "false");
    expect(fetchSpy.mock.calls.map(([url]) => String(url)).filter((url) => url.endsWith("/view"))).toEqual([
      "/api/stories/story-a/view",
    ]);

    placeSlides(scroller, { "story-a": -800, "story-b": 0 });
    act(() => {
      scroller.dispatchEvent(new Event("scrollend"));
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /борис/i, hidden: true })).toHaveAttribute("data-viewed", "true"),
    );
    expect(fetchSpy.mock.calls.map(([url]) => String(url)).filter((url) => url.endsWith("/view"))).toEqual([
      "/api/stories/story-a/view",
      "/api/stories/story-b/view",
    ]);

    await user.click(screen.getAllByRole("button", { name: "Закрыть" })[0]!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /анна/i })).toHaveAttribute("data-viewed", "true");
    expect(screen.getByRole("button", { name: /борис/i })).toHaveAttribute("data-viewed", "true");
  });

  it("клик по кадру прячет подписи только у этой сторис", async () => {
    const anna = { ...story, id: "story-a", authorName: "Анна", text: "Первая" };
    const boris = { ...story, id: "story-b", authorName: "Борис", text: "Вторая" };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ items: [anna, boris] })));
    renderStrip();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /анна/i }));
    expect(await screen.findByText("Первая")).toBeInTheDocument();
    expect(screen.getByText("Вторая")).toBeInTheDocument();

    const surface = (id: string) => {
      const slide = document.querySelector(`[data-story-id="${id}"]`);
      const node = slide?.firstElementChild;
      if (!(node instanceof HTMLElement)) throw new Error(`Нет кадра ${id}`);
      return node;
    };
    const chrome = (id: string) => {
      const node = document.querySelector(`[data-story-id="${id}"] [data-story-chrome]`);
      if (!(node instanceof HTMLElement)) throw new Error(`Нет подписи ${id}`);
      return node;
    };

    fireEvent.click(surface("story-a"));
    expect(chrome("story-a")).toHaveAttribute("data-story-chrome", "hidden");
    expect(chrome("story-b")).toHaveAttribute("data-story-chrome", "visible");
    expect(screen.getByRole("button", { name: "Закрыть" })).toBeVisible();

    fireEvent.click(surface("story-b"));
    expect(chrome("story-b")).toHaveAttribute("data-story-chrome", "hidden");
    expect(chrome("story-a")).toHaveAttribute("data-story-chrome", "hidden");

    fireEvent.click(surface("story-a"));
    expect(chrome("story-a")).toHaveAttribute("data-story-chrome", "visible");
    expect(chrome("story-b")).toHaveAttribute("data-story-chrome", "hidden");
  });

  it("на своей сторис сразу открывает поле комментария", async () => {
    const mine = { ...story, id: "mine", authorUserId: "user-1", authorName: "Анна", text: "Мой текст" };
    const other = { ...story, id: "other", authorUserId: "user-2", authorName: "Борис", text: "Чужой текст" };
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/comments")) {
        return Promise.resolve(new Response(JSON.stringify({ items: [], truncated: false })));
      }
      return Promise.resolve(new Response(JSON.stringify({ items: [mine, other] })));
    });
    renderStrip(undefined, true, {
      id: "user-1",
      email: null,
      name: "Анна",
      image: null,
      phone: null,
      systemRole: "CUSTOMER",
      activeProviderId: null,
      customerCity: null,
      memberships: [],
      linkedAuthProviders: [],
      stepUpVerifiedAt: {},
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /анна/i }));

    const ownSlide = document.querySelector('[data-story-id="mine"]');
    const otherSlide = document.querySelector('[data-story-id="other"]');
    if (!(ownSlide instanceof HTMLElement) || !(otherSlide instanceof HTMLElement)) {
      throw new Error("Нет кадров сторис");
    }

    expect(within(ownSlide).getByText("Анна")).toBeInTheDocument();
    expect(within(ownSlide).getByText("Мой текст")).toBeInTheDocument();
    expect(within(ownSlide).getByRole("button", { name: "Комментировать" })).toBeInTheDocument();
    expect(within(ownSlide).queryByRole("button", { name: "Написать" })).not.toBeInTheDocument();
    expect(within(ownSlide).queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
    expect(within(ownSlide).queryByRole("button", { name: "Подписаться" })).not.toBeInTheDocument();

    expect(within(otherSlide).getByRole("button", { name: "Написать" })).toBeInTheDocument();
    expect(within(otherSlide).getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
    expect(within(otherSlide).queryByRole("button", { name: "Репост" })).not.toBeInTheDocument();

    await user.click(within(ownSlide).getByRole("button", { name: "Комментировать" }));
    expect(within(ownSlide).getByPlaceholderText("Комментарий")).toBeInTheDocument();
    expect(within(ownSlide).getByRole("button", { name: "Отправить комментарий" })).toBeInTheDocument();
  });

  it("показывает фото портретным кадром, а не фоном экрана", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [{ ...story, imageUrl: "https://cdn.example/story.jpg" }] })),
    );
    renderStrip();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /анна/i }));
    const image = await screen.findByRole("img", { name: "Фото истории" });
    expect(image).toHaveAttribute("src", "https://cdn.example/story.jpg");
  });

  it("в раскрытой истории поле появляется после выбора комментария", async () => {
    const other = { ...story, id: "other", authorUserId: "user-2", authorName: "Борис", text: "Чужой текст" };
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/comments")) {
        return Promise.resolve(new Response(JSON.stringify({ items: [], truncated: false })));
      }
      return Promise.resolve(new Response(JSON.stringify({ items: [other] })));
    });
    renderStrip(undefined, true, {
      id: "user-1",
      email: null,
      name: "Анна",
      image: null,
      phone: null,
      systemRole: "CUSTOMER",
      activeProviderId: null,
      customerCity: null,
      memberships: [],
      linkedAuthProviders: [],
      stepUpVerifiedAt: {},
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /борис/i }));

    const slide = document.querySelector('[data-story-id="other"]');
    if (!(slide instanceof HTMLElement)) throw new Error("Нет кадра сторис");

    await user.click(within(slide).getByRole("button", { name: "Написать" }));

    expect(within(slide).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(slide).getByRole("button", { name: "Комментировать" })).toBeInTheDocument();
    expect(within(slide).getByRole("button", { name: "Ответить" })).toBeInTheDocument();

    await user.click(within(slide).getByRole("button", { name: "Комментировать" }));

    expect(within(slide).getByPlaceholderText("Комментарий")).toBeInTheDocument();
    expect(within(slide).getByRole("button", { name: "Отправить комментарий" })).toBeInTheDocument();
    expect(within(slide).queryByRole("button", { name: "Комментировать" })).not.toBeInTheDocument();
    expect(within(slide).queryByRole("button", { name: "Ответить" })).not.toBeInTheDocument();

    await user.click(within(slide).getByRole("button", { name: "Отменить" }));

    expect(within(slide).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(slide).getByRole("button", { name: "Комментировать" })).toBeInTheDocument();
    expect(within(slide).getByRole("button", { name: "Ответить" })).toBeInTheDocument();

    await user.click(within(slide).getByRole("button", { name: "Закрыть комментарии" }));

    expect(within(slide).queryByRole("button", { name: "Закрыть комментарии" })).not.toBeInTheDocument();
    expect(within(slide).queryByRole("button", { name: "Комментировать" })).not.toBeInTheDocument();
    expect(within(slide).getByRole("button", { name: "Написать" })).toBeInTheDocument();
  });
});
