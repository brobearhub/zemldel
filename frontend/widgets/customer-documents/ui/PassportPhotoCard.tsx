"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import axios from "axios";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useConfirm } from "@/shared/ui/confirm";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function PhotoUploadProgress({ value, label }: { value: number | null; label: string }) {
  return (
    <LinearProgress
      aria-label={`Загрузка: ${label}`}
      variant={value === null ? "indeterminate" : "determinate"}
      value={value ?? undefined}
      color="inherit"
      sx={{
        mt: 1,
        height: 3,
        borderRadius: 1,
        color: "accent.main",
      }}
    />
  );
}

function PhotoPreview({ file, onRemove, disabled, progress, uploading }: {
  file: File;
  onRemove: () => void;
  disabled: boolean;
  progress?: number | null;
  uploading: boolean;
}) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        minWidth: 0,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
        }}
      >
        <Box
          component="img"
          src={url}
          alt={`Предпросмотр: ${file.name}`}
          sx={{
            width: 64,
            height: 64,
            objectFit: "cover",
            borderRadius: 1,
            bgcolor: "action.hover",
            flexShrink: 0,
          }}
        />
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              overflowWrap: "anywhere",
            }}
          >
            {file.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
            }}
          >
            {(file.size / 1024 / 1024).toFixed(1)} МБ ·{" "}
            <Box
              component="span"
              sx={{
                color: "accent.main",
              }}
            >
              {progress === undefined
                ? "В очереди — нажмите «Загрузить фото»"
                : !uploading
                  ? "В очереди"
                  : progress === 100
                    ? "Сохраняется…"
                    : "Загружается…"}
            </Box>
          </Typography>
        </Box>
        <IconButton
          aria-label={`Убрать фото ${file.name}`}
          onClick={onRemove}
          disabled={disabled}
          size="small"
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
      {progress !== undefined ? (
        <PhotoUploadProgress
          value={progress}
          label={file.name}
        />
      ) : null}
    </Paper>
  );
}

type SavedPhoto = { id: string; mimeType: string; sizeBytes: number; createdAt: string };
type PendingPhoto = { id: string; file: File };
const photosUrl = "/api/documents/passport/photos";

function SavedPhotoAction({ uploadedAt, number, disabled, onRemove }: {
  uploadedAt?: number;
  number: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const [showSuccess, setShowSuccess] = useState(uploadedAt !== undefined);

  useEffect(() => {
    if (uploadedAt === undefined) return;
    setShowSuccess(true);
    const timer = window.setTimeout(() => setShowSuccess(false), 3000);
    return () => window.clearTimeout(timer);
  }, [uploadedAt]);

  if (showSuccess) {
    return (
      <Box
        role="status"
        aria-label={`Фото паспорта ${number} загружено`}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: "50%",
          bgcolor: "success.main",
          color: "success.contrastText",
        }}
      >
        <CheckRoundedIcon fontSize="small" />
      </Box>
    );
  }

  return (
    <IconButton
      aria-label={`Удалить фото паспорта ${number}`}
      disabled={disabled}
      onClick={onRemove}
      size="small"
    >
      <CloseRoundedIcon fontSize="small" />
    </IconButton>
  );
}

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    if ("message" in payload && typeof payload.message === "string") return payload.message;
    if ("error" in payload && typeof payload.error === "string") return payload.error;
  }
  return fallback;
}

