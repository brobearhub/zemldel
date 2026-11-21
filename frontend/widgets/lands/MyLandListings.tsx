"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { landApi, useLandData } from "@/entities/land/api";
import {
  DEAL_LABELS,
  landPrice,
  landStatusLabel,
  STATUS_LABELS,
  type LandListing,
} from "@/entities/land/types";

function matchesStatus(row: LandListing, status: string) {
  return (
    status === "ALL" || row.status === status ||
    (status === "PUBLISHED" && row.hasPublishedVersion === true)
  );
}

export function MyLandListings() {
  const { data, error, loading, refresh } = useLandData<LandListing[]>("/mine");
  const params = useSearchParams();
  const [status, setStatus] = useState("ALL"),
    [profile, setProfile] = useState("ALL"),
    [kind, setKind] = useState("ALL");
  const [errorAction, setErrorAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    row: LandListing;
    action: "delete" | "withdraw";
  } | null>(null);
  const [reason, setReason] = useState("Продано");
  const rows =
    data?.filter(
      (r) =>
        matchesStatus(r, status) &&
        (kind === "ALL" || r.kind === kind) &&
        (profile === "ALL" ||
          (profile === "PERSONAL" ? !r.providerId : r.providerId === profile)),
    ) ?? [];
  const profiles = [
    ...new Map(
      data?.filter((r) => r.provider).map((r) => [r.providerId, r.provider!]) ??
        [],
    ).values(),
  ];
  async function act(row: LandListing, action: string) {
    setBusy(true);
    setErrorAction("");
    try {
      await landApi(action === "delete" ? `/${row.id}` : `/${row.id}/action`, {
        method: action === "delete" ? "DELETE" : "POST",
        body: JSON.stringify({ version: row.version, action, reason }),
      });
      setConfirm(null);
      refresh();
    } catch (e) {
      setErrorAction(
        e instanceof Error ? e.message : "Не удалось выполнить действие",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack
      spacing={3}
      sx={{
        maxWidth: 1200,
        mx: "auto",
        px: {
          xs: 2,
          md: 3,
        },
        py: 3,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
            }}
          >
            Мои объявления
          </Typography>
          <Typography color="text.secondary">
            Продажа участков и услуги подбора
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
          }}
        >
          <Button
            component={Link}
            href="/lands"
            size="small"
          >
            Каталог
          </Button>
          <Button
            component={Link}
            href="/lands/new"
            size="small"
            variant="contained"
          >
            Разместить
          </Button>
        </Stack>
      </Stack>
      {params.get("submitted") === "1" ? (
        <Alert severity="success">
          Объявление отправлено на модерацию. После одобрения покупатели увидят
          отправленную версию.
        </Alert>
      ) : null}
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          flexWrap: "wrap",
        }}
      >
        {[["ALL", "Все"], ...Object.entries(STATUS_LABELS)].map(
          ([value, label]) => (
            <Chip
              key={value}
              label={`${label} · ${data?.filter((row) => matchesStatus(row, value)).length ?? 0}`}
              onClick={() => setStatus(value)}
              color={status === value ? "primary" : "default"}
            />
          ),
        )}
      </Stack>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
      >
        <TextField
          select
          size="small"
          label="Профиль"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          sx={{
            minWidth: 220,
          }}
        >
          <MenuItem value="ALL">Все профили</MenuItem>
          <MenuItem value="PERSONAL">Личный профиль</MenuItem>
          {profiles.map((p) => (
            <MenuItem
              key={p.id}
              value={p.id}
            >
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Вид предложения"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          sx={{
            minWidth: 220,
          }}
        >
          <MenuItem value="ALL">Все виды</MenuItem>
          <MenuItem value="SALE">Продажа / уступка</MenuItem>
          <MenuItem value="SELECTION">Подбор участка</MenuItem>
        </TextField>
      </Stack>
      {error ? (
        <Alert
          severity="error"
          action={<Button onClick={refresh}>Повторить</Button>}
        >
          {error}
        </Alert>
      ) : null}
      {errorAction ? (
        <Alert
          severity="error"
          onClose={() => setErrorAction("")}
        >
          {errorAction}
        </Alert>
      ) : null}
      {loading && !data ? (
        <Skeleton
          variant="rounded"
          height={240}
        />
      ) : rows.length ? (
        rows.map((row) => (
          <Paper
            key={row.id}
            variant="outlined"
            sx={{
              p: {
                xs: 2,
                md: 3,
              },
              borderRadius: 2,
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
            >
              {row.photos[0] ? (
                <Box
                  component="img"
                  src={row.photos[0].url}
                  alt=""
                  sx={{
                    width: {
                      xs: "100%",
                      md: 180,
                    },
                    height: 140,
                    borderRadius: 1,
                    objectFit: "cover",
                  }}
                />
              ) : null}
              <Stack
                spacing={1}
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    flexWrap: "wrap",
                  }}
                >
                  {row.hasPublishedVersion && row.status !== "PUBLISHED" && (
                    <Chip size="small" label={STATUS_LABELS.PUBLISHED} color="success" />
                  )}
                  <Chip
                    size="small"
                    label={landStatusLabel(row)}
                    color={
                      row.status === "PUBLISHED"
                        ? "success"
                        : row.status === "CHANGES_REQUIRED"
                          ? "warning"
                          : "default"
                    }
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      row.kind === "SELECTION"
                        ? "Подбор"
                        : DEAL_LABELS[row.dealType]
                    }
                  />
                </Stack>
                <Typography
                  variant="h6"
                  sx={{
                    overflowWrap: "anywhere",
                  }}
                >
                  {row.title || "Новое объявление"}
                </Typography>
                <Typography>{landPrice(row)}</Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  {row.provider?.name || "Личный профиль"} · {row.address}
                </Typography>
                {row.moderationReason && row.status === "CHANGES_REQUIRED" ? (
                  <Alert severity="warning">{row.moderationReason}</Alert>
                ) : null}
                {row.documentStatus === "REJECTED" ? (
                  <Alert severity="warning">
                    Проверка документов: {row.documentReviewScope}
                  </Alert>
                ) : row.documentStatus === "REQUESTED" ? (
                  <Typography variant="body2">
                    Отдельно ожидается проверка документов
                  </Typography>
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
                    component={Link}
                    href={`/lands/${row.id}`}
                  >
                    {row.hasPublishedVersion && row.status !== "PUBLISHED" ? "Посмотреть изменения" : "Открыть"}
                  </Button>
                  {row.status !== "PENDING" ? (
                    <Button
                      component={Link}
                      href={`/lands/${row.id}/edit`}
                      variant="outlined"
                    >
                      {row.status === "DRAFT"
                        ? "Продолжить"
                        : row.status === "CHANGES_REQUIRED"
                          ? "Исправить"
                          : "Редактировать"}
                    </Button>
                  ) : (
                    <Button
                      disabled={busy}
                      onClick={() => void act(row, "recall")}
                    >
                      {row.hasPublishedVersion ? "Отозвать изменения" : "Отозвать в черновик"}
                    </Button>
                  )}
                  {row.status === "PUBLISHED" || row.hasPublishedVersion ? (
                    <Button
                      onClick={() => {
                        setConfirm({ row, action: "withdraw" });
                        setReason(
                          row.kind === "SELECTION"
                            ? "Временно неактуально"
                            : "Продано",
                        );
                      }}
                    >
                      Снять с публикации
                    </Button>
                  ) : null}
                  {row.status === "DRAFT" && !row.publishedAt ? (
                    <Button
                      color="error"
                      onClick={() => setConfirm({ row, action: "delete" })}
                    >
                      Удалить черновик
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        ))
      ) : !error ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
          }}
        >
          <Typography variant="h6">Объявлений пока нет</Typography>
          <Typography
            sx={{
              my: 2,
            }}
          >
            Создайте предложение или измените фильтры.
          </Typography>
          <Button
            component={Link}
            href="/lands/new"
            variant="contained"
          >
            Разместить объявление
          </Button>
        </Paper>
      ) : null}
      <Dialog
        open={Boolean(confirm)}
        onClose={() => {
          if (!busy) setConfirm(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {confirm?.action === "delete"
            ? "Удалить черновик?"
            : "Снять объявление?"}
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              mb: 2,
            }}
          >
            {confirm?.row.title || "Новое объявление"}
          </Typography>
          {confirm?.action === "withdraw" ? (
            <Stack spacing={2}>
              <Typography>
                Покупатели потеряют доступ к объявлению в каталоге и по ссылке.
                {confirm.row.status === "PENDING" && " Изменения будут отозваны с модерации."}
                {confirm.row.hasPublishedVersion && confirm.row.status !== "PUBLISHED" &&
                  " Последние изменения сохранятся в снятом объявлении."}
              </Typography>
              <TextField
                fullWidth
                label="Причина снятия"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                size="small"
              />
            </Stack>
          ) : (
            <Typography>
              Черновик и прикреплённые файлы будут удалены.
            </Typography>
          )}
          {errorAction ? (
            <Alert
              severity="error"
              sx={{
                mt: 2,
              }}
            >
              {errorAction}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={busy}
            onClick={() => setConfirm(null)}
          >
            Отмена
          </Button>
          <Button
            loading={busy}
            color={confirm?.action === "delete" ? "error" : "primary"}
            onClick={() => confirm && void act(confirm.row, confirm.action)}
          >
            {confirm?.action === "delete" ? "Удалить" : "Снять"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
