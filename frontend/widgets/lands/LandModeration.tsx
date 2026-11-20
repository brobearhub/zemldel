"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { landApi, useLandData } from "@/entities/land/api";
import { landStatusLabel, type LandListing } from "@/entities/land/types";

type ModerationListing = LandListing & { reviewPublishedDocuments?: true };

export function LandModeration() {
  const { data, loading, error, refresh } =
    useLandData<ModerationListing[]>("/moderation");
  const [selected, setSelected] = useState<{
    row: ModerationListing;
    kind: "CONTENT" | "DOCUMENT";
    decision: "APPROVE" | "REJECT";
  } | null>(null);
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  async function decide() {
    if (!selected) return;
    setBusy(true);
    setFailure("");
    try {
      await landApi(`/${selected.row.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          version: selected.row.version,
          kind: selected.kind,
          decision: selected.decision,
          reason,
          reviewPublishedDocuments: selected.row.reviewPublishedDocuments,
        }),
      });
      setSelected(null);
      refresh();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Ошибка проверки");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack
      spacing={3}
      sx={{
        p: 3,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
      >
        Участки: модерация
      </Typography>
      <Typography>
        Содержание объявления и документы проверяются отдельно. Публикация не
        подтверждает право собственности.
      </Typography>
      {error ? (
        <Alert
          severity="error"
          action={<Button onClick={refresh}>Повторить</Button>}
        >
          {error}
        </Alert>
      ) : null}
      {loading ? (
        <Typography>Загрузка…</Typography>
      ) : !data?.length ? (
        <Typography>Нет объявлений, ожидающих проверки</Typography>
      ) : (
        data.map((row) => (
          <Paper
            key={`${row.id}-${row.reviewPublishedDocuments ? "published" : "working"}`}
            variant="outlined"
            sx={{
              p: 3,
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: "wrap" }}
              >
                <Chip label={landStatusLabel(row)} />
                <Chip label={row.kind === "SELECTION" ? "Подбор" : "Продажа"} />
              </Stack>
              <Typography variant="h6">{row.title}</Typography>
              <Typography>
                {row.authorName} · {row.address} · {row.cadastralNumber}
              </Typography>
              <Button
                component={Link}
                href={`/lands/${row.id}${row.reviewPublishedDocuments ? "?published=1" : ""}`}
                target="_blank"
                sx={{
                  alignSelf: "start",
                }}
              >
                {row.reviewPublishedDocuments ? "Открыть опубликованную версию" : "Открыть предложение для проверки"}
              </Button>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  flexWrap: "wrap",
                }}
              >
                {row.documents?.map((doc) => (
                  <Button
                    key={doc.id}
                    component="a"
                    href={doc.url}
                  >
                    {doc.filename}
                  </Button>
                ))}
              </Stack>
              {(["CONTENT", "DOCUMENT"] as const)
                .filter((kind) =>
                  kind === "CONTENT"
                    ? row.status === "PENDING"
                    : row.documentStatus === "REQUESTED",
                )
                .map((kind) => (
                  <Stack
                    key={kind}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                  >
                    <Typography
                      sx={{
                        flex: 1,
                      }}
                    >
                      {kind === "CONTENT"
                        ? "Содержание объявления"
                        : "Проверка документов"}
                    </Typography>
                    {(["APPROVE", "REJECT"] as const).map((decision) => (
                      <Button
                        key={decision}
                        variant="outlined"
                        color={decision === "APPROVE" ? "success" : "warning"}
                        onClick={() => {
                          setSelected({ row, kind, decision });
                          setReason("");
                          setFailure("");
                        }}
                      >
                        {decision === "APPROVE"
                          ? kind === "CONTENT"
                            ? row.hasPublishedVersion
                              ? "Опубликовать изменения"
                              : "Опубликовать"
                            : "Зафиксировать проверку"
                          : "Нужна правка"}
                      </Button>
                    ))}
                  </Stack>
                ))}
            </Stack>
          </Paper>
        ))
      )}
      <Dialog
        open={Boolean(selected)}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selected?.kind === "CONTENT"
            ? "Решение по содержанию"
            : "Результат проверки документов"}
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              mb: 2,
            }}
          >
            {selected?.row.title}
          </Typography>
          {selected?.kind === "DOCUMENT" ? (
            <Alert
              severity="info"
              sx={{
                mb: 2,
              }}
            >
              Укажите только предмет и результат проверки: этот текст увидят
              посетители. Не включайте персональные данные из документов.
              Универсальную юридическую гарантию не даём.
            </Alert>
          ) : null}
          <TextField
            label={
              selected?.kind === "DOCUMENT"
                ? "Предмет и результат проверки"
                : "Комментарий автору (обязателен при возврате)"
            }
            fullWidth
            multiline
            minRows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {failure ? (
            <Alert
              severity="error"
              sx={{
                mt: 2,
              }}
            >
              {failure}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            Отмена
          </Button>
          <Button
            loading={busy}
            variant="contained"
            onClick={() => void decide()}
          >
            Подтвердить решение
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
