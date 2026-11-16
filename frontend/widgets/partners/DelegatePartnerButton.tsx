"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import { teamApi } from "@/shared/lib/team-api";
import type { PartnersResponse, Partnership } from "./partner-types";

export function DelegatePartnerButton({
  requestId,
  blockedReason,
}: {
  requestId: string;
  blockedReason?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="small"
        variant="text"
        color="inherit"
        startIcon={<ForwardToInboxOutlinedIcon />}
        onClick={() => setOpen(true)}
      >
        Делегировать партнёру
      </Button>
      {open ? (
        <DelegatePartnerDialog
          requestId={requestId}
          blockedReason={blockedReason}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

export function DelegatePartnerDialog({
  requestId,
  blockedReason,
  onClose,
}: {
  requestId: string;
  blockedReason?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [partners, setPartners] = useState<Partnership[] | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (blockedReason) return;
    const controller = new AbortController();
    setError(null);
    teamApi<PartnersResponse>("/api/pro/partners", {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted)
          setPartners(
            data.items.filter(
              (item) => item.status === "ACTIVE" && item.provider,
            ),
          );
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [blockedReason, attempt]);
  const selected = partners?.find((item) => item.provider?.id === partnerId);
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      fullWidth
      maxWidth="sm"
      aria-labelledby="delegate-partner-title"
    >
      <DialogTitle id="delegate-partner-title">
        Делегировать заявку партнёру
      </DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 1 }}
        >
          {blockedReason ? (
            <Alert severity="info">{blockedReason}</Alert>
          ) : (
            <>
              <Typography>
                Выберите подтверждённого партнёра, который продолжит работу с
                клиентом.
              </Typography>
              {!partners && !error ? (
                <Typography color="text.secondary">
                  Загружаем партнёров…
                </Typography>
              ) : null}
              {partners?.length === 0 ? (
                <Alert severity="info">
                  Пока нет подтверждённых партнёров.{" "}
                  <Link href="/pro/partners">Пригласите исполнителя</Link> и
                  дождитесь подтверждения.
                </Alert>
              ) : partners ? (
                <TextField
                  select
                  label="Партнёр"
                  fullWidth
                  size="small"
                  value={partnerId}
                  disabled={busy}
                  onChange={(event) => {
                    setPartnerId(event.target.value);
                    setConfirmed(false);
                  }}
                >
                  {partners.map((item) => (
                    <MenuItem
                      key={item.id}
                      value={item.provider!.id}
                    >
                      {item.provider!.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
              <Alert severity="warning">
                После передачи заявка исчезнет из вашего кабинета и полностью
                перейдёт{" "}
                {selected
                  ? `исполнителю «${selected.provider!.name}»`
                  : "партнёру"}
                . Вы и ваша команда потеряете доступ к переписке и документам
                заявки. Отменить передачу самостоятельно нельзя.
              </Alert>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Передаются история переписки и материалы заявки. Назначение
                сотрудника снимается. Доступ к личному паспорту клиент
                подтверждает новому исполнителю отдельно.
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmed}
                    disabled={!partnerId || busy}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    size="small"
                  />
                }
                label="Я понимаю, что потеряю доступ к этой заявке"
              />
            </>
          )}
          {error ? (
            <Alert
              severity="error"
              action={
                !partners ? (
                  <Button onClick={() => setAttempt((value) => value + 1)}>
                    Повторить
                  </Button>
                ) : undefined
              }
            >
              {error}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          size="small"
          color="inherit"
          disabled={busy}
          onClick={onClose}
        >
          Отмена
        </Button>
        {!blockedReason ? (
          <Button
            size="small"
            variant="contained"
            color="error"
            loading={busy}
            disabled={!partnerId || !confirmed}
            onClick={async () => {
              if (busy || !confirmed || !partnerId) return;
              setBusy(true);
              setError(null);
              try {
                await teamApi(`/api/pro/requests/${requestId}/delegate`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    partnerProviderId: partnerId,
                    confirmed: true,
                  }),
                });
                router.replace("/pro/requests/board");
                router.refresh();
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Не удалось передать заявку",
                );
                setBusy(false);
              }
            }}
          >
            Передать заявку
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
