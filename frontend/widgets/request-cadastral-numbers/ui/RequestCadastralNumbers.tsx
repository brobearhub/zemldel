"use client";

import { useMemo, useState } from "react";
import CopyAllRoundedIcon from "@mui/icons-material/CopyAllRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { SITE_CONTENT_GAP_PX, SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
import { CadastralNumberInput } from "@/shared/ui/CadastralNumberInput";
import {
  createEmptyCadastralParts,
  type CadastralNumberParts,
} from "@/entities/request/lib/cadastral-number";
import {
  canSubmitCadastralParts,
  partsFromCadastralValue,
  type RequestCadastralBehavior,
} from "@/widgets/request-cadastral-numbers/model/request-cadastral-behavior";

type Props = {
  behavior: RequestCadastralBehavior;
  busy?: boolean;
};

export function RequestCadastralNumbers({ behavior, busy = false }: Props) {
  const viewModel = useMemo(() => behavior.getViewModel(), [behavior]);
  const [draftParts, setDraftParts] = useState<CadastralNumberParts>(createEmptyCadastralParts());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editParts, setEditParts] = useState<CadastralNumberParts>(createEmptyCadastralParts());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedOpen, setCopiedOpen] = useState(false);

  const isBusy = busy || submitting;

  function handleCopiedClose(_e?: unknown, reason?: string) {
    if (reason === "clickaway") return;
    setCopiedOpen(false);
  }

  async function run(action: Parameters<RequestCadastralBehavior["run"]>[0]) {
    setSubmitting(true);
    setError(null);
    try {
      await behavior.run(action);
      if (action.id === "add") {
        setDraftParts(createEmptyCadastralParts());
      }
      if (action.id === "edit") {
        setEditingIndex(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить кадастровый номер");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(index: number, value: string) {
    setEditingIndex(index);
    setEditParts(partsFromCadastralValue(value));
    setError(null);
  }

  async function copyToClipboard(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedOpen(true);
    } catch {
      setError("Не удалось скопировать кадастровый номер");
    }
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      {viewModel.items.length === 0 ? (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Кадастровые номера пока не добавлены.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {viewModel.items.map((item) => (
            <Stack key={`${item.index}-${item.value}`} spacing={1}>
              {editingIndex === item.index ? (
                <Stack spacing={1}>
                  <CadastralNumberInput value={editParts} onChange={setEditParts} disabled={isBusy} />
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={isBusy || !canSubmitCadastralParts(editParts)}
                      onClick={() => void run({ id: "edit", payload: { index: item.index, parts: editParts } })}
                    >
                      Сохранить
                    </Button>
                    <Button size="small" variant="text" disabled={isBusy} onClick={() => setEditingIndex(null)}>
                      Отмена
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", flex: 1 }}>
                    {item.value}
                  </Typography>
                  {viewModel.canMutate ? (
                    <>
                      <Tooltip title="Скопировать">
                        <span>
                          <IconButton
                            aria-label="Скопировать кадастровый номер"
                            size="small"
                            disabled={isBusy}
                            onClick={() => void copyToClipboard(item.value)}
                          >
                            <CopyAllRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <IconButton
                        aria-label="Изменить кадастровый номер"
                        size="small"
                        disabled={isBusy}
                        onClick={() => startEdit(item.index, item.value)}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="Удалить кадастровый номер"
                        size="small"
                        disabled={isBusy}
                        onClick={() => {
                          if (!window.confirm("Удалить кадастровый номер?")) return;
                          void run({ id: "delete", payload: { index: item.index } });
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </>
                  ) : null}
                </Stack>
              )}
            </Stack>
          ))}
        </Stack>
      )}

      {viewModel.canMutate ? (
        <Stack spacing={1.25}>
          <Typography variant="body2" sx={{
            fontWeight: 700
          }}>
            Добавить номер
          </Typography>
          <CadastralNumberInput value={draftParts} onChange={setDraftParts} disabled={isBusy} />
          <Button
            variant="contained"
            size="small"
            disabled={isBusy || !canSubmitCadastralParts(draftParts)}
            startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : null}
            onClick={() => void run({ id: "add", payload: { parts: draftParts } })}
            sx={{ alignSelf: "flex-start", textTransform: "none" }}
          >
            Добавить
          </Button>
        </Stack>
      ) : null}

      <Snackbar
        open={copiedOpen}
        autoHideDuration={1500}
        onClose={handleCopiedClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          top: {
            xs: `calc(env(safe-area-inset-top) + ${SITE_HEADER_HEIGHT_PX.xs + SITE_CONTENT_GAP_PX.xs}px)`,
            sm: `calc(env(safe-area-inset-top) + ${SITE_HEADER_HEIGHT_PX.sm + SITE_CONTENT_GAP_PX.sm}px)`,
          },
        }}
      >
        <Alert onClose={handleCopiedClose} severity="success" variant="filled" sx={{ width: "100%" }}>
          Скопировано
        </Alert>
      </Snackbar>
    </Stack>
  );
}
