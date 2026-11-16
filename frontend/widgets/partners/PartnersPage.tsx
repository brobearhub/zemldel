"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import { LocationField } from "@/features/select-city/ui/LocationField";
import type { CitySuggestItemDto } from "@/entities/city";
import { CdnOptimizedAvatar } from "@/shared/ui/cdn-image";
import { teamApi } from "@/shared/lib/team-api";
import {
  partnershipLabel,
  type DirectoryResponse,
  type PartnerProvider,
  type PartnersResponse,
  type Partnership,
} from "./partner-types";

type Category = { id: string; name: string; parentId: string | null };
type DirectoryFilters = Record<
  "search" | "providerSearch" | "cityId" | "categoryId" | "subcategoryId",
  string
>;
const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Не удалось выполнить запрос";

function ProviderIdentity({
  provider,
  email,
}: {
  provider: PartnerProvider | null;
  email?: string | null;
}) {
  const name = provider?.name ?? email ?? "Приглашённый исполнитель";
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        minWidth: 0,
        alignItems: "center",
        flex: 1,
      }}
    >
      <CdnOptimizedAvatar
        src={provider?.image ?? undefined}
        alt={name}
        sizes="44px"
        sx={{
          width: 44,
          height: 44,
        }}
      >
        {provider ? name.slice(0, 1) : <MailOutlineRoundedIcon />}
      </CdnOptimizedAvatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component={provider ? Link : "p"}
          href={provider ? `/providers/${provider.slug}` : undefined}
          sx={{
            fontWeight: 700,

            color: "text.primary",

            textDecoration: "none",

            overflowWrap: "anywhere",
          }}
        >
          {name}
        </Typography>
        {provider?.city ? (
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {provider.city.name} · {provider.city.regionName}
          </Typography>
        ) : null}
        {provider?.subtitle ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflowWrap: "anywhere" }}
          >
            {provider.subtitle}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

export function PartnersPage() {
  const membership = useAppSelector((state) =>
    getActiveMembership(state.auth.user),
  );
  if (!membership)
    return <Alert severity="info">Выберите профиль исполнителя.</Alert>;
  return <PartnersWorkspace key={membership.providerId} />;
}

