import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StoryInsightsDto } from "@/entities/story";
import { StoryInsightsPanel } from "./StoryInsightsPanel";

const insights: StoryInsightsDto = {
  viewCount: 3,
  guestViewCount: 0,
  uniqueViewerCount: 1,
  hourly: [],
  viewers: [
    {
      userId: "u1",
      name: "Pavel Usov",
      viewCount: 3,
      lastViewedAt: new Date().toISOString(),
      cityName: "Екатеринбург",
    },
  ],
  guestViews: [],
  cities: [],
  profileOpenCount: 0,
  guestProfileOpenCount: 0,
  profileOpens: [],
  guestProfileOpens: [],
  replies: [],
  comments: [],
  saveCount: 0,
  saves: [],
};

describe("StoryInsightsPanel", () => {
  it("показывает людей выбранной метрики справа", () => {
    render(<StoryInsightsPanel insights={insights} />);

    expect(screen.getByRole("button", { name: /Пользователи/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Pavel Usov")).toBeInTheDocument();
    expect(screen.getByText(/Екатеринбург/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Скрыть" })).not.toBeInTheDocument();
  });

  it("открывает переписку по ответу и отправляет сообщение", async () => {
    const onSendReply = vi.fn();
    render(
      <StoryInsightsPanel
        insights={{
          ...insights,
          replies: [
            {
              id: "reply-1",
              authorUserId: "u2",
              text: "Очень красиво! Где это?",
              name: "Анна Ким",
              cityName: "Москва",
              createdAt: new Date().toISOString(),
            },
          ],
        }}
        storyText="Закат на Исети"
        replyMessages={[{ id: "m1", text: "Спасибо", createdAt: new Date().toISOString(), mine: true }]}
        onSendReply={onSendReply}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Ответы/ }));
    await user.click(screen.getByRole("button", { name: /Анна Ким/ }));

    expect(screen.getByText("История · Закат на Исети")).toBeInTheDocument();
    expect(screen.getByText("Очень красиво! Где это?")).toBeInTheDocument();
    expect(screen.getByText("Спасибо")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Написать сообщение..."), "Ещё фото");
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    expect(onSendReply).toHaveBeenCalledWith("Ещё фото");
    expect(screen.getByPlaceholderText("Написать сообщение...")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Назад" }));
    expect(screen.queryByPlaceholderText("Написать сообщение...")).not.toBeInTheDocument();
    expect(screen.getByText("«Очень красиво! Где это?»")).toBeInTheDocument();
  });
});
