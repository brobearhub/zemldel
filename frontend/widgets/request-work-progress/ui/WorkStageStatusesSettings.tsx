"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { WorkStageStatusOptionDto } from "@/entities/request";
import { SYSTEM_WORK_STAGE_STATUSES, createCustomWorkStageStatusKey } from "@/entities/request";
import {
  fetchWorkStageStatuses,
  saveCustomWorkStageStatuses,
} from "@/entities/request/api/request-work-stages";

export function WorkStageStatusesSettings() {
  const [custom, setCustom] = useState<WorkStageStatusOptionDto[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload() {
    const data = await fetchWorkStageStatuses();
    setCustom(data.custom);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(next: WorkStageStatusOptionDto[]) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await saveCustomWorkStageStatuses(next);
      setCustom(data.custom);
      setNotice("Сохранено");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
      await reload().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{
            fontWeight: 800
          }}>
            Системные статусы
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Эти статусы доступны всем и не редактируются.
          </Typography>
          <Stack spacing={0.75}>
            {SYSTEM_WORK_STAGE_STATUSES.map((item) => (
              <Typography key={item.key} variant="body2">
                {item.label}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{
            fontWeight: 800
          }}>
            Мои статусы
          </Typography>
          {custom.length === 0 ? (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Пока нет собственных статусов.
            </Typography>
          ) : (
            custom.map((item) => (
              <Stack key={item.key} direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <TextField
                  size="small"
                  fullWidth
                  value={item.label}
                  disabled={busy}
                  onChange={(e) => {
                    const label = e.target.value;
                    setCustom((prev) =>
                      prev.map((row) => (row.key === item.key ? { ...row, label } : row))
                    );
                  }}
                  onBlur={() => void persist(custom)}
                />
                <Button
                  color="error"
                  disabled={busy}
                  onClick={() => void persist(custom.filter((row) => row.key !== item.key))}
                >
                  Удалить
                </Button>
              </Stack>
            ))
          )}

          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <TextField
              size="small"
              fullWidth
              label="Новый статус"
              value={newLabel}
              disabled={busy}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <Button
              variant="contained"
              disabled={busy || newLabel.trim().length < 1}
              onClick={() => {
                const next = [
                  ...custom,
                  { key: createCustomWorkStageStatusKey(), label: newLabel.trim() },
                ];
                setNewLabel("");
                void persist(next);
              }}
            >
              Добавить
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