export function PassportPhotoCard({ onShare, onSavedChange }: { onShare: () => void; onSavedChange?: (saved: boolean) => void }) {
  const confirm = useConfirm();
  const [files, setFiles] = useState<PendingPhoto[]>([]);
  const [photos, setPhotos] = useState<SavedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number | null>>({});
  const [uploadedAt, setUploadedAt] = useState<Record<string, number>>({});
  const [opened, setOpened] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    onSavedChange?.(photos.length > 0);
  }, [photos.length, onSavedChange]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    void (async () => {
      try {
        const response = await fetch(photosUrl, { cache: "no-store", signal: controller.signal });
        const payload: unknown = await response.json();
        if (!response.ok || !Array.isArray(payload)) throw new Error("Не удалось загрузить фотографии");
        if (!controller.signal.aborted) {
          const saved = payload as SavedPhoto[];
          setPhotos(saved);
          setFiles(current => current.filter(file => !saved.some(photo => photo.id === file.id)));
        }
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  function openPhoto(id: string) {
    setImageError(false);
    setOpened(id);
  }

  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    if (selected.some(file => !IMAGE_TYPES.has(file.type) || !file.size || file.size > MAX_FILE_SIZE)) {
      setError("Выберите непустые изображения JPG, PNG или WebP размером до 10 МБ каждое.");
      return;
    }
    const unique = [...files];
    for (const file of selected) {
      if (!unique.some(current => current.file.name === file.name && current.file.size === file.size && current.file.lastModified === file.lastModified)) {
        unique.push({ id: crypto.randomUUID(), file });
      }
    }
    if (unique.length + photos.length > 4) {
      setError("Можно сохранить не более четырёх фотографий. Удалите лишнее фото перед добавлением нового.");
      return;
    }
    setFiles(unique);
    setError(null);
    setNotice(null);
  }

  async function upload() {
    if (busy || !files.length) return;
    setBusy("upload"); setError(null); setNotice(null);
    setUploadProgress(Object.fromEntries(files.map(file => [file.id, 0])));
    try {
      for (const selected of files) {
        setUploadingId(selected.id);
        const body = new FormData();
        body.append("file", selected.file);
        body.append("uploadId", selected.id);
        const response = await axios.post<unknown>(photosUrl, body, {
          responseType: "json",
          validateStatus: () => true,
          onUploadProgress: ({ loaded, total }) => {
            const progress = total ? Math.min(100, Math.round(loaded / total * 100)) : null;
            setUploadProgress(current => ({ ...current, [selected.id]: progress }));
          },
        });
        const payload = response.data;
        if (response.status < 200 || response.status >= 300) throw new Error(errorMessage(payload, "Не удалось загрузить фото. Повторите попытку."));
        if (!payload || typeof payload !== "object" || !("id" in payload) || typeof payload.id !== "string") {
          throw new Error("Сервер не подтвердил сохранение фото. Повторите попытку.");
        }
        const saved = payload as SavedPhoto;
        setUploadedAt(current => ({ ...current, [saved.id]: Date.now() }));
        setUploadProgress(current => ({ ...current, [saved.id]: 100 }));
        setPhotos(current => [...current.filter(photo => photo.id !== saved.id), saved]);
        setFiles(current => current.filter(file => file.id !== selected.id));
      }
      setNotice("Фотографии сохранены");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось загрузить фото. Повторите попытку.");
    } finally {
      setUploadingId(null);
      setUploadProgress({});
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (busy || !await confirm({
      title: "Удалить фотографию паспорта?",
      description: "Фотография будет удалена из приватного хранилища.",
      confirmText: "Удалить",
      confirmColor: "error",
      buttonSize: "small",
    })) return;
    setBusy(id); setError(null); setNotice(null);
    try {
      const response = await fetch(`${photosUrl}/${id}`, { method: "DELETE" });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "Не удалось удалить фотографию. Повторите попытку."));
      setPhotos(current => current.filter(photo => photo.id !== id));
      setUploadedAt(current => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setOpened(null);
      setNotice("Фотография удалена");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Не удалось удалить фотографию"); }
    finally { setBusy(null); }
  }

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-labelledby="passport-photos-heading"
      sx={{
        p: { xs: 2, sm: 2.5 },
        minWidth: 0,
        height: "100%",
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
          <AddPhotoAlternateOutlinedIcon color="action" />
          <Typography
            id="passport-photos-heading"
            component="h2"
            variant="h6"
            sx={{
              fontWeight: 700,
              flex: 1,
            }}
          >
            Фото паспорта
          </Typography>
          <Chip
            size="small"
            label={loading ? "Загрузка…" : `${photos.length} из 4`}
            variant="outlined"
            sx={{
              "& .MuiChip-label": {
                px: 1.5,
              },
            }}
          />
        </Stack>
        <Box
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
            textAlign: "center",
          }}
        >
          <Button
            component="label"
            variant="outlined"
            startIcon={<AddPhotoAlternateOutlinedIcon />}
            disabled={loading || loadError || busy !== null || photos.length + files.length >= 4}
          >
            Выбрать фото
            <input
              hidden
              type="file"
              aria-label="Выбрать фото паспорта"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={loading || loadError || busy !== null || photos.length + files.length >= 4}
              onChange={selectPhotos}
            />
          </Button>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 1,
              color: "text.secondary",
            }}
          >
            Фото сохраняются в приватном хранилище в зашифрованном виде.
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          JPG, PNG или WebP, до 10 МБ каждый, не более четырёх файлов. Доступ исполнителю — только с вашего разрешения.
        </Typography>
        {loadError ? (
          <Alert severity="error">
            Не удалось загрузить фотографии.
            <Button onClick={() => setAttempt(value => value + 1)}>Повторить загрузку фотографий</Button>
          </Alert>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {notice ? <Alert severity="success">{notice}</Alert> : null}
        {!loading && !loadError ? photos.map((photo, index) => (
          <Paper
            key={photo.id}
            variant="outlined"
            sx={{
              p: 1,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
              }}
            >
              <ButtonBase
                aria-label={`Открыть фотографию паспорта ${index + 1}`}
                aria-haspopup="dialog"
                onClick={() => openPhoto(photo.id)}
                sx={{
                  borderRadius: 1,
                  flexShrink: 0,
                  cursor: "zoom-in",
                  "&.Mui-focusVisible": {
                    outline: "2px solid",
                    outlineColor: "text.primary",
                    outlineOffset: 2,
                  },
                }}
              >
                <Box
                  component="img"
                  src={`${photosUrl}/${photo.id}`}
                  alt={`Фото паспорта ${index + 1}`}
                  sx={{
                    width: 64,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: 1,
                    bgcolor: "action.hover",
                  }}
                />
              </ButtonBase>
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Typography variant="body2">Фото паспорта {index + 1}</Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  Сохранено · {(photo.sizeBytes / 1024 / 1024).toFixed(1)} МБ
                </Typography>
                <Button
                  size="small"
                  onClick={() => openPhoto(photo.id)}
                >
                  Открыть фото {index + 1}
                </Button>
              </Box>
              <SavedPhotoAction
                uploadedAt={uploadedAt[photo.id]}
                number={index + 1}
                disabled={busy !== null}
                onRemove={() => void remove(photo.id)}
              />
            </Stack>
            {uploadProgress[photo.id] !== undefined ? (
              <PhotoUploadProgress
                value={uploadProgress[photo.id]}
                label={`Фото паспорта ${index + 1}`}
              />
            ) : null}
          </Paper>
        )) : null}
        {files.map(selected => (
          <PhotoPreview
            key={selected.id}
            file={selected.file}
            disabled={busy !== null}
            progress={uploadProgress[selected.id]}
            uploading={uploadingId === selected.id}
            onRemove={() => { setFiles(current => current.filter(file => file.id !== selected.id)); setError(null); }}
          />
        ))}
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            disabled={loading || loadError || busy !== null || files.length === 0}
            onClick={() => void upload()}
          >
            {busy === "upload" ? "Загружаем фото…" : "Загрузить фото"}
          </Button>
          <Button
            startIcon={<ShareOutlinedIcon />}
            onClick={onShare}
            disabled={photos.length === 0 || busy !== null}
            sx={{
              color: "text.primary",
            }}
          >
            Поделиться
          </Button>
        </Stack>
      </Stack>
      <Dialog
        open={opened !== null}
        onClose={() => setOpened(null)}
        fullWidth
        maxWidth="md"
        aria-labelledby="passport-photo-view-title"
      >
        <DialogTitle
          id="passport-photo-view-title"
          sx={{
            pr: 6,
          }}
        >
          Фотография паспорта
          <IconButton
            aria-label="Закрыть фотографию"
            onClick={() => setOpened(null)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {imageError ? <Alert severity="error">Не удалось открыть фотографию. Закройте окно и повторите попытку.</Alert> : opened ? (
            <Box
              component="img"
              src={`${photosUrl}/${opened}`}
              alt="Сохранённая фотография паспорта"
              onError={() => setImageError(true)}
              sx={{
                display: "block",
                width: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
