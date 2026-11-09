"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { PlanFeatureGate, LITE_AND_BUSINESS, BUSINESS_ONLY } from "@/shared/ui/PlanFeatureGate";
import type { BillingOverview } from "./model";
import s from "./billing.module.css";

type Template = { id: string; title: string; body: string; shared: boolean };
type Task = {
  id: string;
  title: string;
  note: string;
  assigneeUserId: string | null;
  requestId: string | null;
  dueAt: string | null;
  done: boolean;
  history?: {
    at: string;
    userId: string;
    title: string;
    note: string;
    done: boolean;
  }[];
};
type Workspace = {
  limits: BillingOverview["limits"];
  templates: Template[];
  tasks: Task[];
  members: { id: string; name: string }[];
  requests: { id: string; title: string; status: string }[];
  stats: {
    services: number;
    requests: number;
    byService?: {
      id: string;
      title: string;
      views: number;
      leads: number;
      conversion: number;
    }[];
    regions?: Record<string, number>;
    stages?: Record<string, number>;
    team?: { userId: string; name: string; tasks: number; completed: number }[];
  };
};
const newTemplate = (): Template => ({
  id: crypto.randomUUID(),
  title: "",
  body: "",
  shared: false,
});
const newTask = (): Task => ({
  id: crypto.randomUUID(),
  title: "",
  note: "",
  assigneeUserId: null,
  requestId: null,
  dueAt: null,
  done: false,
});

