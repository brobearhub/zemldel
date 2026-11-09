import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceTools } from "./WorkspaceTools";

it("keeps advanced statistics visible and explains both paid levels", async () => {
  vi.spyOn(global, "fetch").mockResolvedValue(
    Response.json({
      limits: {
        statistics: 0,
        templates: true,
        sharedTemplates: true,
        team: true,
      },
      templates: [],
      tasks: [],
      members: [],
      requests: [],
      stats: { services: 2, requests: 3 },
    }),
  );
  render(
    <WorkspaceTools
      providerId="provider"
      initialTab="stats"
    />,
  );
  await userEvent.click(
    await screen.findByRole("button", {
      name: "Открыть статистику услуг и конверсии",
    }),
  );
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Лайт и Бизнес");
  await userEvent.click(
    screen.getByRole("button", { name: "Статистика: По регионам" }),
  );
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "Доступно на тарифе Бизнес",
  );
  expect(
    screen.getByRole("button", { name: "Статистика: Команда" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Статистика: Этапы заявок" }),
  ).toBeInTheDocument();
  vi.restoreAllMocks();
});