export function PartnersWorkspace() {
  const router = useRouter();
  const [mine, setMine] = useState<Partnership[] | null>(null);
  const [mineError, setMineError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [directory, setDirectory] = useState<DirectoryResponse | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [submittedFilters, setSubmittedFilters] =
    useState<DirectoryFilters | null>(null);
  const directoryRequest = useRef<AbortController | null>(null);
  const [search, setSearch] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const [city, setCity] = useState<CitySuggestItemDto | null>(null);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const shortSearch = search.trim().length > 0 && search.trim().length < 3;
  const shortProviderSearch =
    providerSearch.trim().length > 0 && providerSearch.trim().length < 3;

  useEffect(
    () => () => {
      directoryRequest.current?.abort();
      directoryRequest.current = null;
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    teamApi<Category[]>("/api/service-categories", {
      signal: controller.signal,
    })
      .then((items) => {
        setCategories(items);
        setCategoryError(null);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setCategoryError(errorMessage(reason));
      });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () =>
      teamApi<PartnersResponse>("/api/pro/partners", {
        signal: controller.signal,
      })
        .then((data) => {
          if (!controller.signal.aborted) {
            setMine(data.items);
            setMineError(null);
          }
        })
        .catch((reason) => {
          if (!controller.signal.aborted) setMineError(errorMessage(reason));
        });
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [revision]);

  async function loadDirectory(
    filters: DirectoryFilters,
    page: number,
    append = false,
  ) {
    directoryRequest.current?.abort();
    const controller = new AbortController();
    directoryRequest.current = controller;
    const query = new URLSearchParams({ page: String(page) });
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    setDirectoryLoading(!append);
    setLoadingMore(append);
    if (!append) setDirectory(null);
    setDirectoryError(null);
    try {
      const data = await teamApi<DirectoryResponse>(
        `/api/pro/partners/directory?${query}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setDirectory((current) => {
        if (!append || !current) return data;
        const loadedIds = new Set(current.items.map((item) => item.id));
        return {
          ...data,
          items: [
            ...current.items,
            ...data.items.filter((item) => !loadedIds.has(item.id)),
          ],
        };
      });
    } catch (reason) {
      if (!controller.signal.aborted) setDirectoryError(errorMessage(reason));
    } finally {
      if (directoryRequest.current === controller) {
        directoryRequest.current = null;
        setDirectoryLoading(false);
        setLoadingMore(false);
      }
    }
  }

  function searchDirectory() {
    if (shortSearch || shortProviderSearch) return;
    const filters = {
      search: search.trim(),
      providerSearch: providerSearch.trim(),
      cityId: city?.id ?? "",
      categoryId: category,
      subcategoryId: subcategory,
    };
    setSubmittedFilters(filters);
    void loadDirectory(filters, 1);
  }

  function loadMore() {
    if (directoryRequest.current || !directory?.hasMore || !submittedFilters)
      return;
    void loadDirectory(submittedFilters, directory.page + 1, true);
  }

  function resetSearch() {
    directoryRequest.current?.abort();
    directoryRequest.current = null;
    setSearch("");
    setProviderSearch("");
    setCity(null);
    setCategory("");
    setSubcategory("");
    setSubmittedFilters(null);
    setDirectory(null);
    setDirectoryError(null);
    setDirectoryLoading(false);
    setLoadingMore(false);
  }

  async function action(
    key: string,
    operation: () => Promise<unknown>,
    success?: string,
  ) {
    if (busy) return;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await operation();
      setRevision((value) => value + 1);
      if (success) setNotice(success);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  }

  const write = (partner: Partnership) =>
    action(partner.id, async () => {
      const response = await teamApi<{ conversationId: string }>(
        `/api/pro/partners/${partner.id}/conversation`,
        post({}),
      );
      router.push(`/pro/chats/direct/${response.conversationId}`);
    });
  const respond = (
    partner: Partnership,
    response: "accept" | "decline" | "cancel",
  ) =>
    action(
      partner.id,
      () =>
        teamApi(
          `/api/pro/partners/${partner.id}/respond`,
          post({ action: response }),
        ),
      response === "accept"
        ? "Партнёрство подтверждено. Теперь можно написать или передать заявку."
        : "Приглашение закрыто.",
    );

  return (
    <Stack
      spacing={3}
      sx={{
        "& .MuiButton-outlined.MuiButton-colorPrimary:not(.Mui-disabled), & .MuiButton-text.MuiButton-colorPrimary:not(.Mui-disabled)":
          {
            color: "text.primary",
          },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: { sm: "center" },
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h1"
            sx={{
              fontWeight: 700,
              mb: 1,
            }}
          >
            Партнёры
          </Typography>
          <Typography color="text.secondary">
            Находите исполнителей, общайтесь и передавайте заявки партнёрам.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          startIcon={<PersonAddAltOutlinedIcon />}
          onClick={() => {
            setEmailOpen(true);
            setEmailError(null);
          }}
          sx={{
            flexShrink: 0,
            alignSelf: {
              xs: "flex-start",
              sm: "center",
            },
          }}
        >
          Добавить по почте
        </Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      <Paper
        component="section"
        aria-labelledby="my-partners-title"
        sx={{
          p: {
            xs: 2,
            sm: 2.5,
          },
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center" }}
          >
            <HandshakeOutlinedIcon color="action" />
            <Typography
              id="my-partners-title"
              component="h2"
              variant="h5"
              sx={{ fontWeight: 700 }}
            >
              Мои партнёры
            </Typography>
            {mine ? (
              <Chip
                size="small"
                label={mine.length}
              />
            ) : null}
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Чат и передача заявок доступны после подтверждения приглашения.
          </Typography>
          {mineError ? (
            <Alert
              severity="error"
              action={
                <Button onClick={() => setRevision((value) => value + 1)}>
                  Повторить
                </Button>
              }
            >
              {mineError}
            </Alert>
          ) : null}
          {!mine && !mineError ? (
            <CircularProgress
              size={24}
              aria-label="Загружаем партнёров"
            />
          ) : null}
          {mine?.length === 0 ? (
            <Box sx={{ py: 2 }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                }}
              >
                Пока нет партнёров
              </Typography>
              <Typography color="text.secondary">
                Найдите исполнителя в каталоге ниже или пригласите его по почте.
              </Typography>
            </Box>
          ) : null}
          <Stack
            divider={<Divider />}
            spacing={2}
          >
            {mine?.map((partner) => (
              <Stack
                key={partner.id}
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                sx={{ alignItems: { md: "center" } }}
              >
                <ProviderIdentity
                  provider={partner.provider}
                  email={partner.email}
                />
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap",
                    flexShrink: 0,
                  }}
                >
                  <Chip
                    size="small"
                    label={partnershipLabel(partner)}
                    color={partner.status === "ACTIVE" ? "success" : "default"}
                    variant="outlined"
                  />
                  {partner.status === "ACTIVE" ? (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ChatBubbleOutlineRoundedIcon />}
                      loading={busy === partner.id}
                      disabled={Boolean(busy) && busy !== partner.id}
                      onClick={() => void write(partner)}
                    >
                      Написать
                    </Button>
                  ) : partner.incoming ? (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        loading={busy === partner.id}
                        disabled={Boolean(busy) && busy !== partner.id}
                        onClick={() => void respond(partner, "accept")}
                      >
                        Принять
                      </Button>
                      <Button
                        size="small"
                        disabled={Boolean(busy)}
                        onClick={() => void respond(partner, "decline")}
                      >
                        Отклонить
                      </Button>
                    </>
                  ) : (
                    <>
                      {partner.email && !partner.provider ? (
                        <Button
                          size="small"
                          disabled={Boolean(busy)}
                          onClick={() => {
                            setEmail(partner.email!);
                            setEmailOpen(true);
                            setEmailError(null);
                          }}
                        >
                          Отправить повторно
                        </Button>
                      ) : null}
                      <Button
                        size="small"
                        disabled={Boolean(busy)}
                        onClick={() => void respond(partner, "cancel")}
                      >
                        Отменить приглашение
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Paper>
      <Stack
        component="section"
        aria-labelledby="partners-catalog-title"
        spacing={2}
      >
        <Typography
          id="partners-catalog-title"
          component="h2"
          variant="h5"
          sx={{ fontWeight: 700 }}
        >
          Найти исполнителя
        </Typography>
        <Paper
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            searchDirectory();
          }}
          sx={{ p: 2 }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ alignItems: { sm: "flex-end" } }}
            >
              <TextField
                fullWidth
                size="small"
                label="Поиск по названию услуги"
                placeholder="Например, межевание участка"
                helperText={shortSearch ? "Минимум 3 символа" : "От 3 символов"}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: { maxLength: 120 },
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Фамилия или наименование организации"
                placeholder="Например, Медведев или ГеоПроф"
                helperText={
                  shortProviderSearch ? "Минимум 3 символа" : "От 3 символов"
                }
                value={providerSearch}
                onChange={(event) => {
                  setProviderSearch(event.target.value);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: { maxLength: 120 },
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              />
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(3, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr)) auto",
                },
                gap: 2,
                alignItems: "end",
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <LocationField
                  label="Город исполнителя"
                  emptyLabel="Все города"
                  value={city}
                  onChange={(value) => {
                    setCity(value);
                  }}
                />
              </Box>
              <TextField
                select
                label="Категория"
                size="small"
                slotProps={{ select: { displayEmpty: true } }}
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setSubcategory("");
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <MenuItem value="">Все категории</MenuItem>
                {categories
                  .filter((item) => !item.parentId)
                  .map((item) => (
                    <MenuItem
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </MenuItem>
                  ))}
              </TextField>
              <TextField
                select
                label="Подкатегория"
                size="small"
                slotProps={{ select: { displayEmpty: true } }}
                value={subcategory}
                disabled={!category}
                onChange={(event) => {
                  setSubcategory(event.target.value);
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <MenuItem value="">Все подкатегории</MenuItem>
                {categories
                  .filter((item) => item.parentId === category)
                  .map((item) => (
                    <MenuItem
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </MenuItem>
                  ))}
              </TextField>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  justifyContent: "flex-end",
                  gridColumn: {
                    xs: "auto",
                    sm: "1 / -1",
                    lg: "auto",
                  },
                  pb: { lg: 0.5 },
                }}
              >
                <Button
                  type="submit"
                  size="small"
                  variant="contained"
                  startIcon={<SearchRoundedIcon />}
                  loading={directoryLoading}
                  disabled={shortSearch || shortProviderSearch}
                  sx={{ px: 3 }}
                >
                  Поиск
                </Button>
                {search ||
                providerSearch ||
                city ||
                category ||
                subcategory ||
                submittedFilters ? (
                  <Button
                    size="small"
                    color="warning"
                    onClick={resetSearch}
                  >
                    Сбросить
                  </Button>
                ) : null}
              </Stack>
            </Box>
            {categoryError ? (
              <Alert
                severity="error"
                action={
                  <Button onClick={() => setRevision((value) => value + 1)}>
                    Повторить
                  </Button>
                }
              >
                {categoryError}
              </Alert>
            ) : null}
          </Stack>
        </Paper>
        <Box
          aria-live="polite"
          aria-busy={directoryLoading || loadingMore}
        >
          {shortSearch || shortProviderSearch ? (
            <Alert severity="info">
              {shortSearch
                ? "Введите минимум 3 символа для поиска по названию услуги."
                : "Введите минимум 3 символа для поиска по фамилии или наименованию организации."}
            </Alert>
          ) : null}
          {directoryLoading ? (
            <CircularProgress
              size={24}
              aria-label="Ищем исполнителей"
            />
          ) : directoryError && !directory ? (
            <Alert
              severity="error"
              action={
                <Button
                  onClick={() => {
                    if (submittedFilters)
                      void loadDirectory(submittedFilters, 1);
                  }}
                >
                  Повторить
                </Button>
              }
            >
              {directoryError}
            </Alert>
          ) : null}
          {directory ? (
            <Stack spacing={2}>
              {directory.items.length === 0 ? (
                <Paper sx={{ p: 3 }}>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                    }}
                  >
                    Исполнители не найдены
                  </Typography>
                  <Typography color="text.secondary">
                    Попробуйте другой город, категорию, название услуги или
                    исполнителя.
                  </Typography>
                </Paper>
              ) : null}
              {directory.items.map((provider) => {
                const existing = mine?.find(
                  (item) => item.provider?.id === provider.id,
                );
                return (
                  <Paper
                    key={provider.id}
                    sx={{ p: 2 }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      sx={{ alignItems: { sm: "center" } }}
                    >
                      <Stack
                        spacing={1.5}
                        sx={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <ProviderIdentity provider={provider} />
                        {provider.services?.length ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            sx={{ flexWrap: "wrap" }}
                          >
                            {provider.services.map((service) => (
                              <Typography
                                key={service.id}
                                variant="body2"
                                sx={{
                                  bgcolor: "action.hover",

                                  px: 1,

                                  py: 0.5,

                                  borderRadius: 1,

                                  overflowWrap: "anywhere",
                                }}
                              >
                                {service.title}
                              </Typography>
                            ))}
                          </Stack>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            Услуги пока не опубликованы
                          </Typography>
                        )}
                      </Stack>
                      {existing?.status === "ACTIVE" ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ChatBubbleOutlineRoundedIcon />}
                          disabled={Boolean(busy)}
                          onClick={() => void write(existing)}
                        >
                          Написать
                        </Button>
                      ) : existing ? (
                        <Chip
                          size="small"
                          label={partnershipLabel(existing)}
                          variant="outlined"
                        />
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PersonAddAltOutlinedIcon />}
                          loading={busy === provider.id}
                          disabled={
                            (Boolean(busy) && busy !== provider.id) || !mine
                          }
                          onClick={() =>
                            void action(
                              provider.id,
                              () =>
                                teamApi(
                                  "/api/pro/partners",
                                  post({ providerId: provider.id }),
                                ),
                              "Приглашение отправлено. Ожидаем подтверждения исполнителя.",
                            )
                          }
                          sx={{
                            flexShrink: 0,

                            alignSelf: {
                              xs: "flex-start",
                              sm: "center",
                            },
                          }}
                        >
                          В партнёры
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
              {directoryError ? (
                <Alert severity="error">{directoryError}</Alert>
              ) : null}
              {directory.hasMore ? (
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    loading={loadingMore}
                    onClick={loadMore}
                  >
                    Ещё
                  </Button>
                </Box>
              ) : null}
            </Stack>
          ) : null}
        </Box>
      </Stack>
      <Dialog
        open={emailOpen}
        onClose={() => {
          if (busy !== "email") setEmailOpen(false);
        }}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            component: "form",
            onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (busy) return;
              setBusy("email");
              setEmailError(null);
              try {
                const result = await teamApi<{ delivery: "EMAIL" | "IN_APP" }>(
                  "/api/pro/partners/email",
                  post({ email: email.trim() }),
                );
                setEmailOpen(false);
                setEmail("");
                setRevision((value) => value + 1);
                setNotice(
                  result.delivery === "EMAIL"
                    ? "Письмо с приглашением отправлено."
                    : "Приглашение появилось в кабинете исполнителя. Ожидаем подтверждения.",
                );
              } catch (reason) {
                setEmailError(errorMessage(reason));
              } finally {
                setBusy(null);
              }
            },
          },
        }}
      >
        <DialogTitle>Добавить партнёра по почте</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ pt: 1 }}
          >
            <Typography color="text.secondary">
              Введите почту аккаунта исполнителя. Если он ещё не
              зарегистрирован, отправим письмо со ссылкой на приглашение.
            </Typography>
            <TextField
              label="Электронная почта исполнителя"
              type="email"
              autoComplete="email"
              required
              autoFocus
              fullWidth
              size="small"
              value={email}
              disabled={busy === "email"}
              onChange={(event) => setEmail(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 254 } }}
            />
            {emailError ? <Alert severity="error">{emailError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            size="small"
            color="inherit"
            disabled={busy === "email"}
            onClick={() => setEmailOpen(false)}
          >
            Отмена
          </Button>
          <Button
            size="small"
            variant="contained"
            type="submit"
            loading={busy === "email"}
          >
            Пригласить
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
