"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "@/shared/ui/Link";
import { money, statusNames, type BillingOrder } from "@/widgets/billing/model";

type SlugOrder = BillingOrder & {
  expiresAt: string;
  targetSlug: string;
  appliedAt: string | null;
  needsReview: boolean;
};
type Status = {
  slug: string;
  nextChangeAt: string | null;
  amount: number;
  enabled: boolean;
  order: SlugOrder | null;
};
type Quote = {
  slug: string;
  available: boolean;
  amount: number;
  offerVersion: string;
  enabled: boolean;
};
const closedStatuses = new Set([
  "CONFIRMED",
  "REJECTED",
  "CANCELED",
  "DEADLINE_EXPIRED",
  "AUTH_FAIL",
  "REVERSED",
  "REFUNDED",
  "PARTIAL_REFUNDED",
  "INIT_FAILED",
]);

async function read<T>(response: Response): Promise<T> {
  const value = await response.json();
  if (!response.ok)
    throw new Error(
      typeof value.message === "string"
        ? value.message
        : value.error || "Не удалось выполнить запрос",
    );
  return value;
}

export function ProviderSlugEditor({
  providerId,
  slug,
  baseUrl,
  canEdit,
  onChanged,
}: {
  providerId: string;
  slug: string;
  baseUrl: string;
  canEdit: boolean;
  onChanged: (slug: string) => void;
}) {
  const router = useRouter();
  const endpoint = `/api/billing/providers/${providerId}`;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(slug);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [accepted, setAccepted] = useState(false);
  const operation = useRef<{ slug: string; id: string } | null>(null);
  const normalized = value.trim().toLowerCase();

  const loadStatus = useCallback(async () => {
    const next = await read<Status>(
      await fetch(`${endpoint}/slug-change`, { cache: "no-store" }),
    );
    setStatus(next);
    return next;
  }, [endpoint]);

  useEffect(() => {
    if (!canEdit) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const returnedOrder = new URL(window.location.href).searchParams.get(
      "slugOrder",
    );
    async function update(attempt = 0) {
      try {
        if (returnedOrder && /^[a-f\d-]{36}$/i.test(returnedOrder)) {
          await read(
            await fetch(`${endpoint}/orders/${returnedOrder}/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            }),
          );
        }
        if (stopped) return;
        const next = await loadStatus();
        if (stopped) return;
        if (next.slug !== slug) {
          onChanged(next.slug);
          router.refresh();
        }
        if (
          returnedOrder &&
          next.order &&
          !closedStatuses.has(next.order.status) &&
          attempt < 10
        )
          timer = setTimeout(() => void update(attempt + 1), 3000);
      } catch (cause) {
        if (!stopped)
          setError(
            cause instanceof Error
              ? cause.message
              : "Не удалось проверить оплату",
          );
      }
    }
    void update();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [canEdit, endpoint, loadStatus, onChanged, router, slug]);

  useEffect(() => {
    if (
      !editing ||
      normalized === slug ||
      !/^[a-z0-9]{1,64}$/.test(normalized)
    ) {
      setChecking(false);
      setAvailable(null);
      return;
    }
    let stopped = false;
    setAvailable(null);
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const result = await read<{ available: boolean }>(
          await fetch(
            `/api/providers/slug-check?slug=${encodeURIComponent(normalized)}`,
          ),
        );
        if (!stopped) setAvailable(result.available);
      } catch {
        if (!stopped)
          setError("Не удалось проверить адрес. Попробуйте сохранить ещё раз");
      } finally {
        if (!stopped) setChecking(false);
      }
    }, 450);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [editing, normalized, slug]);

  async function save() {
    if (busy || checking || available === false || normalized === slug) return;
    setBusy(true);
    setError("");
    try {
      const result = await read<Quote>(
        await fetch(`${endpoint}/slug-quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: normalized }),
        }),
      );
      if (!result.available) throw new Error("Этот адрес занят");
      setQuote(result);
      setAccepted(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Не удалось проверить адрес",
      );
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!quote || !accepted || busy) return;
    setBusy(true);
    setError("");
    if (operation.current?.slug !== quote.slug)
      operation.current = { slug: quote.slug, id: crypto.randomUUID() };
    try {
      const order = await read<BillingOrder>(
        await fetch(`${endpoint}/slug-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: quote.slug,
            operationId: operation.current.id,
            acceptedOfferVersion: quote.offerVersion,
            expectedAmount: quote.amount,
          }),
        }),
      );
      if (order.paymentUrl) {
        window.location.assign(order.paymentUrl);
      } else {
        if (closedStatuses.has(order.status)) operation.current = null;
        await loadStatus();
        setQuote(null);
        setError("Проверьте статус платежа перед повторной оплатой");
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Не удалось создать оплату",
      );
      // Keep the operation ID on uncertain network outcomes to avoid a second charge.
      const next = await loadStatus().catch(() => null);
      if (
        next?.order?.targetSlug === quote.slug &&
        closedStatuses.has(next.order.status)
      )
        operation.current = null;
    } finally {
      setBusy(false);
    }
  }

  async function refreshPayment() {
    if (!status?.order || busy) return;
    setBusy(true);
    setError("");
    try {
      await read(
        await fetch(`${endpoint}/orders/${status.order.id}/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
      );
      const next = await loadStatus();
      if (next.slug !== slug) {
        onChanged(next.slug);
        router.refresh();
        setEditing(false);
      }
      if (next.order && closedStatuses.has(next.order.status))
        operation.current = null;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Не удалось проверить оплату",
      );
    } finally {
      setBusy(false);
    }
  }

  const cooldown =
    status?.nextChangeAt && new Date(status.nextChangeAt) > new Date();
  const unsettled = status?.order && !closedStatuses.has(status.order.status);
  const pending = unsettled && new Date(status.order!.expiresAt) > new Date();
  const canSave =
    /^[a-z0-9]{1,64}$/.test(normalized) &&
    normalized !== slug &&
    available !== false &&
    !checking &&
    !cooldown &&
    !pending;

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Typography
        component="label"
        htmlFor={editing ? "provider-profile-slug" : undefined}
        variant="body2"
      >
        Ссылка на ваш профиль
      </Typography>
      <Stack
        direction={{ xs: "column", tablet: "row" }}
        spacing={1.5}
        sx={{
          alignItems: "flex-start",
          minWidth: 0,
          maxWidth: "100%",
        }}
      >
        <Stack
          spacing={0.5}
          sx={{
            flex: 1,
            width: "100%",
            minWidth: 0,
          }}
        >
          {editing ? (
            <>
              <TextField
                id="provider-profile-slug"
                size="small"
                variant="outlined"
                fullWidth
                value={value}
                onChange={(event) => {
                  setValue(
                    event.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
                  );
                  setAvailable(null);
                  setError("");
                }}
                disabled={busy}
                placeholder="ivanpetrov123"
                helperText="Только английские буквы и цифры, до 64 символов"
                slotProps={{
                  htmlInput: {
                    maxLength: 64,
                    autoCapitalize: "none",
                    autoComplete: "off",
                    spellCheck: false,
                    "aria-label": "Новый адрес профиля",
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": { top: 0 },
                  "& .MuiInputBase-input, & .MuiInputBase-input:focus, & .MuiInputBase-input:focus-visible":
                    {
                      border: 0,
                      outline: "none",
                      boxShadow: "none",
                    },
                }}
              />
              <Typography
                variant="caption"
                aria-live="polite"
                sx={{ color: "text.primary" }}
              >
                {checking
                  ? "Проверяем доступность…"
                  : normalized === slug
                    ? "Это текущий URL"
                    : available === true
                      ? "Адрес доступен"
                      : available === false
                        ? "Адрес занят"
                        : "Введите новый адрес"}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.primary",
                  overflowWrap: "anywhere",
                }}
              >
                Превью:{" "}
                <Box component="span" sx={{ color: "text.primary" }}>
                  {baseUrl}
                  {normalized || slug}
                </Box>
              </Typography>
            </>
          ) : (
            <Box
              sx={{
                p: 1.5,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.paper",
                minWidth: 0,
                maxWidth: "100%",
                overflowWrap: "anywhere",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {baseUrl}
                <Box
                  component="span"
                  sx={{
                    fontWeight: 600,
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  }}
                >
                  {slug}
                </Box>
              </Typography>
            </Box>
          )}
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexShrink: 0,
            "& .MuiButton-outlined": {
              color: "text.primary",
              borderColor: "divider",
              bgcolor: "background.paper",
            },
          }}
        >
          {editing ? (
            <>
              <Button
                variant="contained"
                onClick={() => void save()}
                loading={busy}
                disabled={!canSave}
              >
                Сохранить
              </Button>
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
              >
                Отмена
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={() =>
                  void navigator.clipboard.writeText(`${baseUrl}${slug}`)
                }
              >
                Копировать
              </Button>
              <Button
                variant="outlined"
                disabled={!canEdit || busy}
                onClick={() => {
                  setEditing(true);
                  setValue(slug);
                  setError("");
                }}
              >
                Изменить адрес
              </Button>
            </>
          )}
        </Stack>
      </Stack>
      {canEdit && (
        <Typography variant="caption" sx={{ color: "warning.main" }}>
          Смена адреса — {money(status?.amount ?? 100000)} ₽, отдельно от
          тарифа. Один раз в месяц.
          {cooldown && status?.nextChangeAt
            ? ` Следующая смена доступна с ${new Date(status.nextChangeAt).toLocaleDateString("ru-RU")}.`
            : ""}
        </Typography>
      )}
      {status?.order?.needsReview ? (
        <Alert severity="warning">
          Платёж требует проверки. Обратитесь в поддержку: support@brobear.ru.
          Текущий адрес: {status.slug}.
        </Alert>
      ) : status?.order?.appliedAt && status.order.status === "CONFIRMED" ? (
        <Alert severity="success">
          Адрес изменён: {baseUrl}
          {status.slug}
        </Alert>
      ) : (
        status?.order && (
          <Alert severity={pending ? "info" : "warning"}>
            Смена адреса на {status.order.targetSlug}:{" "}
            {unsettled && !pending
              ? "Срок оплаты истёк. Проверьте статус платежа"
              : (statusNames[status.order.status] ?? status.order.status)}
            .
            {unsettled && (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  mt: 1,
                  flexWrap: "wrap",
                }}
              >
                {status.order.paymentUrl && (
                  <Button component="a" href={status.order.paymentUrl}>
                    Продолжить оплату
                  </Button>
                )}
                <Button disabled={busy} onClick={() => void refreshPayment()}>
                  Проверить оплату
                </Button>
              </Stack>
            )}
          </Alert>
        )
      )}
      {error && !quote && <Alert severity="error">{error}</Alert>}
      <Dialog
        open={Boolean(quote)}
        onClose={() => {
          if (!busy) setQuote(null);
        }}
        maxWidth="sm"
        fullWidth
        aria-labelledby="slug-payment-title"
      >
        <DialogTitle id="slug-payment-title">Смена адреса профиля</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography
              sx={{
                color: "text.primary",
                overflowWrap: "anywhere",
              }}
            >
              {baseUrl}
              {quote?.slug}
            </Typography>
            <Alert severity="success">Адрес доступен</Alert>
            <Typography variant="caption" sx={{ color: "warning.main" }}>
              Стоимость — <strong>{money(quote?.amount ?? 100000)} ₽</strong>.
              Разовая оплата, отдельно от тарифа.
            </Typography>
            <Typography>
              Менять адрес можно один раз в месяц. Следующая смена — через
              календарный месяц после успешного изменения.
            </Typography>
            <Typography variant="body2">
              Адрес изменится после подтверждения оплаты. Старый адрес
              перестанет вести на ваш профиль. Обновите ссылки, которыми вы
              поделились.
            </Typography>
            <FormControlLabel
              sx={{
                alignItems: "flex-start",
                m: 0,
              }}
              control={
                <Checkbox
                  checked={accepted}
                  disabled={busy}
                  onChange={(event) => setAccepted(event.target.checked)}
                />
              }
              label={
                <Typography variant="body2">
                  Принимаю{" "}
                  <Link href="/offer" target="_blank" rel="noopener noreferrer">
                    условия оферты
                  </Link>{" "}
                  от {quote?.offerVersion} и условия смены адреса.
                </Typography>
              }
            />
            {quote && !quote.enabled && (
              <Alert severity="warning">
                Оплата временно недоступна. Попробуйте позже.
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setQuote(null)}>
            Отмена
          </Button>
          <Button
            variant="contained"
            loading={busy}
            disabled={!accepted || !quote?.enabled}
            onClick={() => void pay()}
          >
            Оплатить {money(quote?.amount ?? 100000)} ₽
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
