"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import { Alert, Box, Button, Chip, Dialog, DialogContent, DialogTitle, Paper, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { useConfirm } from "@/shared/ui/confirm";

type PassportDto = {
  series: string;
  number: string;
  issuedBy: string | null;
  issuedAt: string | null;
  departmentCode: string | null;
  registrationAddress: string | null;
  fullName: string | null;
  birthDate: string | null;
};

const EMPTY: PassportDto = {
  series: "",
  number: "",
  issuedBy: null,
  issuedAt: null,
  departmentCode: null,
  registrationAddress: null,
  fullName: null,
  birthDate: null,
};

function errorMessage(payload: unknown, fallback: string) {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

function formatDate(value: string | null) {
  return value ? value.split("-").reverse().join(".") : "Не указана";
}

type Props = {
  onSavedChange: (saved: boolean) => void;
  onShare: () => void;
};

export function CustomerPassportSection({ onSavedChange, onShare }: Props) {
  const confirm = useConfirm();
  const [saved, setSaved] = useState<PassportDto | null>(null);
  const [value, setValue] = useState<PassportDto>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const busy = pending !== null;

  useEffect(() => {
    onSavedChange(saved !== null);
  }, [saved, onSavedChange]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    setError(null);
    void (async () => {
      try {
        const response = await fetch("/api/documents/passport", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(errorMessage(payload, "Не удалось загрузить анкету"));
        if (payload !== null && (typeof payload !== "object" || !("series" in payload) || !("number" in payload))) {
          throw new Error("Не удалось загрузить анкету");
        }
        if (controller.signal.aborted) return;
        const passport = payload as PassportDto | null;
        setSaved(passport);
        setValue(passport ?? EMPTY);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(true);
        setError(error instanceof Error ? error.message : "Не удалось загрузить анкету");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  function setField(key: keyof PassportDto) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setValue((current) => ({ ...current, [key]: next || null }));
      setError(null);
      setNotice(null);
    };
  }

  function closeEditor() {
    if (busy) return;
    setValue(saved ?? EMPTY);
    setEditing(false);
    setError(null);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setPending("save");
    setError(null);
    setNotice(null);
    const next: PassportDto = {
      series: (value.series ?? "").replace(/\s+/g, ""),
      number: (value.number ?? "").replace(/\s+/g, ""),
      fullName: value.fullName?.trim() || null,
      birthDate: value.birthDate || null,
      issuedAt: value.issuedAt || null,
      issuedBy: value.issuedBy?.trim() || null,
      departmentCode: value.departmentCode?.trim() || null,
      registrationAddress: value.registrationAddress?.trim() || null,
    };
    try {
      const response = await fetch("/api/documents/passport", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(payload, "Не удалось сохранить анкету"));
      setSaved(next);
      setValue(next);
      setEditing(false);
      setShowDetails(false);
      setNotice("Анкета сохранена");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось сохранить анкету");
    } finally {
      setPending(null);
    }
  }

  async function handleDelete() {
    if (!saved || busy) return;
    if (!await confirm({
      title: "Удалить паспортные данные?",
      description: "Сохранённая анкета будет удалена. При необходимости её можно заполнить заново.",
      confirmText: "Удалить",
      confirmColor: "error",
    })) return;
    setPending("delete");
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/documents/passport", { method: "DELETE" });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(payload, "Не удалось удалить анкету"));
      setSaved(null);
      setValue(EMPTY);
      setEditing(false);
      setShowDetails(false);
      setNotice("Анкета удалена");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось удалить анкету");
    } finally {
      setPending(null);
    }
  }

  const summary = saved ? [
    ["Дата рождения", formatDate(saved.birthDate)],
    ["Кем выдан", saved.issuedBy || "Не указано"],
    ["Дата выдачи", formatDate(saved.issuedAt)],
    ["Код подразделения", saved.departmentCode || "Не указан"],
    ["Регистрация", saved.registrationAddress || "Не указана"],
  ] : [];

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-labelledby="passport-form-heading"
      sx={{
        p: { xs: 2, sm: 2.5 },
        minWidth: 0,
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
          }}
        >
          <BadgeOutlinedIcon color="action" />
          <Typography
            id="passport-form-heading"
            component="h2"
            variant="h6"
            sx={{
              fontWeight: 700,
              flex: 1,
            }}
          >
            Данные паспорта
          </Typography>
          {!loading && !loadError ? (
            <Chip
              size="small"
              label={saved ? "Сохранено" : "Не заполнено"}
              variant="outlined"
            />
          ) : null}
        </Stack>
        {error && !editing ? <Alert severity="error">{error}</Alert> : null}
        {notice ? <Alert severity="success">{notice}</Alert> : null}
        {loading ? (
          <Stack
            spacing={1}
            aria-label="Загрузка паспортных данных"
          >
            <Skeleton height={28} />
            <Skeleton
              width="65%"
              height={28}
            />
          </Stack>
        ) : loadError ? (
          <Button
            onClick={() => setAttempt((current) => current + 1)}
            sx={{
              alignSelf: "flex-start",
            }}
          >
            Повторить загрузку анкеты
          </Button>
        ) : (
          <>
            {saved ? (
              <Box>
                <Typography
                  sx={{
                    fontWeight: 600,
                    overflowWrap: "anywhere",
                  }}
                >
                  {saved.fullName || "ФИО не указано"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.5,
                    color: "text.secondary",
                  }}
                >
                  {showDetails ? `${saved.series} ${saved.number}` : `Паспорт •••• ••••${saved.number.slice(-2)}`}
                </Typography>
                {showDetails ? (
                  <Box
                    component="dl"
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
                      columnGap: 2,
                      rowGap: 1,
                      m: 0,
                      mt: 2,
                      fontSize: 14,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {summary.map(([label, content]) => (
                      <Box
                        key={label}
                        sx={{
                          display: "contents",
                        }}
                      >
                        <Box
                          component="dt"
                          sx={{
                            color: "text.secondary",
                          }}
                        >
                          {label}
                        </Box>
                        <Box
                          component="dd"
                          sx={{
                            m: 0,
                          }}
                        >
                          {content}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : null}
                <Button
                  size="small"
                  onClick={() => setShowDetails((current) => !current)}
                  aria-expanded={showDetails}
                  sx={{
                    mt: 1,
                  }}
                >
                  {showDetails ? "Скрыть реквизиты" : "Показать реквизиты"}
                </Button>
              </Box>
            ) : null}
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: "wrap",
              }}
            >
              <Button
                variant={saved ? "outlined" : "contained"}
                startIcon={<EditOutlinedIcon />}
                disabled={busy}
                onClick={() => {
                  setValue(saved ?? EMPTY);
                  setEditing(true);
                  setError(null);
                  setNotice(null);
                }}
              >
                {saved ? "Редактировать" : "Заполнить паспортные данные"}
              </Button>
              {saved ? (
                <Button
                  startIcon={<ShareOutlinedIcon />}
                  onClick={onShare}
                  disabled={busy}
                >
                  Поделиться
                </Button>
              ) : null}
              {saved ? (
                <Button
                  color="error"
                  loading={pending === "delete"}
                  disabled={busy}
                  onClick={() => void handleDelete()}
                >
                  Удалить
                </Button>
              ) : null}
            </Stack>
          </>
        )}
        {saved ? (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
            }}
          >
            Исполнитель получит доступ только с вашего разрешения по выбранной заявке.
            Доступ к анкете и фотографиям настраивается отдельно.
          </Typography>
        ) : null}
      </Stack>
      <Dialog
        open={editing}
        onClose={closeEditor}
        fullWidth
        maxWidth="sm"
        aria-labelledby="passport-editor-title"
      >
        <DialogTitle id="passport-editor-title">
          {saved ? "Редактировать паспортные данные" : "Заполнить паспортные данные"}
        </DialogTitle>
        <DialogContent>
          <Stack
            component="form"
            spacing={2}
            onSubmit={handleSave}
            aria-label="Паспортная анкета"
          >
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
              }}
            >
              Данные сохраняются в зашифрованном виде. Соответствие хранения
              требованиям Федерального закона № 152-ФЗ «О персональных данных» пока не подтверждено.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
            >
              <TextField
                label="Серия"
                value={value.series ?? ""}
                onChange={setField("series")}
                disabled={busy}
                slotProps={{
                  htmlInput: {
                    inputMode: "numeric",
                    pattern: "[0-9]{4}",
                    maxLength: 4,
                  },
                }}
                autoFocus
                placeholder="1234"
                required
                fullWidth
              />
              <TextField
                label="Номер"
                value={value.number ?? ""}
                onChange={setField("number")}
                disabled={busy}
                slotProps={{
                  htmlInput: {
                    inputMode: "numeric",
                    pattern: "[0-9]{6}",
                    maxLength: 6,
                  },
                }}
                placeholder="123456"
                required
                fullWidth
              />
            </Stack>
            <TextField
              label="ФИО"
              value={value.fullName ?? ""}
              onChange={setField("fullName")}
              disabled={busy}
              fullWidth
            />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
            >
              <TextField
                label="Дата рождения"
                type="date"
                value={value.birthDate ?? ""}
                onChange={setField("birthDate")}
                disabled={busy}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
              />
              <TextField
                label="Дата выдачи"
                type="date"
                value={value.issuedAt ?? ""}
                onChange={setField("issuedAt")}
                disabled={busy}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Кем выдан"
              value={value.issuedBy ?? ""}
              onChange={setField("issuedBy")}
              disabled={busy}
              fullWidth
            />
            <TextField
              label="Код подразделения"
              value={value.departmentCode ?? ""}
              onChange={setField("departmentCode")}
              disabled={busy}
              placeholder="000-000"
              fullWidth
            />
            <TextField
              label="Адрес регистрации"
              value={value.registrationAddress ?? ""}
              onChange={setField("registrationAddress")}
              disabled={busy}
              multiline
              minRows={2}
              fullWidth
            />
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: "wrap",
              }}
            >
              <Button
                type="submit"
                variant="contained"
                loading={pending === "save"}
                disabled={busy}
              >
                Сохранить анкету
              </Button>
              <Button
                disabled={busy}
                onClick={closeEditor}
              >
                Отмена
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
