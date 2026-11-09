import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { NewStoryComposer } from "./NewStoryComposer";
import type { StoryLimits } from "@/entities/story";

const base: StoryLimits = {
  plan: "STANDARD",
  dailyLimit: 1,
  used: 0,
  durationHours: [24],
  textLimit: 500,
  textFormat: "PLAIN",
  video: false,
  timezone: "Europe/Moscow",
  resetAt: "2099-01-01T00:00:00Z",
};
const callbacks = {
  onText: vi.fn(),
  onDuration: vi.fn(),
  onPublish: vi.fn(),
  onCancel: vi.fn(),
};

describe("tariff-aware story composer", () => {
  it("keeps all durations and formatting visible on every plan", () => {
    const { rerender } = render(
      <NewStoryComposer
        {...callbacks}
        text="История"
        limits={base}
        durationHours={24}
        busy={false}
      />,
    );
    expect(screen.getByRole("button", { name: "24 ч" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "48 ч" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Жирный" }),
    ).toBeInTheDocument();
    rerender(
      <NewStoryComposer
        {...callbacks}
        text="История"
        limits={{
          ...base,
          plan: "LITE",
          durationHours: [24, 48],
          textFormat: "BASIC",
        }}
        durationHours={24}
        busy={false}
      />,
    );
    expect(screen.getByRole("button", { name: "48 ч" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Жирный" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ссылка" }),
    ).toBeInTheDocument();
    rerender(
      <NewStoryComposer
        {...callbacks}
        text="История"
        limits={{
          ...base,
          plan: "BUSINESS",
          durationHours: [6, 12, 24, 48],
          textFormat: "LINKS",
        }}
        durationHours={24}
        busy={false}
      />,
    );
    expect(screen.getByRole("button", { name: "6 ч" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "12 ч" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ссылка" })).toBeInTheDocument();
  });
  it("explains locked formatting and duration without changing the draft", async () => {
    callbacks.onText.mockClear();
    callbacks.onDuration.mockClear();
    render(
      <NewStoryComposer
        {...callbacks}
        text="История"
        limits={base}
        durationHours={24}
        busy={false}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Жирный" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Лайт и Бизнес",
    );
    expect(callbacks.onText).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "6 ч" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Бизнес");
    expect(callbacks.onDuration).not.toHaveBeenCalled();
  });
  it("explains the exhausted quota without publishing", async () => {
    render(
      <NewStoryComposer
        {...callbacks}
        text="История"
        limits={{ ...base, used: 1 }}
        durationHours={24}
        busy={false}
      />,
    );
    callbacks.onPublish.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Опубликовать" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "До 5 — на Лайте, до 20 — на Бизнесе",
    );
    expect(callbacks.onPublish).not.toHaveBeenCalled();
  });
});
