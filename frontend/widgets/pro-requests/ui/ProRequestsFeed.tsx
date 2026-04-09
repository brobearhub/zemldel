"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { getServiceRequestStatusLabel, type ServiceRequestProDto } from "@/entities/service-request";

type Props = {
  initialItems: ServiceRequestProDto[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function pickTitle(item: ServiceRequestProDto) {
  if (item.kind === "SERVICE") return item.serviceTitle ?? "Заявка по услуге";
  if (item.kind === "TEMPLATE") return item.templateTitle ?? "Заявка по шаблону";
  return "Свободная заявка";
}

export function ProRequestsFeed({ initialItems }: Props) {
  const [items, setItems] = useState<ServiceRequestProDto[]>(initialItems);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  async function refresh() {
    setError(null);
    try {
      const res = await fetch("/api/pro/service-requests/feed", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as ServiceRequestProDto[] | { error?: string } | null;
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && !Array.isArray(payload) && payload.error
            ? payload.error
            : "Не удалось загрузить ленту"
        );
      }
      setItems(payload as ServiceRequestProDto[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить ленту");
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Лента заявок
          </Typography>
          <Typography color="text.secondary">
            Здесь появляются заявки клиентов: по шаблонам ваших услуг и свободные заявки с главной страницы.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => void refresh()} sx={{ whiteSpace: "nowrap" }}>
          Обновить
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {items.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography fontWeight={800} gutterBottom>
            Пока нет заявок
          </Typography>
          <Typography color="text.secondary">Лента заполнится, когда клиенты создадут заявки.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {items.map((item) => (
            <Paper key={item.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1.25}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ md: "center" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={800} noWrap>
                      {pickTitle(item)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Создано: {formatDate(item.createdAt)} · Диалогов: {item.conversationsCount}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Chip
                      size="small"
                      label={getServiceRequestStatusLabel(item.status)}
                      color={item.status === "LOCKED" || item.status === "ACTIVE" ? "success" : item.status === "CLOSED" ? "default" : "primary"}
                      variant={item.status === "CLOSED" ? "outlined" : "filled"}
                    />
                    {item.isLocked ? (
                      <Chip size="small" variant="outlined" label="Взято другим провайдером" />
                    ) : (
                      <Button component={Link} href={`/pro/requests/${item.id}`} size="small" variant="contained">
                        Открыть
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {item.location ? (
                  <Typography variant="body2" color="text.secondary">
                    Локация: {item.location}
                  </Typography>
                ) : null}

                {item.message ? (
                  <Typography color="text.secondary">{item.message}</Typography>
                ) : item.isLocked ? (
                  <Typography variant="body2" color="text.secondary">
                    Заявка уже взята в работу.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

