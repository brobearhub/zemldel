import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  filterTasks,
  groupTasks,
  periodBounds,
  shiftPeriod,
  type TaskFilters,
  type TaskPeriod,
  type TaskView,
} from "./model";
import { fixtureNow, taskWorkspaceFixture } from "./test-fixtures";

const filters: TaskFilters = {
  period: { kind: "week" },
  includeUndated: false,
  query: "",
  completion: "all",
  assignee: null,
};

describe("task periods and grouping", () => {
  it.each([
    [{ kind: "week" }, ["1", "7", "9", "3", "5", "2"]],
    [{ kind: "day", start: "2026-11-06" }, ["1", "7", "9"]],
    [
      { kind: "range", start: "2026-11-05", end: "2026-11-12" },
      ["1", "7", "9", "3", "5", "2", "8", "4"],
    ],
  ] as [TaskPeriod, string[]][])(
    "keeps the same task set in all three views for %j",
    (period, ids) => {
      const selected = filterTasks(
        taskWorkspaceFixture(),
        { ...filters, period },
        fixtureNow,
      );
      expect(selected.map((task) => task.id)).toEqual(ids);
      for (const view of ["tasks", "requests", "assignees"] as TaskView[]) {
        const groupedIds = groupTasks(selected, view).flatMap(([, tasks]) =>
          tasks.map((task) => task.id),
        );
        expect(groupedIds.sort()).toEqual([...ids].sort());
        expect(new Set(groupedIds).size).toBe(ids.length);
      }
    },
  );

  it("includes local calendar boundaries, including the final millisecond", () => {
    const data = taskWorkspaceFixture();
    data.tasks = [
      "2026-11-05T23:59:59.999",
      "2026-11-06T00:00:00",
      "2026-11-06T23:59:59.999",
      "2026-11-07T00:00:00",
    ].map((date, index) => ({
      ...data.tasks[0],
      id: String(index),
      dueAt: dayjs(date).toISOString(),
    }));
    expect(
      filterTasks(
        data,
        { ...filters, period: { kind: "day", start: "2026-11-06" } },
        fixtureNow,
      ).map((task) => task.id),
    ).toEqual(["1", "2"]);
  });

  it("uses Monday through Sunday across years and shifts inclusive ranges", () => {
    const bounds = periodBounds({ kind: "week" }, dayjs("2027-01-03"))!;
    expect(bounds.start.format("YYYY-MM-DD")).toBe("2026-12-28");
    expect(bounds.end.format("YYYY-MM-DD")).toBe("2027-01-03");
    expect(shiftPeriod({ kind: "week" }, 1, fixtureNow)).toEqual({
      kind: "range",
      start: "2026-11-09",
      end: "2026-11-15",
    });
    expect(
      shiftPeriod(
        { kind: "range", start: "2028-02-28", end: "2028-02-29" },
        1,
        fixtureNow,
      ),
    ).toEqual({ kind: "range", start: "2028-03-01", end: "2028-03-02" });
  });

  it("includes undated tasks only on request, or when the period is cleared", () => {
    const data = taskWorkspaceFixture();
    const included = filterTasks(
      data,
      { ...filters, includeUndated: true },
      fixtureNow,
    );
    expect(included).toHaveLength(7);
    expect(included.at(-1)?.id).toBe("6");
    expect(groupTasks(included, "assignees").at(-1)?.[0]).toBe("unassigned");
    expect(
      filterTasks(data, { ...filters, period: { kind: "all" } }, fixtureNow),
    ).toHaveLength(9);
  });

  it("searches related entities and combines completion and assignee filters", () => {
    const data = taskWorkspaceFixture();
    expect(
      filterTasks(data, { ...filters, query: "  ПАВЕЛ  " }, fixtureNow).map(
        (task) => task.id,
      ),
    ).toEqual(["1", "5"]);
    expect(
      filterTasks(
        data,
        { ...filters, query: "марина", completion: "done" },
        fixtureNow,
      ).map((task) => task.id),
    ).toEqual(["5"]);
    expect(
      filterTasks(
        data,
        { ...filters, assignee: "ivan", completion: "open" },
        fixtureNow,
      ).map((task) => task.id),
    ).toEqual(["7", "2"]);
  });
});
