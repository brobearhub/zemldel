import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { STORY_TEXT_MAX_LENGTH } from "@/entities/story";
import { StoryEditorSection } from "./StoryEditorSection";

const emptyInsights = {
  viewCount: 0,
  guestViewCount: 0,
  uniqueViewerCount: 0,
  hourly: [],
  viewers: [],
  guestViews: [],
  cities: [],
  profileOpenCount: 0,
  guestProfileOpenCount: 0,
  profileOpens: [],
  guestProfileOpens: [],
  replies: [],
  reposts: [],
  saveCount: 0,
  saves: [],
};

function paletteValue(element: Element, name: string): string {
  let node: Element | null = element;
  while (node) {
    const value = window.getComputedStyle(node).getPropertyValue(name).trim();
    if (value) return value;
    node = node.parentElement;
  }
  return "";
}

function json(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body)));
}

describe("StoryEditorSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("публикует текст и выбранный срок", async () => {
    const created = {
      id: "story-1",
      authorType: "USER",
      authorName: "Анна",
      authorImageUrl: null,
      authorHref: null,
      cityId: null,
      text: "Ищу инженера",
      imageUrl: null,
      durationDays: 3,
      publishedAt: "2026-10-06T10:00:00.000Z",
      expiresAt: "2026-10-09T10:00:00.000Z",
      expired: false,
    };
    let published = false;
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (init?.method === "POST") {
        published = true;
        return json(created);
      }
      if (url.includes("/insights")) return json(emptyInsights);
      if (url.includes("/saved") || url.includes("/audience")) {
        return json(url.includes("/audience") ? { followers: [], unfollows: [] } : { items: [] });
      }
      return json({ items: published ? [created] : [] });
    });

    render(<StoryEditorSection scope="user" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Новая" }));
    await user.type(screen.getByLabelText("Текст"), "Ищу инженера");
    await user.click(screen.getByRole("button", { name: "3 д" }));
    await user.click(screen.getByRole("button", { name: "Опубликовать" }));

    await screen.findByText("Ищу инженера");
    const createCall = fetchMock.mock.calls.find((call) => call[1] && typeof call[1] === "object" && "method" in call[1] && call[1].method === "POST");
    expect(createCall?.[0]).toBe("/api/stories");
    const body = createCall?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("text")).toBe("Ищу инженера");
    expect((body as FormData).get("durationDays")).toBe("3");
    expect((body as FormData).get("scope")).toBe("user");
  });

  it("вставка длинного текста обрезается до лимита и уходит в публикацию", async () => {
    const pasted = "у".repeat(3000);
    const kept = pasted.slice(0, STORY_TEXT_MAX_LENGTH);
    const created = {
      id: "story-long",
      authorType: "USER",
      authorName: "Анна",
      authorImageUrl: null,
      authorHref: null,
      cityId: null,
      text: kept,
      imageUrl: null,
      durationDays: 1,
      publishedAt: "2026-10-06T10:00:00.000Z",
      expiresAt: "2026-10-07T10:00:00.000Z",
      expired: false,
    };
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (init?.method === "POST") return json(created);
      if (url.includes("/insights")) return json(emptyInsights);
      if (url.includes("/saved") || url.includes("/audience")) {
        return json(url.includes("/audience") ? { followers: [], unfollows: [] } : { items: [] });
      }
      return json({ items: [] });
    });

    render(<StoryEditorSection scope="user" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Новая" }));
    const field = screen.getByLabelText("Текст");
    await user.click(field);
    await user.paste(pasted);

    expect(field).toHaveValue(kept);
    expect(screen.getByText(`${STORY_TEXT_MAX_LENGTH} / ${STORY_TEXT_MAX_LENGTH}`)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Опубликовать" }));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        (call) => call[1] && typeof call[1] === "object" && "method" in call[1] && call[1].method === "POST",
      );
      expect(createCall).toBeTruthy();
      const body = createCall?.[1]?.body;
      expect(body).toBeInstanceOf(FormData);
      expect((body as FormData).get("text")).toBe(kept);
    });
  });

  it("сначала показывает свои сторис, форма закрыта", async () => {
    const created = {
      id: "story-1",
      authorType: "USER" as const,
      authorName: "Анна",
      authorImageUrl: null,
      authorHref: null,
      cityId: null,
      text: "Продаю участок за 5000 ₽",
      imageUrl: "https://cdn.example/story.jpg",
      durationDays: 1 as const,
      publishedAt: "2026-10-06T10:00:00.000Z",
      expiresAt: "2026-10-08T06:00:00.000Z",
      expired: false,
    };
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/insights")) return json(emptyInsights);
      if (url.includes("/saved")) return json({ items: [] });
      if (url.includes("/audience")) return json({ followers: [], unfollows: [] });
      return json({ items: [created] });
    });

    render(<StoryEditorSection scope="user" />);

    const card = await screen.findByRole("button", { name: "Продаю участок за 5000 ₽", exact: true });
    expect(card.querySelector("img")).toHaveAttribute("src", "https://cdn.example/story.jpg");
    expect(screen.queryByRole("button", { name: "Завершена" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Сохранена" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Текст")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Новая" }));
    expect(screen.queryByRole("button", { name: "Продаю участок за 5000 ₽", exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("Загрузить фото")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Новая история" })).toBeInTheDocument();
  });

  it("крестик отменяет создание и сбрасывает черновик", async () => {
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/insights")) return json(emptyInsights);
      if (url.includes("/saved")) return json({ items: [] });
      if (url.includes("/audience")) return json({ followers: [], unfollows: [] });
      return json({ items: [] });
    });

    render(<StoryEditorSection scope="user" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Новая" }));
    await user.type(screen.getByLabelText("Текст"), "Черновик");
    await user.click(screen.getByRole("button", { name: "3 д" }));
    await user.click(screen.getByRole("button", { name: "Отменить" }));

    expect(screen.queryByLabelText("Текст")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Новая история" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Новая" }));
    expect(screen.getByLabelText("Текст")).toHaveValue("");
    expect(screen.getByRole("button", { name: "1 д" })).toHaveAttribute("aria-pressed", "true");
  });

  it("показывает счётчики показа и аудитории", async () => {
    const created = {
      id: "story-1",
      authorType: "USER" as const,
      authorName: "Анна",
      authorImageUrl: null,
      authorHref: null,
      cityId: null,
      text: "Продаю участок за 5000 ₽",
      imageUrl: "https://cdn.example/story.jpg",
      durationDays: 1 as const,
      publishedAt: "2026-10-06T10:00:00.000Z",
      expiresAt: "2026-10-08T06:00:00.000Z",
      expired: false,
    };
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/insights")) return json(emptyInsights);
      if (url.includes("/saved")) return json({ items: [] });
      if (url.includes("/audience")) {
        return json({
          followers: [{ userId: "u1", name: "Pavel Usov", at: "2026-10-07T10:00:00.000Z" }],
          unfollows: [],
          replyCount: 4,
        });
      }
      return json({ items: [created] });
    });

    render(<StoryEditorSection scope="user" />);

    await screen.findByText("Pavel Usov");
    const liveCard = screen.getByRole("button", { name: "Мои истории 1" });
    const createTile = screen.getByRole("button", { name: "Новая" });
    const insightsHeading = await screen.findByRole("heading", { name: "Статистика" });
    expect(createTile.compareDocumentPosition(liveCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(liveCard.compareDocumentPosition(insightsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(liveCard).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "Подписались 1" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Отписались 0" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Ответы 4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сохраненные истории 0" })).toHaveAttribute("aria-pressed", "false");
  });

  it("открывает сохраненные истории с карточки и подсвечивает её", async () => {
    const liveStory = {
      id: "story-live",
      authorType: "USER" as const,
      authorName: "Анна",
      authorImageUrl: null,
      authorHref: null,
      cityId: null,
      text: "В эфире",
      imageUrl: null,
      durationDays: 1 as const,
      publishedAt: "2026-10-06T10:00:00.000Z",
      expiresAt: "2026-10-08T06:00:00.000Z",
      expired: false,
    };
    const savedStory = {
      ...liveStory,
      id: "story-saved",
      text: "Закладка",
      expired: true,
    };
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/insights")) return json(emptyInsights);
      if (url.includes("/saved")) return json({ items: [savedStory] });
      if (url.includes("/audience")) return json({ followers: [], unfollows: [], replyCount: 0 });
      return json({ items: [liveStory] });
    });

    render(
      <ThemeProvider theme={createAppTheme("light")}>
        <StoryEditorSection scope="user" />
      </ThemeProvider>,
    );
    const user = userEvent.setup();
    const savedCard = await screen.findByRole("button", { name: "Сохраненные истории 1" });
    const mineCard = screen.getByRole("button", { name: "Мои истории 1" });

    expect(screen.queryByRole("button", { name: "Сохранена" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "В эфире", exact: true })).toBeInTheDocument();
    expect(mineCard).toHaveAttribute("aria-pressed", "true");
    expect(savedCard).toHaveAttribute("aria-pressed", "false");

    await user.click(savedCard);
    expect(savedCard).toHaveAttribute("aria-pressed", "true");
    expect(mineCard).toHaveAttribute("aria-pressed", "false");
    expect(window.getComputedStyle(savedCard).backgroundColor).toBe("var(--mui-palette-text-primary)");
    expect(paletteValue(savedCard, "--mui-palette-text-primary")).toBe("#325e49");
    expect(screen.getByRole("button", { name: "Закладка", exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "В эфире", exact: true })).not.toBeInTheDocument();

    await user.click(mineCard);
    expect(mineCard).toHaveAttribute("aria-pressed", "true");
    expect(savedCard).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "В эфире", exact: true })).toBeInTheDocument();
  });

  it("сразу показывает статистику первой истории и переключает выбор", async () => {
    const stories = [
      {
        id: "story-1",
        authorType: "USER" as const,
        authorName: "Анна",
        authorImageUrl: null,
        authorHref: null,
        cityId: null,
        text: "Первая",
        imageUrl: null,
        durationDays: 1 as const,
        publishedAt: "2026-10-06T10:00:00.000Z",
        expiresAt: "2026-10-08T06:00:00.000Z",
        expired: false,
      },
      {
        id: "story-2",
        authorType: "USER" as const,
        authorName: "Анна",
        authorImageUrl: null,
        authorHref: null,
        cityId: null,
        text: "Вторая",
        imageUrl: null,
        durationDays: 1 as const,
        publishedAt: "2026-10-06T11:00:00.000Z",
        expiresAt: "2026-10-08T07:00:00.000Z",
        expired: false,
      },
    ];
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/insights")) return json(emptyInsights);
      if (url.includes("/saved")) return json({ items: [] });
      if (url.includes("/audience")) return json({ followers: [], unfollows: [] });
      return json({ items: stories });
    });

    render(<StoryEditorSection scope="user" />);

    const first = await screen.findByRole("button", { name: "Первая", exact: true });
    const second = screen.getByRole("button", { name: "Вторая", exact: true });
    const heading = screen.getByRole("heading", { name: "Статистика" });
    expect(first).toHaveAttribute("aria-current", "true");
    expect(second).not.toHaveAttribute("aria-current");
    expect(first.parentElement).toHaveStyle({ opacity: "1", filter: "none" });
    expect(second.parentElement).toHaveStyle({ opacity: "0.5", filter: "saturate(0.7)" });
    expect(heading.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/stories/story-1/insights"))).toBe(true);
    });
    const views = await screen.findByText("просмотров");
    expect(first.compareDocumentPosition(views) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const user = userEvent.setup();
    await user.click(second);
    expect(screen.getByRole("button", { name: "Вторая", exact: true })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Первая", exact: true })).not.toHaveAttribute("aria-current");
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/stories/story-2/insights"))).toBe(true);
    });
  });

  it("показывает превью выбранного фото", async () => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ items: [] })));

    render(<StoryEditorSection scope="user" authorName="Анна" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Новая" }));
    await user.type(screen.getByLabelText("Текст"), "Продам за бесценок");

    const file = new File(["img"], "03.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Добавить фото"), file);

    const preview = await screen.findByRole("img", { name: "Превью фото" });
    expect(preview).toHaveAttribute("src", "blob:preview");
    expect(preview.parentElement).toHaveTextContent("Анна");
    expect(preview.parentElement).toHaveTextContent("Продам за бесценок");
  });
});
