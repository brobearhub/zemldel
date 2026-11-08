import dayjs from "dayjs";
import type { TasksWorkspaceData } from "./model";

export const fixtureNow = dayjs("2026-11-08T12:00:00");
export function taskWorkspaceFixture(): TasksWorkspaceData {
  return {
    limits: { team: true },
    members: [
      { id: "marina", name: "Марина Орлова" },
      { id: "ivan", name: "Иван Соколов" },
      { id: "alexey", name: "Алексей Петров" },
    ],
    requests: [
      {
        id: "1284",
        title: "Межевание участка",
        status: "DISCUSSING",
        customerName: "Павел Усов",
      },
      {
        id: "1287",
        title: "Уточнение границ",
        status: "ACTIVE",
        customerName: "Анна Смирнова",
      },
      {
        id: "1291",
        title: "Межевой план",
        status: "ACTIVE",
        customerName: "Сергей Волков",
      },
      {
        id: "1295",
        title: "Разрешение на строительство",
        status: "NEW",
        customerName: "Ольга Белова",
      },
    ],
    tasks: [
      {
        id: "1",
        title: "Проверить выписку ЕГРН",
        assigneeUserId: "marina",
        requestId: "1284",
        dueAt: "2026-11-06T10:00:00",
        done: false,
      },
      {
        id: "2",
        title: "Согласовать дату выезда",
        assigneeUserId: "ivan",
        requestId: "1287",
        dueAt: "2026-11-08T14:00:00",
        done: false,
      },
      {
        id: "3",
        title: "Запросить документы у клиента",
        assigneeUserId: null,
        requestId: "1295",
        dueAt: "2026-11-07T12:00:00",
        done: false,
      },
      {
        id: "4",
        title: "Подготовить межевой план",
        assigneeUserId: "alexey",
        requestId: "1291",
        dueAt: "2026-11-11T18:00:00",
        done: false,
      },
      {
        id: "5",
        title: "Отправить схему участка",
        assigneeUserId: "marina",
        requestId: "1284",
        dueAt: "2026-11-08T11:00:00",
        done: true,
      },
      {
        id: "6",
        title: "Обновить шаблон ответа",
        assigneeUserId: null,
        requestId: null,
        dueAt: null,
        done: false,
      },
      {
        id: "7",
        title: "Проверить доверенность",
        assigneeUserId: "ivan",
        requestId: "1287",
        dueAt: "2026-11-06T16:00:00",
        done: false,
      },
      {
        id: "8",
        title: "Подготовить памятку клиенту",
        assigneeUserId: "marina",
        requestId: null,
        dueAt: "2026-11-10T12:00:00",
        done: false,
      },
      {
        id: "9",
        title: "Проверить черновик плана",
        assigneeUserId: "alexey",
        requestId: "1291",
        dueAt: "2026-11-06T18:00:00",
        done: true,
      },
    ].map((task) => ({
      ...task,
      dueAt: task.dueAt ? dayjs(task.dueAt).toISOString() : null,
      note:
        task.id === "1" ? "Сверить собственника и площадь с заявлением." : "",
      history: [],
    })),
  };
}
