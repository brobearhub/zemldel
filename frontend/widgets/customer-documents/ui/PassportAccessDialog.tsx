"use client";

import { useEffect, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { formatRequestCreatedAt, formatRequestNumber, type RequestCustomerDto } from "@/entities/request";
import { passportAccessError, passportAccessUrl, type PassportAccessState } from "../model/passport-access";

type Props = {
  initialKind: "form" | "photo";
  initialRequestId?: string;
  requests: RequestCustomerDto[];
  loading: boolean;
  error: string | null;
  hasPassport: boolean;
  onSaved: () => void;
  onClose: () => void;
};

export function PassportAccessDialog({ initialKind, initialRequestId, requests, loading, error, hasPassport, onSaved, onClose }: Props) {
  const [requestId, setRequestId] = useState(initialRequestId ?? "");
  const [shareForm, setShareForm] = useState(initialKind === "form" && hasPassport);
  const [sharePhoto, setSharePhoto] = useState(initialKind === "photo");
  const [duration, setDuration] = useState("7");
  const [state, setState] = useState<PassportAccessState | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const eligibleRequests = requests.filter((request) => request.providerId && !["CLOSED", "CANCELLED", "COMPLETED"].includes(request.status));
  useEffect(() => {
    const controller = new AbortController();
    setAccessError(null);
    void fetch(passportAccessUrl, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Не удалось загрузить разрешения");
      const data = await response.json() as PassportAccessState;
      if (!controller.signal.aborted) {
        setState(data);
        const existing = initialRequestId ? data.grants.filter((grant) => grant.requestId === initialRequestId && grant.active) : [];
        setShareForm((initialKind === "form" || existing.some((grant) => grant.kind === "FORM")) && data.hasForm);
        setSharePhoto((initialKind === "photo" || existing.some((grant) => grant.kind === "PHOTO")) && data.photoCount > 0);
      }
    }).catch(() => { if (!controller.signal.aborted) setAccessError("Не удалось загрузить разрешения"); });
    return () => controller.abort();
  }, [initialKind, initialRequestId, attempt]);

  function selectRequest(id: string) {
    setRequestId(id);
    const existing = state?.grants.filter((grant) => grant.requestId === id && grant.active) ?? [];
    if (existing.length) {
      setShareForm((existing.some((grant) => grant.kind === "FORM") || (id === initialRequestId && initialKind === "form")) && Boolean(state?.hasForm));
      setSharePhoto((existing.some((grant) => grant.kind === "PHOTO") || (id === initialRequestId && initialKind === "photo")) && Boolean(state?.photoCount));
    } else {
      setShareForm(initialKind === "form" && Boolean(state?.hasForm));
      setSharePhoto(initialKind === "photo" && Boolean(state?.photoCount));
    }
  }

  async function save() {
    if (!state || busy || !requestId) return;
    setBusy(true);
    setAccessError(null);
    try {
      const response = await fetch(`${passportAccessUrl}/${encodeURIComponent(requestId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: shareForm, photo: sharePhoto, durationDays: Number(duration), providerId: eligibleRequests.find((request) => request.id === requestId)?.providerId }),
      });
      if (!response.ok) throw new Error(passportAccessError(await response.json(), "Не удалось сохранить разрешения"));
      onSaved();
      onClose();
    } catch (error) { setAccessError(error instanceof Error ? error.message : "Не удалось сохранить разрешения"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="passport-access-title"
    >
      <DialogTitle
        id="passport-access-title"
        sx={{
          pr: 6,
        }}
      >
        Поделиться паспортом
      </DialogTitle>
      <IconButton
        aria-label="Закрыть окно доступа к паспорту"
        color="error"
        disabled={busy}
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
        }}
      >
        <CloseRoundedIcon />
      </IconButton>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2">Выберите заявку и данные, которые сможет читать её исполнитель.</Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {accessError ? <Alert severity="error">{accessError}{!state ? <Button onClick={() => setAttempt((value) => value + 1)}>Повторить</Button> : null}</Alert> : null}
          <TextField
            select
            fullWidth
            label="Заявка и исполнитель"
            value={requestId}
            onChange={(event) => selectRequest(event.target.value)}
            disabled={busy || !state || loading || Boolean(error) || eligibleRequests.length === 0}
            helperText={loading ? "Загружаем заявки…" : eligibleRequests.length === 0 && !error ? "Нет текущих заявок с выбранным исполнителем." : "Доступ относится только к выбранной заявке."}
          >
            {eligibleRequests.map((request) => (
              <MenuItem
                key={request.id}
                value={request.id}
                sx={{ whiteSpace: "normal" }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    columnGap: 1,
                    rowGap: 0.25,
                    alignItems: "baseline",
                    width: "100%",
                    minWidth: 0,
                    overflowWrap: "anywhere",
                    whiteSpace: "normal",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600 }}
                  >
                    {request.serviceTitle || request.categoryName || "Заявка"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatRequestNumber(request)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary" }}
                  >
                    {request.providerName || "Исполнитель"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      textAlign: "right",
                      maxWidth: { xs: 96, sm: "none" },
                    }}
                  >
                    {formatRequestCreatedAt(request.createdAt) || "—"}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
          <Stack>
            <FormControlLabel
              label={state?.hasForm ? "Данные паспорта" : "Данные паспорта — сначала заполните данные"}
              control={(
                <Checkbox
                  checked={shareForm}
                  disabled={busy || !state?.hasForm}
                  onChange={(_, checked) => setShareForm(checked)}
                />
              )}
            />
            <FormControlLabel
              label={state?.photoCount ? "Фотографии паспорта" : "Фотографии паспорта — сначала загрузите фотографии"}
              control={(
                <Checkbox
                  checked={sharePhoto}
                  disabled={busy || !state?.photoCount}
                  onChange={(_, checked) => setSharePhoto(checked)}
                />
              )}
            />
          </Stack>
          <TextField
            select
            label="Срок доступа"
            value={duration}
            disabled={busy}
            onChange={(event) => setDuration(event.target.value)}
          >
            <MenuItem value="1">1 день</MenuItem>
            <MenuItem value="7">7 дней</MenuItem>
            <MenuItem value="30">30 дней</MenuItem>
          </TextField>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
            Доступ получает выбранный исполнитель и уполномоченные сотрудники его профиля.
            Разрешение распространяется на выбранные данные и их изменения до окончания срока.
            Снятая галочка отзывает соответствующий доступ по этой заявке.
            Доступ можно отозвать в любой момент. Уже скачанные копии отозвать нельзя.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          flexDirection: { xs: "column-reverse", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: { xs: 1, sm: 0 },
          "& > :not(style) ~ :not(style)": {
            ml: { xs: 0, sm: 1 },
          },
        }}
      >
        <Button
          onClick={onClose}
          disabled={busy}
        >Закрыть</Button>
        <Button
          variant="contained"
          disabled={busy || !state || !requestId || loading || Boolean(error)}
          onClick={() => void save()}
        >
          Сохранить разрешения
        </Button>
      </DialogActions>
    </Dialog>
  );
}
