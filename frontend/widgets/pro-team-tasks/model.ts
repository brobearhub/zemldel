import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/ru";
import type { RequestStatus } from "@/entities/request/dto/request.dto";
import { formatRequestNumber } from "@/entities/request/lib/request-reference";

export type TeamTask = {
  id: string;
  title: string;
  note: string;
  assigneeUserId: string | null;
  requestId: string | null;
  dueAt: string | null;
  done: boolean;
  history?: TaskHistory[];
};

export type TaskHistory = Omit<TeamTask, "id" | "history"> & {
  at: string;
  userId: string;
};

export type TaskRequest = {
  id: string;
  number?: number | null;
  title: string;
  status: RequestStatus;
  customerName?: string | null;
};

export type TaskMember = { id: string; name: string };
export type TasksWorkspaceData = {
  tasks: TeamTask[];
  members: TaskMember[];
  requests: TaskRequest[];
  limits: { team: boolean };
};
export type TaskView = "tasks" | "requests" | "assignees";
export type CompletionFilter = "all" | "open" | "done";
export type TaskPeriod =
  | { kind: "all" }
  | { kind: "week" }
  | { kind: "day"; start: string }
  | { kind: "range"; start: string; end: string };
export type TaskFilters = {
  period: TaskPeriod;
  includeUndated: boolean;
  query: string;
  completion: CompletionFilter;
  assignee: string | null;
};

export function periodBounds(period: TaskPeriod, now: Dayjs) {
  if (period.kind === "all") return null;
  if (period.kind === "week") {
    const start = now.startOf("day").subtract((now.day() + 6) % 7, "day");
    return { start, end: start.add(6, "day") };
  }
  const start = dayjs(period.start).startOf("day");
  return {
    start,
    end: period.kind === "range" ? dayjs(period.end).startOf("day") : start,
  };
}

export function periodLabel(period: TaskPeriod, now: Dayjs) {
  const bounds = periodBounds(period, now);
  if (!bounds) return "Все даты";
  const { start, end } = bounds;
  const format = (date: Dayjs, pattern: string) =>
    date.locale("ru").format(pattern);
  if (start.isSame(end, "day")) return format(start, "D MMMM YYYY");
  if (start.isSame(end, "month")) {
    return `${start.date()}–${format(end, "D MMMM YYYY")}`;
  }
  return `${format(start, "D MMM YYYY")} — ${format(end, "D MMM YYYY")}`;
}

export function shiftPeriod(
  period: TaskPeriod,
  direction: number,
  now: Dayjs,
): TaskPeriod {
  const bounds = periodBounds(period, now);
  if (!bounds) return period;
  const days = bounds.end.diff(bounds.start, "day") + 1;
  const start = bounds.start.add(direction * days, "day").format("YYYY-MM-DD");
  return period.kind === "day"
    ? { kind: "day", start }
    : {
        kind: "range",
        start,
        end: bounds.end.add(direction * days, "day").format("YYYY-MM-DD"),
      };
}

export function assigneeName(id: string | null, members: TaskMember[]) {
  if (!id) return "Не назначен";
  return (
    members.find((member) => member.id === id)?.name ?? "Участник недоступен"
  );
}

export function requestLabel(request: TaskRequest) {
  return `${formatRequestNumber(request)} · ${request.title}`;
}

export function filterTasks(
  data: TasksWorkspaceData,
  filters: TaskFilters,
  now: Dayjs,
) {
  const bounds = periodBounds(filters.period, now);
  const query = filters.query.trim().toLocaleLowerCase("ru");
  const requests = new Map(
    data.requests.map((request) => [request.id, request]),
  );
  const members = new Map(
    data.members.map((member) => [member.id, member.name]),
  );
  return data.tasks
    .filter((task) => {
      if (filters.assignee !== null && task.assigneeUserId !== filters.assignee)
        return false;
      if (filters.completion === "open" && task.done) return false;
      if (filters.completion === "done" && !task.done) return false;
      if (bounds) {
        if (!task.dueAt && !filters.includeUndated) return false;
        if (task.dueAt) {
          const due = dayjs(task.dueAt);
          if (
            !due.isValid() ||
            due.isBefore(bounds.start) ||
            due.isAfter(bounds.end.endOf("day"))
          )
            return false;
        }
      }
      const request = task.requestId ? requests.get(task.requestId) : null;
      return (
        !query ||
        [
          task.title,
          request?.title,
          request?.id,
          request?.customerName,
          members.get(task.assigneeUserId ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(query)
      );
    })
    .sort((a, b) => {
      if (!a.dueAt && b.dueAt) return 1;
      if (a.dueAt && !b.dueAt) return -1;
      const difference =
        a.dueAt && b.dueAt ? Date.parse(a.dueAt) - Date.parse(b.dueAt) : 0;
      return (
        difference ||
        a.title.localeCompare(b.title, "ru") ||
        a.id.localeCompare(b.id)
      );
    });
}

export function groupTasks(tasks: TeamTask[], view: TaskView) {
  const groups = new Map<string, TeamTask[]>();
  for (const task of tasks) {
    const key =
      view === "tasks"
        ? task.dueAt
          ? "dated"
          : "undated"
        : view === "requests"
          ? (task.requestId ?? "unlinked")
          : (task.assigneeUserId ?? "unassigned");
    const group = groups.get(key) ?? [];
    group.push(task);
    groups.set(key, group);
  }
  return [...groups].sort(([a], [b]) => {
    const missing = (key: string) =>
      ["undated", "unlinked", "unassigned"].includes(key) ? 1 : 0;
    return missing(a) - missing(b);
  });
}

export function taskInput(task: TeamTask) {
  return {
    id: task.id,
    title: task.title.trim(),
    note: task.note,
    assigneeUserId: task.assigneeUserId,
    requestId: task.requestId,
    dueAt: task.dueAt,
    done: task.done,
  };
}
