"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ServiceCard, type ServiceCardItem } from "@/entities/service";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import { favoritesJson } from "@/features/favorites/api";
import type { FavoriteKind } from "@/features/favorites/store";
import { CdnAvatar } from "@/shared/ui/cdn-image";
type FavoriteItem = {
  id: string;
  service?: ServiceCardItem | null;
  provider?: {
    name: string;
    slug: string;
    image: string | null;
    city: { name: string } | null;
    rating: number | null;
    reviewCount: number;
  };
};
export function FavoritesPage({ kind }: { kind: FavoriteKind }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{
    items: FavoriteItem[];
    hasMore: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    void favoritesJson<{ items: FavoriteItem[]; hasMore: boolean }>(
      `/api/favorites/${kind}?page=${page}`,
      { signal: controller.signal },
    )
      .then(setData)
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Не удалось загрузить избранное",
          );
      });
    return () => controller.abort();
  }, [kind, page, attempt]);
  useEffect(() => {
    const handler = (event: Event) => {
      const change = (event as CustomEvent).detail;
      if (change.kind === kind && !change.saved) reload();
    };
    window.addEventListener("favorites.changed", handler);
    return () => window.removeEventListener("favorites.changed", handler);
  }, [kind, reload]);
  return (
    <Container
      maxWidth="xl"
      sx={{ py: 3 }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography
            variant="h4"
            component="h1"
          >
            Избранное — {kind === "services" ? "услуги" : "исполнители"}
          </Typography>
          <Typography
            sx={{
              mt: 1,
              color: "text.secondary",
            }}
          >
            Сохранённые предложения доступны на любом устройстве после входа.
          </Typography>
        </Box>
        <Alert severity="info">
          Исполнитель видит ваше имя в формате «Имя Ф.» и может предложить
          помощь в чате. Вы можете отклонить обращение или заблокировать
          исполнителя.
        </Alert>
        {error ? (
          <Alert
            severity="error"
            action={<Button onClick={reload}>Повторить</Button>}
          >
            {error}
          </Alert>
        ) : !data ? (
          <CircularProgress aria-label="Загрузка избранного" />
        ) : data.items.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
            }}
          >
            <Typography>
              Здесь пока пусто. Сохраняйте понравившиеся{" "}
              {kind === "services" ? "услуги" : "профили исполнителей"} с
              помощью сердца.
            </Typography>
            <Button
              component={Link}
              href="/"
              sx={{ mt: 2 }}
            >
              Найти услуги
            </Button>
          </Paper>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {data.items.map((item) =>
              kind === "services" && item.service ? (
                <ServiceCard
                  key={item.id}
                  item={item.service}
                  favoriteAction={
                    <FavoriteButton
                      kind={kind}
                      id={item.id}
                      initiallySaved
                    />
                  }
                />
              ) : (
                <Paper
                  key={item.id}
                  sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  {item.provider ? (
                    <>
                      <CdnAvatar
                        src={item.provider.image ?? undefined}
                        alt=""
                      />
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          component={Link}
                          href={`/providers/${item.provider.slug}`}
                          sx={{
                            fontWeight: 700,
                            color: "text.primary",
                            textDecoration: "none",
                          }}
                        >
                          {item.provider.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          {item.provider.city?.name}
                        </Typography>
                        {item.provider.rating != null ? (
                          <Typography variant="body2">
                            ★ {item.provider.rating.toFixed(1)} · Отзывов:{" "}
                            {item.provider.reviewCount}
                          </Typography>
                        ) : null}
                      </Box>
                    </>
                  ) : (
                    <Typography sx={{ flex: 1 }}>Услуга недоступна</Typography>
                  )}
                  <FavoriteButton
                    kind={kind}
                    id={item.id}
                    initiallySaved
                  />
                </Paper>
              ),
            )}
          </Box>
        )}
        <Stack
          direction="row"
          spacing={1}
        >
          <Button
            disabled={page === 0}
            onClick={() => setPage((value) => value - 1)}
          >
            Назад
          </Button>
          <Typography sx={{ alignSelf: "center" }}>
            Страница {page + 1}
          </Typography>
          <Button
            disabled={!data?.hasMore}
            onClick={() => setPage((value) => value + 1)}
          >
            Далее
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
