"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Link from "@/shared/ui/Link";

export type ProContractTemplateListItem = {
  id: string;
  title: string;
  version: number;
  parentTemplateId: string | null;
  updatedAt: string;
  createdAt: string;
};

export type ProContractInstanceListItem = {
  id: string;
  title: string;
  status: "DRAFT" | "SENT" | "SIGNED" | "CANCELLED";
  requestId: string | null;
  customerUserId: string | null;
  updatedAt: string;
  createdAt: string;
};

type Props = {
  initialTemplates: ProContractTemplateListItem[];
  initialInstances: ProContractInstanceListItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: ProContractInstanceListItem["status"]) {
  if (status === "SIGNED") return "Принят клиентом";
  if (status === "SENT") return "Отправлен";
  if (status === "CANCELLED") return "Отменён";
  return "Черновик";
}

export function ProContractsWorkspace({ initialTemplates, initialInstances }: Props) {
  const searchParams = useSearchParams();
  const requestIdFromQuery = searchParams.get("requestId") ?? "";
  const [tab, setTab] = useState<"templates" | "instances">(() => (requestIdFromQuery ? "instances" : "templates"));
  const [templates, setTemplates] = useState(initialTemplates);
  const [instances, setInstances] = useState(initialInstances);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createInstanceTemplateId, setCreateInstanceTemplateId] = useState<string>("");
  const [createInstanceOrderId, setCreateInstanceOrderId] = useState<string>(() => requestIdFromQuery);
  const templatesSorted = useMemo(
    () => [...templates].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [templates]
  );
  const instancesSorted = useMemo(
    () => [...instances].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [instances]
  );

  async function refresh() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const [tplRes, instRes] = await Promise.all([
        fetch("/api/pro/contracts/templates", { cache: "no-store" }),
        fetch("/api/pro/contracts/instances", { cache: "no-store" }),
      ]);
      const tplPayload = (await tplRes.json().catch(() => null)) as ProContractTemplateListItem[] | { error?: string } | null;
      const instPayload = (await instRes.json().catch(() => null)) as ProContractInstanceListItem[] | { error?: string } | null;
      if (!tplRes.ok) {
        throw new Error(
          tplPayload && typeof tplPayload === "object" && "error" in tplPayload && typeof tplPayload.error === "string"
            ? tplPayload.error
            : "Не удалось загрузить шаблоны"
        );
      }
      if (!instRes.ok) {
        throw new Error(
          instPayload && typeof instPayload === "object" && "error" in instPayload && typeof instPayload.error === "string"
            ? instPayload.error
            : "Не удалось загрузить договоры"
        );
      }
      setTemplates(tplPayload as ProContractTemplateListItem[]);
      setInstances(instPayload as ProContractInstanceListItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить");
    } finally {
      setBusy(false);
    }
  }

  async function forkTemplate(id: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/pro/contracts/templates/${id}/fork`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
      const payload = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Не удалось отпочковать шаблон");
      setNotice("Шаблон отпочкован");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отпочковать шаблон");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(template: ProContractTemplateListItem) {
    const ok = window.confirm(`Удалить шаблон «${template.title}»? Это действие нельзя отменить.`);
    if (!ok) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/pro/contracts/templates/${template.id}`, { method: "DELETE" });
      const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Не удалось удалить шаблон");
      setNotice("Шаблон удалён");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить шаблон");
    } finally {
      setBusy(false);
    }
  }

  async function createInstance(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/pro/contracts/instances", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: createInstanceTemplateId,
          serviceRequestId: createInstanceOrderId,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Не удалось создать договор");
      setNotice(createInstanceOrderId ? "Договор создан и прикреплён к заявке" : "Договор создан");
      if (!requestIdFromQuery) setCreateInstanceOrderId("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать договор");
    } finally {
      setBusy(false);
    }
  }

  async function sendToCustomer(id: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/pro/contracts/instances/${id}/send`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Не удалось отправить");
      setNotice("Отправлено клиенту");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          variant="fullWidth"
          sx={{ borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab value="templates" label="Шаблоны" />
          <Tab value="instances" label="Экземпляры" />
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            {tab === "templates" ? (
              <Button component={Link} href="/pro/documents/contracts/templates/new" variant="contained" disabled={busy}>
                Создать шаблон
              </Button>
            ) : null}
            <Button component={Link} href="/pro/documents/contracts/requisites" variant="outlined" disabled={busy}>
              Реквизиты
            </Button>
            <Button variant="outlined" onClick={() => void refresh()} disabled={busy}>
              Обновить
            </Button>
          </Stack>
        </Box>

        <Divider />

        {tab === "templates" ? (
          <List dense disablePadding>
            {templatesSorted.length === 0 ? (
              <Box sx={{ p: 2.5 }}>
                <Typography color="text.secondary">Шаблонов пока нет.</Typography>
              </Box>
            ) : (
              templatesSorted.map((t) => (
                <ListItem key={t.id} disableGutters secondaryAction={
                  <Stack direction="row" spacing={1} sx={{ pr: 2 }}>
                    <Button component={Link} href={`/pro/documents/contracts/templates/${t.id}/edit`} size="small" variant="outlined" disabled={busy}>
                      Редактировать
                    </Button>
                    <Button size="small" variant="contained" disabled={busy} onClick={() => void forkTemplate(t.id)}>
                      Отпочковать
                    </Button>
                    <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => void deleteTemplate(t)}>
                      Удалить
                    </Button>
                  </Stack>
                }>
                  <ListItemButton component={Link} href={`/pro/documents/contracts/templates/${t.id}/edit`} sx={{ px: 2.5, py: 1.5 }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={700}>{t.title}</Typography>
                          <Chip size="small" label={`v${t.version}`} />
                          {t.parentTemplateId ? <Chip size="small" color="info" label="fork" /> : null}
                        </Stack>
                      }
                      secondary={`Обновлён: ${formatDate(t.updatedAt)}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        ) : (
          <Stack spacing={2} sx={{ p: 2.5 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack component="form" spacing={1.5} onSubmit={createInstance}>
                <Typography fontWeight={800}>
                  {requestIdFromQuery ? "Создать договор для заявки" : "Создать экземпляр по заявке"}
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel id="template-id-label">Шаблон</InputLabel>
                  <Select
                    labelId="template-id-label"
                    label="Шаблон"
                    value={createInstanceTemplateId}
                    onChange={(e) => setCreateInstanceTemplateId(e.target.value)}
                    disabled={busy}
                    required
                  >
                    {templatesSorted.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {requestIdFromQuery ? (
                  <Alert severity="info">Договор будет прикреплён к текущей заявке.</Alert>
                ) : (
                  <TextField
                    label="ID заявки"
                    value={createInstanceOrderId}
                    onChange={(e) => setCreateInstanceOrderId(e.target.value)}
                    disabled={busy}
                    size="small"
                    fullWidth
                    required
                  />
                )}
                <Button type="submit" variant="contained" disabled={busy || templatesSorted.length === 0}>
                  Создать
                </Button>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <List dense disablePadding>
                {instancesSorted.length === 0 ? (
                  <Box sx={{ p: 2 }}>
                    <Typography color="text.secondary">Экземпляров договоров пока нет.</Typography>
                  </Box>
                ) : (
                  instancesSorted.map((c) => (
                    <ListItem
                      key={c.id}
                      disableGutters
                      secondaryAction={
                        <Stack direction="row" spacing={1} sx={{ pr: 2 }}>
                          <Button
                            component={Link}
                            href={`/pro/documents/contracts/instances/${c.id}`}
                            size="small"
                            variant="outlined"
                            disabled={busy}
                          >
                            Перейти
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={busy || c.status !== "DRAFT"}
                            onClick={() => void sendToCustomer(c.id)}
                          >
                            Отправить клиенту
                          </Button>
                        </Stack>
                      }
                    >
                      <ListItemButton component={Link} href={`/pro/documents/contracts/instances/${c.id}`} sx={{ px: 2.5, py: 1.5 }}>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography fontWeight={700}>{c.title}</Typography>
                              <Chip size="small" label={statusLabel(c.status)} />
                            </Stack>
                          }
                          secondary={`Обновлён: ${formatDate(c.updatedAt)}${c.requestId ? ` · заказ: ${c.requestId}` : ""}`}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))
                )}
              </List>
            </Paper>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

