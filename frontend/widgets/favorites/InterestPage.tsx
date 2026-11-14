"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { favoritesJson } from "@/features/favorites/api";
import { useAppSelector } from "@/core/store/hooks";
import { displayCityName } from "@/shared/lib/format-city-label";
export type InterestedCustomer = {
  customerId: string;
  name: string;
  city?: { name: string } | null;
  profile: boolean;
  services: { id: string; title: string; available: boolean }[];
  conversationId: string | null;
  state: string;
};
export type InterestData = {
  providerId: string;
  profileCount: number;
  interestedCount: number;
  canContact: boolean;
  services: { id: string; title: string; count: number }[];
  items: InterestedCustomer[];
  hasMore: boolean;
};
const stateLabels: Record<string, string> = {
  NONE: "Не писали",
  WAITING: "Ожидаем ответ",
  ACTIVE: "Есть переписка",
  DECLINED: "Обращение отклонено",
  BLOCKED: "Заблокировано клиентом",
};
export function InterestPage() {
  const router = useRouter();
  const search = useSearchParams();
  const providerScope = useAppSelector(
    (state) => state.auth.user?.activeProviderId,
  );
  const [filter, setFilter] = useState(
    search.get("serviceId") ??
      (search.get("filter") === "profile" ? "profile" : "all"),
  );
  const [state, setState] = useState("");
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<InterestData | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<InterestedCustomer | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const operationId = useRef("");
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    const query = new URLSearchParams({ page: String(page) });
    if (filter === "profile") query.set("filter", "profile");
    else if (filter !== "all") query.set("serviceId", filter);
    if (state) query.set("state", state);
    void favoritesJson<InterestData>(`/api/pro/interest?${query}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Не удалось загрузить интерес клиентов",
          );
      });
    return () => controller.abort();
  }, [filter, state, page, attempt, providerScope]);
  async function send() {
    if (!selected || !body.trim() || sending) return;
    setSending(true);
    setSendError("");
    try {
      const result = await favoritesJson<{ conversationId: string }>(
        "/api/chat/direct",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: selected.customerId,
            body,
            clientMessageId: operationId.current,
          }),
        },
      );
      router.push(`/pro/chats/direct/${result.conversationId}`);
    } catch (reason) {
      setSendError(
        reason instanceof Error
          ? reason.message
          : "Не удалось отправить сообщение",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <Container
      maxWidth="xl"
      sx={{ py: 3 }}
    >
      <Stack spacing={2.5}>
        <Typography
          variant="h4"
          component="h1"
        >
          Интерес клиентов
        </Typography>
        <Typography color="text.secondary">
          Клиенты, сохранившие ваш профиль или услуги. Один клиент учитывается
          один раз в общем числе.
        </Typography>
        {error ? (
          <Alert
            severity="error"
            action={
              <Button onClick={() => setAttempt((value) => value + 1)}>
                Повторить
              </Button>
            }
          >
            {error}
          </Alert>
        ) : !data ? (
          <CircularProgress aria-label="Загрузка интереса клиентов" />
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                gap: 2,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: "background.secondary",
                }}
              >
                <Typography color="text.secondary">
                  Ваши услуги в избранном у клиентов
                </Typography>
                <Typography variant="h4">{data.interestedCount}</Typography>
              </Paper>
              <Paper
                component="button"
                elevation={0}
                onClick={() => {
                  setFilter("profile");
                  setPage(0);
                }}
                sx={{
                  p: 2,
                  bgcolor: "background.secondary",
                  textAlign: "left",
                  border: 0,
                  cursor: "pointer",
                  color: "text.primary",
                }}
              >
                <Typography color="text.secondary">
                  Вас добавили в избранное
                </Typography>
                <Typography variant="h4">{data.profileCount}</Typography>
              </Paper>
            </Box>
            <Stack
              direction="row"
              useFlexGap
              sx={{
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              {data.services.map((service) => (
                <Chip
                  key={service.id}
                  label={`${service.title}: ${service.count}`}
                  variant={filter === service.id ? "filled" : "outlined"}
                  onClick={() => {
                    setFilter(service.id);
                    setPage(0);
                  }}
                />
              ))}
            </Stack>
            {!data.canContact ? (
              <Alert
                severity="info"
                action={
                  <Button
                    component={Link}
                    href="/pro/settings/tariff"
                  >
                    Тарифы
                  </Button>
                }
              >
                Имена клиентов и первое обращение доступны на тарифе Бизнес.
              </Alert>
            ) : (
              <>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                >
                  <TextField
                    select
                    size="small"
                    label="Что сохранили"
                    value={filter}
                    onChange={(event) => {
                      setFilter(event.target.value);
                      setPage(0);
                    }}
                    sx={{ minWidth: 240 }}
                  >
                    <MenuItem value="all">Все клиенты</MenuItem>
                    <MenuItem value="profile">Профиль исполнителя</MenuItem>
                    {data.services.map((service) => (
                      <MenuItem
                        key={service.id}
                        value={service.id}
                      >
                        {service.title}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Общение"
                    value={state}
                    onChange={(event) => {
                      setState(event.target.value);
                      setPage(0);
                    }}
                    sx={{ minWidth: 220 }}
                  >
                    <MenuItem value="">Все состояния</MenuItem>
                    {Object.entries(stateLabels).map(([key, label]) => (
                      <MenuItem
                        key={key}
                        value={key}
                      >
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
                {data.items.length === 0 ? (
                  <Alert severity="info">
                    По выбранным условиям клиентов пока нет.
                  </Alert>
                ) : (
                  <Stack spacing={1}>
                    {data.items.map((customer) => (
                      <Paper
                        key={customer.customerId}
                        sx={{
                          p: 2,
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            md: "minmax(130px, 1fr) minmax(200px, 2fr) 130px 180px",
                          },
                          gap: 2,
                          alignItems: "center",
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Клиент
                          </Typography>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {customer.name}
                            {customer.city?.name.trim() ? (
                              <Box
                                component="span"
                                sx={{
                                  fontWeight: 400,
                                  color: "text.secondary",
                                }}
                              >
                                {" · "}{displayCityName(customer.city.name)}
                              </Box>
                            ) : null}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Услуги в избранном
                          </Typography>
                          {customer.services.length ? (
                            <Box component="details">
                              <Box
                                component="summary"
                                sx={{ cursor: "pointer" }}
                              >
                                {customer.services[0].title}
                                {customer.services.length > 1
                                  ? ` и ещё ${customer.services.length - 1}`
                                  : ""}
                              </Box>
                              {customer.services.map((service) => (
                                <Typography
                                  key={service.id}
                                  variant="body2"
                                >
                                  {service.title}
                                  {service.available ? "" : " · недоступна"}
                                </Typography>
                              ))}
                            </Box>
                          ) : (
                            <Typography>—</Typography>
                          )}
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Профиль в избранном
                          </Typography>
                          <Typography>
                            {customer.profile ? "Да" : "—"}
                          </Typography>
                        </Box>
                        <Stack spacing={0.5}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {stateLabels[customer.state]}
                          </Typography>
                          {customer.conversationId ? (
                            <Button
                              component={Link}
                              href={`/pro/chats/direct/${customer.conversationId}`}
                              size="small"
                            >
                              Открыть чат
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{
                                color: "text.primary",
                                borderColor: "text.primary",
                                "&:hover": {
                                  borderColor: "text.primary",
                                },
                              }}
                              onClick={() => {
                                setSelected(customer);
                                setBody("");
                                setSendError("");
                                operationId.current = crypto.randomUUID();
                              }}
                            >
                              Написать
                            </Button>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
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
                    disabled={!data.hasMore}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Далее
                  </Button>
                </Stack>
              </>
            )}
          </>
        )}
      </Stack>
      <Dialog
        open={Boolean(selected)}
        onClose={() => {
          if (!sending) setSelected(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Написать {selected?.name}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ pt: 1 }}
          >
            <Alert severity="info">
              До ответа клиента можно отправить одно сообщение. После его ответа
              переписка продолжится.
            </Alert>
            {sendError ? <Alert severity="error">{sendError}</Alert> : null}
            <TextField
              size="small"
              label="Сообщение"
              multiline
              minRows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 5000 } }}
              disabled={sending}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={sending}
            onClick={() => setSelected(null)}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            disabled={sending || !body.trim()}
            onClick={() => void send()}
          >
            {sending ? "Отправляем…" : "Отправить"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
