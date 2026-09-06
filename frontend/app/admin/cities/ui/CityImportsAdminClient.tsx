"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { CityImportEventDto, CityImportRunDto } from "@/entities/city";

type CityImportsAdminClientProps = {
  initialRuns: CityImportRunDto[];
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
}

function eventTypeLabel(type: CityImportEventDto["eventType"]): string {
  switch (type) {
    case "ADDED":
      return "Добавлено";
    case "UPDATED":
      return "Обновлено";
    case "DEACTIVATED":
      return "Деактивировано";
    case "REACTIVATED":
      return "Реактивировано";
    default:
      return type;
  }
}

export function CityImportsAdminClient(props: CityImportsAdminClientProps) {
  const [runs] = useState(props.initialRuns);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runs[0]?.id ?? null);
  const [events, setEvents] = useState<CityImportEventDto[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  async function loadEvents(runId: string) {
    setSelectedRunId(runId);
    setLoadingEvents(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/city-import-runs/${encodeURIComponent(runId)}/events`);
      const payload = (await response.json()) as CityImportEventDto[] | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Не удалось загрузить события");
      }
      setEvents(Array.isArray(payload) ? payload : []);
    } catch (e) {
      setEvents([]);
      setError(e instanceof Error ? e.message : "Не удалось загрузить события");
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    if (runs[0]?.id) {
      void loadEvents(runs[0].id);
    }
  }, [runs]);

  return (
    <Stack spacing={3}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Запуск</TableCell>
              <TableCell>Режим</TableCell>
              <TableCell align="right">Снимок</TableCell>
              <TableCell align="right">+</TableCell>
              <TableCell align="right">~</TableCell>
              <TableCell align="right">−</TableCell>
              <TableCell align="right">↺</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
                    Импортов пока нет. Запустите `npm run cities:update` локально.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => {
                const selected = run.id === selectedRunId;
                return (
                  <TableRow
                    key={run.id}
                    hover
                    selected={selected}
                    sx={{ cursor: "pointer" }}
                    onClick={() => void loadEvents(run.id)}
                  >
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" sx={{ fontWeight: selected ? 800 : 600 }}>
                          {formatDate(run.startedAt)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            wordBreak: "break-all"
                          }}>
                          {run.sourceLabel ?? run.id}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{run.mode}</TableCell>
                    <TableCell align="right">{run.snapshotCount}</TableCell>
                    <TableCell align="right">{run.addedCount}</TableCell>
                    <TableCell align="right">{run.updatedCount}</TableCell>
                    <TableCell align="right">{run.deactivatedCount}</TableCell>
                    <TableCell align="right">{run.reactivatedCount}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedRun ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                alignItems: "center",
                flexWrap: "wrap"
              }}>
              <Typography sx={{ fontWeight: 900 }}>События импорта</Typography>
              <Chip size="small" label={`run ${selectedRun.id.slice(0, 8)}…`} />
              {loadingEvents ? <CircularProgress size={16} /> : null}
            </Stack>

            {events.length === 0 && !loadingEvents ? (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                Нет детализированных событий для этого запуска (или они не записывались).
              </Typography>
            ) : (
              <Box sx={{ maxHeight: 420, overflow: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Тип</TableCell>
                      <TableCell>Локация</TableCell>
                      <TableCell>Регион</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{eventTypeLabel(event.eventType)}</TableCell>
                        <TableCell>{event.name}</TableCell>
                        <TableCell>
                          {event.regionName} ({event.regionCode})
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