export function WorkspaceTools({
  providerId,
  initialTab = "stats",
  sectionTitle,
}: {
  providerId: string;
  sectionTitle?: string;
  initialTab?: "stats" | "templates" | "team";
}) {
  const base = `/api/billing/providers/${providerId}`;
  const [data, setData] = useState<Workspace | null>(null);
  const [tab, setTab] = useState<string>(initialTab);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [template, setTemplate] = useState(newTemplate);
  const [task, setTask] = useState(newTask);
  const load = useCallback(async () => {
    const res = await fetch(`${base}/workspace`, { cache: "no-store" });
    if (!res.ok) throw new Error("Не удалось загрузить инструменты профиля");
    setData((await res.json()) as Workspace);
  }, [base]);
  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  async function save(
    path: string,
    value: Template | Task | (Template & { remove: boolean }),
  ) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${base}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          path === "templates"
            ? {
                id: value.id,
                title: value.title,
                body: (value as Template).body,
                shared: (value as Template).shared,
                ...("remove" in value ? { remove: value.remove } : {}),
              }
            : {
                id: value.id,
                title: value.title,
                note: (value as Task).note,
                assigneeUserId: (value as Task).assigneeUserId,
                requestId: (value as Task).requestId,
                dueAt: (value as Task).dueAt,
                done: (value as Task).done,
              },
        ),
      });
      const result = (await response.json()) as {
        message?: string;
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          result.message ?? result.error ?? "Не удалось сохранить",
        );
      if (path === "templates") setTemplate(newTemplate());
      else setTask(newTask());
      await load();
      setNotice("Сохранено");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.root}>
      <div className={s.row}>
        <h1>{sectionTitle ?? "Инструменты профиля"}</h1>
      </div>
      {!sectionTitle && (
        <div className={s.actions} aria-label="Раздел инструментов">
          {[
            ["stats", "Статистика"],
            ["templates", "Шаблоны ответов"],
            ["team", "Задачи команды"],
          ].map(([id, label]) => (
            <button
              className={tab === id ? s.button : s.secondary}
              aria-pressed={tab === id}
              key={id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}{" "}
          <button
            className={s.secondary}
            onClick={() => load().catch((e: Error) => setError(e.message))}
          >
            Повторить загрузку
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p role="status">Загружаем инструменты…</p>}
      {data && (
        <div className={s.section}>
          {tab === "stats" && (
            <>
              <div className={s.cards}>
                <section className={`${s.card} ${s.statCard}`}>
                  <h2>Услуги</h2>
                  <div className={s.big}>{data.stats.services}</div>
                </section>
                <section className={`${s.card} ${s.statCard}`}>
                  <h2>Заявки</h2>
                  <div className={s.big}>{data.stats.requests}</div>
                </section>
              </div>
              <section className={s.card}>
                <h2>Услуги и конверсия</h2>
                {!data.stats.byService ? (
                  <PlanFeatureGate message={LITE_AND_BUSINESS} label="Открыть статистику услуг и конверсии" fullWidth>
                    <Button size="small">Просмотры · Заявки · Конверсия</Button>
                  </PlanFeatureGate>
                ) : (
                  <>
                    <p className={s.muted}>
                      Просмотры считаются с момента подключения статистики: один
                      браузер на услугу за сутки. Конверсия — число прямых
                      заявок на 100 просмотров, с первого зарегистрированного
                      просмотра услуги.
                    </p>
                    {data.stats.byService.map((row) => (
                      <p key={row.id}>
                        <strong>{row.title}</strong> · просмотры: {row.views} ·
                        заявки: {row.leads} · конверсия: {row.conversion}%
                      </p>
                    ))}
                  </>
                )}
              </section>
              <section className={`${s.card} ${s.section}`}>
                <h2>Регионы, команда и этапы</h2>
                {data.limits.statistics < 2 ? (
                  <Stack spacing={1}>
                    {["По регионам", "Этапы заявок", "Команда"].map((label) => (
                      <PlanFeatureGate key={label} message={BUSINESS_ONLY} label={`Статистика: ${label}`} fullWidth>
                        <Button size="small">{label}</Button>
                      </PlanFeatureGate>
                    ))}
                  </Stack>
                ) : (
                  <>
                    <h3>По регионам</h3>
                    {Object.entries(data.stats.regions ?? {}).map(
                      ([key, count]) => (
                        <p key={key}>
                          {key}: {count}
                        </p>
                      ),
                    )}
                    <h3>Этапы заявок</h3>
                    {Object.entries(data.stats.stages ?? {}).map(
                      ([key, count]) => (
                        <p key={key}>
                          {(
                            {
                              NEW: "Новые",
                              DISCUSSING: "Обсуждение",
                              TERMS_AGREED: "Согласованы условия",
                              ACTIVE: "В работе",
                              ACCEPTANCE_PENDING: "На приёмке",
                              ACCEPTED: "Приняты",
                              COMPLETED: "Завершены",
                              CANCELLED: "Отменены",
                              CLOSED: "Закрыты",
                            } as Record<string, string>
                          )[key] ?? key}
                          : {count}
                        </p>
                      ),
                    )}
                    <h3>Команда</h3>
                    {data.stats.team?.map((member) => (
                      <p key={member.userId}>
                        {member.name} · задач: {member.tasks} · выполнено:{" "}
                        {member.completed}
                      </p>
                    ))}
                  </>
                )}
              </section>
            </>
          )}
          {tab === "templates" && (
            <>
              {!data.limits.templates && (
                <div className={s.notice}>
                  На Стандарте доступен просмотр сохранённых шаблонов. Создание
                  и изменение — с Лайта.
                </div>
              )}
              <section className={s.card}>
                <h2>Личные и общие ответы</h2>
                {!data.templates.length && <p>Шаблонов пока нет.</p>}
                {data.templates.map((row) => (
                  <article key={row.id} className={s.section}>
                    <strong>
                      {row.title} · {row.shared ? "Общий" : "Личный"}
                    </strong>
                    <p style={{ whiteSpace: "pre-wrap" }}>{row.body}</p>
                    <div className={s.actions}>
                      <button
                        className={s.secondary}
                        onClick={() =>
                          navigator.clipboard
                            .writeText(row.body)
                            .then(() =>
                              setNotice(
                                "Текст скопирован — вставьте его в диалог",
                              ),
                            )
                            .catch(() =>
                              setError(
                                "Не удалось скопировать. Выделите текст вручную.",
                              ),
                            )
                        }
                      >
                        Скопировать
                      </button>
                      <button
                        className={s.secondary}
                        disabled={
                          busy ||
                          !data.limits.templates ||
                          (row.shared && !data.limits.sharedTemplates)
                        }
                        onClick={() => setTemplate(row)}
                      >
                        Изменить
                      </button>
                      <button
                        className={s.secondary}
                        disabled={
                          busy ||
                          !data.limits.templates ||
                          (row.shared && !data.limits.sharedTemplates)
                        }
                        onClick={() =>
                          save("templates", { ...row, remove: true })
                        }
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
              </section>
              <section className={`${s.card} ${s.section}`}>
                <h2>
                  {data.templates.some((t) => t.id === template.id)
                    ? "Изменение шаблона"
                    : "Новый шаблон"}
                </h2>
                <Stack spacing={2}>
                  <TextField
                    label="Название шаблона"
                    value={template.title}
                    disabled={!data.limits.templates || busy}
                    onChange={(e) =>
                      setTemplate({ ...template, title: e.target.value })
                    }
                    slotProps={{ htmlInput: { maxLength: 120 } }}
                  />
                  <TextField
                    label="Текст ответа"
                    multiline
                    minRows={4}
                    value={template.body}
                    disabled={!data.limits.templates || busy}
                    onChange={(e) =>
                      setTemplate({ ...template, body: e.target.value })
                    }
                    slotProps={{ htmlInput: { maxLength: 5000 } }}
                  />
                  <FormControlLabel
                    label="Общий шаблон команды"
                    control={
                      <Checkbox
                        checked={template.shared}
                        disabled={!data.limits.sharedTemplates || busy}
                        onChange={(e) =>
                          setTemplate({ ...template, shared: e.target.checked })
                        }
                      />
                    }
                  />
                  <Button
                    variant="contained"
                    disabled={
                      busy ||
                      !data.limits.templates ||
                      !template.title.trim() ||
                      !template.body.trim() ||
                      (template.shared && !data.limits.sharedTemplates)
                    }
                    onClick={() => save("templates", template)}
                  >
                    Сохранить шаблон
                  </Button>
                  <Button onClick={() => setTemplate(newTemplate())}>
                    Очистить форму
                  </Button>
                </Stack>
              </section>
            </>
          )}
          {tab === "team" && (
            <>
              {!data.limits.team && (
                <div className={s.notice}>
                  На текущем тарифе доступны просмотр задач, заметок и истории.
                  Изменения — на Бизнесе.{" "}
                  <Link href="/pro/team/add-manager">
                    Участники профиля
                  </Link>{" "}
                  остаются доступны.
                </div>
              )}
              <section className={s.card}>
                <h2>Задачи и внутренние заметки</h2>
                {!data.tasks.length && <p>Задач пока нет.</p>}
                {data.tasks.map((row) => (
                  <article key={row.id} className={s.section}>
                    <strong>
                      {row.title} · {row.done ? "Выполнено" : "В работе"}
                    </strong>
                    <p>
                      {data.members.find((m) => m.id === row.assigneeUserId)
                        ?.name ?? "Не назначено"}
                      {row.dueAt
                        ? ` · до ${new Date(row.dueAt).toLocaleString("ru-RU")}`
                        : ""}
                    </p>
                    <p style={{ whiteSpace: "pre-wrap" }}>{row.note}</p>
                    {row.requestId && (
                      <Link href={`/pro/requests/${row.requestId}`}>
                        Открыть заявку
                      </Link>
                    )}
                    <div className={s.actions}>
                      <button
                        className={s.secondary}
                        disabled={busy || !data.limits.team}
                        onClick={() => setTask(row)}
                      >
                        Изменить задачу
                      </button>
                    </div>
                    <details>
                      <summary>История изменений</summary>
                      {row.history?.map((event, index) => (
                        <p key={index}>
                          {new Date(event.at).toLocaleString("ru-RU")} ·{" "}
                          {data.members.find((m) => m.id === event.userId)
                            ?.name ?? "Сотрудник"}{" "}
                          · {event.title} ·{" "}
                          {event.done ? "Выполнено" : "В работе"}
                          <br />
                          {event.note}
                        </p>
                      ))}
                    </details>
                  </article>
                ))}
              </section>
              <section className={`${s.card} ${s.section}`}>
                <h2>
                  {data.tasks.some((t) => t.id === task.id)
                    ? "Изменение задачи"
                    : "Новая задача"}
                </h2>
                <Stack spacing={2}>
                  <TextField
                    label="Название задачи"
                    value={task.title}
                    disabled={busy || !data.limits.team}
                    onChange={(e) =>
                      setTask({ ...task, title: e.target.value })
                    }
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                  />
                  <TextField
                    label="Внутренняя заметка"
                    multiline
                    minRows={3}
                    value={task.note}
                    disabled={busy || !data.limits.team}
                    onChange={(e) => setTask({ ...task, note: e.target.value })}
                    slotProps={{ htmlInput: { maxLength: 5000 } }}
                  />
                  <TextField
                    select
                    label="Ответственный"
                    value={task.assigneeUserId ?? ""}
                    disabled={busy || !data.limits.team}
                    onChange={(e) =>
                      setTask({
                        ...task,
                        assigneeUserId: e.target.value || null,
                      })
                    }
                  >
                    <MenuItem value="">Не назначен</MenuItem>
                    {data.members.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Заявка"
                    value={task.requestId ?? ""}
                    disabled={busy || !data.limits.team}
                    onChange={(e) =>
                      setTask({ ...task, requestId: e.target.value || null })
                    }
                  >
                    <MenuItem value="">Без привязки</MenuItem>
                    {data.requests.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.title}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    type="datetime-local"
                    label="Срок (ваше местное время)"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={
                      task.dueAt
                        ? new Date(
                            new Date(task.dueAt).getTime() -
                              new Date(task.dueAt).getTimezoneOffset() * 60000,
                          )
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    disabled={busy || !data.limits.team}
                    onChange={(e) =>
                      setTask({
                        ...task,
                        dueAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                  <FormControlLabel
                    label="Выполнено"
                    control={
                      <Checkbox
                        checked={task.done}
                        disabled={busy || !data.limits.team}
                        onChange={(e) =>
                          setTask({ ...task, done: e.target.checked })
                        }
                      />
                    }
                  />
                  <Button
                    variant="contained"
                    disabled={busy || !data.limits.team || !task.title.trim()}
                    onClick={() => {
                      const { history: _history, ...input } = task;
                      void _history;
                      void save("tasks", input);
                    }}
                  >
                    Сохранить задачу
                  </Button>
                  <Button onClick={() => setTask(newTask())}>
                    Очистить форму
                  </Button>
                </Stack>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
