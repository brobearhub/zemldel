import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { TeamTasksWorkspace } from "./TeamTasksWorkspace";
import { taskWorkspaceFixture } from "./test-fixtures";
import type { TeamTask } from "./model";

const theme = createAppTheme("light", { cssVariables: false });
let workspace = taskWorkspaceFixture();
const fetchMock = vi.fn();
const posts: TeamTask[] = [];
let failSave = false;
const setup = () =>
  render(
    <ThemeProvider theme={theme}>
      <TeamTasksWorkspace providerId="provider" />
    </ThemeProvider>,
  );
const rows = () =>
  screen
    .queryAllByTestId(/^task-/)
    .map((row) => row.getAttribute("data-testid"));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-08T12:00:00"));
  workspace = taskWorkspaceFixture();
  posts.length = 0;
  failSave = false;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url, options?: RequestInit) => {
    if (options?.method === "POST") {
      const task = JSON.parse(options.body as string) as TeamTask;
      posts.push(task);
      if (failSave)
        return new Response(
          JSON.stringify({ message: "Не удалось сохранить" }),
          { status: 500 },
        );
      const saved = {
        ...task,
        history: [{ ...task, userId: "marina", at: new Date().toISOString() }],
      };
      workspace.tasks = [
        ...workspace.tasks.filter((item) => item.id !== saved.id),
        saved,
      ];
      return new Response(JSON.stringify(saved));
    }
    return new Response(JSON.stringify(workspace));
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("TeamTasksWorkspace", () => {
  it("preserves the day, search and completion when switching all views", async () => {
    setup();
    await screen.findByTestId("task-1");
    fireEvent.click(screen.getByRole("button", { name: "Один день" }));
    fireEvent.change(screen.getByLabelText("Дата"), {
      target: { value: "2026-11-06" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Применить" }));
    expect(rows()).toEqual(["task-1", "task-7", "task-9"]);
    fireEvent.click(screen.getByRole("button", { name: "Открытые" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Поиск по задачам" }),
      { target: { value: "Марина" } },
    );
    for (const name of ["По заявкам", "По исполнителям", "По задачам"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(rows()).toEqual(["task-1"]);
      expect(screen.getByRole("button", { name: "Один день" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(
        screen.getByRole("textbox", { name: "Поиск по задачам" }),
      ).toHaveValue("Марина");
    }
  });

  it("validates range bounds, applies inclusively and cancels draft changes", async () => {
    setup();
    await screen.findByTestId("task-1");
    fireEvent.click(screen.getByRole("button", { name: "Диапазон" }));
    fireEvent.change(screen.getByLabelText("Начало"), {
      target: { value: "2026-11-12" },
    });
    fireEvent.change(screen.getByLabelText("Конец"), {
      target: { value: "2026-11-05" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Применить" }));
    expect(
      screen.getByText("Дата окончания должна быть не раньше даты начала"),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(6);
    fireEvent.change(screen.getByLabelText("Начало"), {
      target: { value: "2026-11-05" },
    });
    fireEvent.change(screen.getByLabelText("Конец"), {
      target: { value: "2026-11-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Применить" }));
    expect(rows()).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: "Один день" }));
    fireEvent.change(screen.getByLabelText("Дата"), {
      target: { value: "2026-11-16" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(rows()).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Диапазон" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows undated and unassigned tasks and recovers from an empty search", async () => {
    setup();
    await screen.findByTestId("task-1");
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Включить без срока/ }),
    );
    expect(rows()).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: "По исполнителям" }));
    expect(
      within(
        screen.getByRole("region", { name: "Не назначены" }),
      ).getAllByTestId(/^task-/),
    ).toHaveLength(2);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Поиск по задачам" }),
      { target: { value: "не существует" } },
    );
    expect(screen.getByText("Ничего не найдено")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    expect(rows()).toHaveLength(9);
  });

  it("opens related entities, preserves filters on the assignee shortcut, and saves completion", async () => {
    setup();
    await screen.findByTestId("task-1");
    fireEvent.click(within(screen.getByTestId("task-1")).getByRole("button"));
    const details = await screen.findByRole("region", {
      name: "Детали: Проверить выписку ЕГРН",
    });
    expect(
      within(details).getByRole("link", { name: "Открыть заявку" }),
    ).toHaveAttribute("href", "/pro/requests/1284");
    expect(within(details).getByText(/Павел Усов/)).toBeInTheDocument();
    fireEvent.click(
      within(details).getByRole("button", { name: "Задачи исполнителя" }),
    );
    expect(rows().sort()).toEqual(["task-1", "task-5"]);
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Выполнить: Проверить выписку ЕГРН",
      }),
    );
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toMatchObject({
      id: "1",
      done: true,
      note: workspace.tasks.find((task) => task.id === "1")?.note,
      assigneeUserId: "marina",
      requestId: "1284",
    });
    expect(posts[0]).not.toHaveProperty("history");
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", {
          name: "Вернуть в работу: Проверить выписку ЕГРН",
        }),
      ).toBeChecked(),
    );
  });

  it("retains failed drafts and reuses their id; reveals saved tasks outside the period", async () => {
    setup();
    await screen.findByTestId("task-1");
    fireEvent.click(screen.getByRole("button", { name: "Новая задача" }));
    fireEvent.change(screen.getByLabelText(/Название задачи/), {
      target: { value: "Новое поручение" },
    });
    fireEvent.change(screen.getByLabelText("Внутренняя заметка"), {
      target: { value: "Сохранить текст" },
    });
    failSave = true;
    fireEvent.click(screen.getByRole("button", { name: "Создать задачу" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText(/Название задачи/)).toHaveValue(
      "Новое поручение",
    );
    expect(screen.getByLabelText("Внутренняя заметка")).toHaveValue(
      "Сохранить текст",
    );
    failSave = false;
    fireEvent.click(screen.getByRole("button", { name: "Создать задачу" }));
    await screen.findByText("Задача сохранена, но скрыта текущими фильтрами.");
    expect(posts[0].id).toBe(posts[1].id);
    expect(
      screen.getByRole("button", { name: "Текущая неделя" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Показать задачу" }));
    expect(screen.getByText("Вне текущих фильтров")).toBeInTheDocument();
    expect(
      await screen.findByRole("region", { name: "Детали: Новое поручение" }),
    ).toBeInTheDocument();
  });

  it("keeps downgraded workspaces readable but disables mutations", async () => {
    workspace.limits.team = false;
    setup();
    await screen.findByTestId("task-1");
    expect(screen.getByRole("button", { name: "Новая задача" })).toBeDisabled();
    expect(
      screen.getByRole("checkbox", {
        name: "Выполнить: Проверить выписку ЕГРН",
      }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "По заявкам" }));
    expect(screen.getByText(/Павел Усов/)).toBeInTheDocument();
    expect(posts).toHaveLength(0);
  });

  it("offers a real retry after a loading error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Сеть недоступна"));
    setup();
    expect(await screen.findByText("Сеть недоступна")).toBeInTheDocument();
    expect(screen.queryByText("Пока нет задач")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await screen.findByTestId("task-1");
    expect(screen.queryByText("Сеть недоступна")).not.toBeInTheDocument();
  });
});
