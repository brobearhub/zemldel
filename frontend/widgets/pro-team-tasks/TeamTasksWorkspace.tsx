"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { getRequestStatusLabel } from "@/entities/request/dto/request.dto";
import { TaskPeriodFilter } from "./TaskPeriodFilter";
import { TaskEditor } from "./TaskEditor";
import { TaskRow } from "./TaskRow";
import {
  assigneeName,
  filterTasks,
  groupTasks,
  periodLabel,
  requestLabel,
  taskInput,
  type CompletionFilter,
  type TaskFilters,
  type TasksWorkspaceData,
  type TaskView,
  type TeamTask,
} from "./model";
import { actionSx, panelSx, selectedSx } from "./styles";

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  const message = body?.message ?? body?.error;
  return typeof message === "string"
    ? message
    : Array.isArray(message)
      ? message.join(". ")
      : fallback;
}

export function TeamTasksWorkspace({ providerId }: { providerId: string }) {
  const base = `/api/billing/providers/${providerId}`;
  const [data, setData] = useState<TasksWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [now, setNow] = useState(() => dayjs());
  const [view, setView] = useState<TaskView>("tasks");
  const [filters, setFilters] = useState<TaskFilters>({
    period: { kind: "week" },
    includeUndated: false,
    query: "",
    completion: "all",
    assignee: null,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    task: TeamTask;
    editing: boolean;
  } | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    taskId: string | null;
  } | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(`${base}/workspace`, {
          cache: "no-store",
          signal,
        });
        if (!response.ok)
          throw new Error(
            await responseError(response, "Не удалось загрузить задачи"),
          );
        const workspace = (await response.json()) as TasksWorkspaceData;
        if (!signal?.aborted) setData(workspace);
      } catch (error) {
        if (!signal?.aborted)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить задачи",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [base],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(dayjs()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const tasks = useMemo(
    () => (data ? filterTasks(data, filters, now) : []),
    [data, filters, now],
  );
  const groups = useMemo(() => groupTasks(tasks, view), [tasks, view]);
  const visibleIds = useMemo(
    () => new Set(tasks.map((task) => task.id)),
    [tasks],
  );
  const revealed = data?.tasks.find(
    (task) => task.id === revealedId && !visibleIds.has(task.id),
  );

  function startCreate(preset: Partial<TeamTask> = {}) {
    setSaveError("");
    setEditor({
      editing: false,
      task: {
        id: crypto.randomUUID(),
        title: "",
        note: "",
        assigneeUserId: filters.assignee,
        requestId: null,
        dueAt:
          filters.period.kind === "day"
            ? dayjs(filters.period.start)
                .endOf("day")
                .second(0)
                .millisecond(0)
                .toISOString()
            : null,
        done: false,
        ...preset,
      },
    });
  }

  async function saveTask(task: TeamTask, closeEditor: boolean) {
    if (!data || !data.limits.team || saving.current) return;
    saving.current = true;
    setBusy(true);
    setSaveError("");
    setNotice(null);
    try {
      const response = await fetch(`${base}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskInput(task)),
      });
      if (!response.ok)
        throw new Error(
          await responseError(response, "Не удалось сохранить задачу"),
        );
      const saved = (await response.json()) as TeamTask;
      const nextData = {
        ...data,
        tasks: [...data.tasks.filter((item) => item.id !== saved.id), saved],
      };
      setData(nextData);
      if (closeEditor) {
        setEditor(null);
        setExpandedId(saved.id);
      }
      const visible = filterTasks(nextData, filters, now).some(
        (item) => item.id === saved.id,
      );
      setNotice({
        message: visible
          ? "Задача сохранена"
          : "Задача сохранена, но скрыта текущими фильтрами.",
        taskId: visible ? null : saved.id,
      });
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Не удалось сохранить задачу",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function selectAssignee(id: string) {
    setView("assignees");
    setFilters((current) => ({ ...current, assignee: id }));
  }

  function renderTask(task: TeamTask) {
    return (
      data && (
        <TaskRow
          key={task.id}
          task={task}
          data={data}
          view={view}
          expanded={expandedId === task.id}
          busy={busy}
          now={now}
          onExpand={setExpandedId}
          onEdit={(item) => {
            setSaveError("");
            setEditor({ task: item, editing: true });
          }}
          onToggleDone={(item) =>
            void saveTask({ ...item, done: !item.done }, false)
          }
          onAssignee={selectAssignee}
        />
      )
    );
  }

  return (
    <Stack
      spacing={2.5}
      sx={{
        minWidth: 0,
        width: "100%",
        "& .MuiButton-sizeSmall": {
          minHeight: 32,
          padding: "4px 10px",
          fontSize: 14,
        },
        "& .MuiOutlinedInput-root.MuiInputBase-sizeSmall": {
          fontSize: 16,
          lineHeight: 1.4375,
          "&:not(.MuiInputBase-multiline)": {
            minHeight: 40,
          },
          "&:focus-within": {
            outline: "none",
          },
          "& .MuiInputBase-input:focus-visible": {
            outline: "none",
            boxShadow: "none",
          },
        },
        "& .MuiButton-text:not(.Mui-disabled), & .MuiButton-outlined:not(.Mui-disabled)":
          {
            color: "text.primary",
          },
        "& .MuiButton-outlined": {
          borderColor: "divider",
        },
        "& .MuiTypography-body2": {
          fontSize: 14,
          lineHeight: 1.5,
        },
      }}
    >
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack spacing={0.5}>
          {editor && (
            <Button
              size="small"
              startIcon={<ArrowBackRoundedIcon />}
              disabled={busy}
              sx={{ alignSelf: "flex-start" }}
              onClick={() => {
                setEditor(null);
                setSaveError("");
              }}
            >
              Задачи команды
            </Button>
          )}
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontSize: 28,
              lineHeight: 1.3,
              fontWeight: 700,
            }}
          >
            {editor
              ? editor.editing
                ? "Изменение задачи"
                : "Новая задача"
              : "Задачи команды"}
          </Typography>
          {!editor && (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
              }}
            >
              Поручения, заявки и ответственные в одном месте
            </Typography>
          )}
        </Stack>
        {!editor && (
          <Button
            size="small"
            variant="contained"
            startIcon={<AddRoundedIcon />}
            sx={actionSx}
            disabled={!data?.limits.team || busy}
            onClick={() => startCreate()}
          >
            Новая задача
          </Button>
        )}
      </Stack>
      {loading && <LinearProgress aria-label="Загружаем задачи" />}
      {loadError && (
        <Alert
          severity="error"
          action={
            <Button
              size="small"
              disabled={loading}
              onClick={() => void load()}
            >
              Повторить
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}
      {data && !data.limits.team && (
        <Alert
          severity="info"
          action={
            <Button
              component={Link}
              href="/pro/settings/tariff"
              size="small"
            >
              Тариф
            </Button>
          }
        >
          Задачи доступны для просмотра. Создание и изменение доступны на тарифе
          с командой.
        </Alert>
      )}
      {!editor && saveError && (
        <Alert
          severity="error"
          onClose={() => setSaveError("")}
        >
          {saveError}
        </Alert>
      )}
      {!editor && notice && (
        <Alert
          severity="success"
          role="status"
          onClose={() => setNotice(null)}
          action={
            notice.taskId ? (
              <Button
                size="small"
                onClick={() => {
                  setRevealedId(notice.taskId);
                  setExpandedId(notice.taskId);
                }}
              >
                Показать задачу
              </Button>
            ) : undefined
          }
        >
          {notice.message}
        </Alert>
      )}
      {data &&
        (editor ? (
          <TaskEditor
            key={editor.task.id}
            task={editor.task}
            editing={editor.editing}
            data={data}
            busy={busy}
            error={saveError}
            onSave={(task) => saveTask(task, true)}
            onCancel={() => {
              setEditor(null);
              setSaveError("");
            }}
          />
        ) : (
          <>
            <Paper
              variant="outlined"
              sx={{
                ...panelSx,
                p: 2,
              }}
            >
              <Stack spacing={2}>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={view}
                  aria-label="Группировка задач"
                  onChange={(_, value: TaskView | null) =>
                    value && setView(value)
                  }
                  sx={{
                    alignSelf: "flex-start",
                    bgcolor: "background.default",
                    p: 0.5,
                    borderRadius: 2,
                    maxWidth: "100%",
                  }}
                >
                  {(
                    [
                      ["tasks", "По задачам"],
                      ["requests", "По заявкам"],
                      ["assignees", "По исполнителям"],
                    ] as const
                  ).map(([id, label]) => (
                    <ToggleButton
                      key={id}
                      value={id}
                      sx={{
                        ...selectedSx,
                        px: {
                          xs: 1,
                          sm: 2,
                        },
                      }}
                    >
                      {label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <TaskPeriodFilter
                  period={filters.period}
                  onChange={(period) =>
                    setFilters((current) => ({ ...current, period }))
                  }
                  includeUndated={filters.includeUndated}
                  onIncludeUndated={(includeUndated) =>
                    setFilters((current) => ({ ...current, includeUndated }))
                  }
                  undatedCount={data.tasks.filter((task) => !task.dueAt).length}
                  now={now}
                />
              </Stack>
            </Paper>
            <Stack
              direction="row"
              useFlexGap
              spacing={1.5}
              sx={{
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <TextField
                size="small"
                placeholder="Поиск по задаче, заявке или имени"
                value={filters.query}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    query: event.target.value,
                  }))
                }
                slotProps={{
                  htmlInput: { "aria-label": "Поиск по задачам" },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon
                          sx={{
                            fontSize: "small",
                          }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  flex: "1 1 260px",
                  bgcolor: "background.paper",
                  borderRadius: 2,
                }}
              />
              <ToggleButtonGroup
                size="small"
                exclusive
                value={filters.completion}
                aria-label="Выполнение задач"
                onChange={(_, completion: CompletionFilter | null) =>
                  completion &&
                  setFilters((current) => ({ ...current, completion }))
                }
              >
                {(
                  [
                    ["all", "Все"],
                    ["open", "Открытые"],
                    ["done", "Выполненные"],
                  ] as const
                ).map(([id, label]) => (
                  <ToggleButton
                    key={id}
                    value={id}
                    sx={{
                      ...selectedSx,
                      px: 1.5,
                    }}
                  >
                    {label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
            {filters.assignee !== null && (
              <Chip
                label={`Исполнитель: ${assigneeName(filters.assignee, data.members)}`}
                onDelete={() =>
                  setFilters((current) => ({ ...current, assignee: null }))
                }
                sx={{
                  alignSelf: "flex-start",
                  maxWidth: "100%",
                }}
              />
            )}
            <Stack
              direction="row"
              useFlexGap
              spacing={1}
              aria-live="polite"
              sx={{
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                }}
              >
                Всего: {tasks.length} · Открытые:{" "}
                {tasks.filter((task) => !task.done).length} · Выполненные:{" "}
                {tasks.filter((task) => task.done).length}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                }}
              >
                {view === "tasks"
                  ? "По сроку: сначала ближайшие"
                  : view === "requests"
                    ? "Задачи сгруппированы по заявкам"
                    : "Задачи сгруппированы по исполнителям"}
              </Typography>
            </Stack>
            {revealed && (
              <Paper
                variant="outlined"
                sx={{
                  ...panelSx,
                  overflow: "hidden",
                }}
              >
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    px: 2,
                    py: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    Вне текущих фильтров
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setRevealedId(null)}
                  >
                    Скрыть
                  </Button>
                </Stack>
                {renderTask(revealed)}
              </Paper>
            )}
            {!tasks.length && (
              <Paper
                variant="outlined"
                sx={{
                  ...panelSx,
                  px: 3,
                  py: 7,
                  textAlign: "center",
                }}
              >
                <Stack
                  spacing={2}
                  sx={{
                    alignItems: "center",
                  }}
                >
                  <Typography variant="h6">
                    {filters.query.trim()
                      ? "Ничего не найдено"
                      : !data.tasks.length
                        ? "Пока нет задач"
                        : "За выбранный период задач нет"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {filters.query.trim()
                      ? "Попробуйте другой запрос или очистите поиск."
                      : !data.tasks.length
                        ? "Создайте первое поручение для себя или сотрудника."
                        : `${periodLabel(filters.period, now)}. Проверьте период и фильтры или создайте задачу.`}
                  </Typography>
                  <Stack
                    direction="row"
                    useFlexGap
                    spacing={1}
                    sx={{
                      flexWrap: "wrap",
                      justifyContent: "center",
                    }}
                  >
                    {(data.tasks.length > 0 || filters.query) && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          setFilters((current) => ({
                            ...current,
                            period: { kind: "all" },
                            query: "",
                            completion: "all",
                            assignee: null,
                          }))
                        }
                      >
                        Сбросить фильтры
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="contained"
                      sx={actionSx}
                      startIcon={<AddRoundedIcon />}
                      disabled={!data.limits.team || busy}
                      onClick={() => startCreate()}
                    >
                      Новая задача
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            )}
            {groups.map(([key, items]) => {
              const request =
                view === "requests"
                  ? data.requests.find((item) => item.id === key)
                  : null;
              const showHeading = view !== "tasks" || key === "undated";
              const heading =
                view === "requests"
                  ? request
                    ? requestLabel(request)
                    : key === "unlinked"
                      ? "Без заявки"
                      : "Заявка недоступна"
                  : view === "assignees"
                    ? key === "unassigned"
                      ? "Не назначены"
                      : assigneeName(key, data.members)
                    : "Без срока";
              const subheading =
                view === "requests"
                  ? request
                    ? [
                        request.customerName,
                        getRequestStatusLabel(request.status),
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "Внутренние поручения команды"
                  : view === "assignees"
                    ? `Заявок: ${new Set(items.map((item) => item.requestId).filter(Boolean)).size} · Выполнено: ${items.filter((item) => item.done).length}`
                    : "Задачи без даты выполнения";
              return (
                <Paper
                  key={key}
                  component="section"
                  aria-label={showHeading ? heading : "Список задач"}
                  variant="outlined"
                  sx={{
                    ...panelSx,
                    overflow: "hidden",
                  }}
                >
                  {showHeading && (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        p: 2,
                        borderBottom: 1,
                        borderColor: "divider",
                        bgcolor: (theme) =>
                          alpha(theme.palette.primary.main, 0.08),
                      }}
                    >
                      <Stack
                        spacing={0.5}
                        sx={{ minWidth: 0 }}
                      >
                        {request ? (
                          <Typography
                            component={Link}
                            href={`/pro/requests/${request.id}`}
                            sx={{
                              fontWeight: 600,
                              color: "text.primary",
                              textDecoration: "none",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {heading}
                          </Typography>
                        ) : (
                          <Typography
                            sx={{
                              fontWeight: 600,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {heading}
                          </Typography>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                          }}
                        >
                          {subheading}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                        }}
                      >
                        Задач: {items.length}
                      </Typography>
                    </Box>
                  )}
                  {items.map(renderTask)}
                </Paper>
              );
            })}
          </>
        ))}
      {data && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          Задачи и внутренние заметки видит только ваша команда.
        </Typography>
      )}
    </Stack>
  );
}
