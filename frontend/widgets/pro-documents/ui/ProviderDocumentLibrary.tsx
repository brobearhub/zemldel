"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import {
  documentRequest,
  moveProviderDocument,
  saveDocumentFolder,
  uploadProviderDocuments,
  type ProviderDocument,
  type ProviderDocumentFolder,
} from "@/entities/provider-document/api/documents";
import { REQUEST_DOCUMENT_INPUT_ACCEPT } from "@/entities/request/lib/request-document-upload";
import { useDocumentLibrary } from "@/features/provider-documents/model/use-document-library";

type Action =
  | { type: "folder"; folder?: ProviderDocumentFolder }
  | { type: "move"; file: ProviderDocument }
  | { type: "delete-file"; file: ProviderDocument }
  | { type: "delete-folder"; folder: ProviderDocumentFolder };

export function ProviderDocumentLibrary() {
  const {
    files,
    folders,
    loading,
    error: loadError,
    reload,
  } = useDocumentLibrary();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [value, setValue] = useState("");
  const visible = files.filter(
    (file) =>
      (query.trim() || file.folderId === folderId) &&
      file.originalName
        .toLocaleLowerCase("ru")
        .includes(query.trim().toLocaleLowerCase("ru")),
  );
  const currentFolder = folders.find((folder) => folder.id === folderId);

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await work();
      setAction(null);
      reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось сохранить изменения.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openAction(next: Action, initial = "") {
    setError(null);
    setValue(initial);
    setAction(next);
  }

  return (
    <Paper
      component="section"
      aria-labelledby="my-documents-title"
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography
            id="my-documents-title"
            component="h2"
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            Мои документы
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            Храните файлы здесь и прикрепляйте их к любым своим заявкам. Клиент
            увидит документ только после прикрепления с открытым доступом.
          </Typography>
        </Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
        >
          <Button
            component="label"
            variant="contained"
            size="small"
            startIcon={<UploadFileOutlinedIcon />}
            disabled={busy || loading || !!loadError}
          >
            Загрузить файлы
            <input
              hidden
              multiple
              type="file"
              aria-label="Загрузить в мои документы"
              accept={REQUEST_DOCUMENT_INPUT_ACCEPT}
              disabled={busy || loading || !!loadError}
              onChange={(event) => {
                const selected = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = "";
                if (selected.length)
                  void run(() => uploadProviderDocuments(selected, folderId));
              }}
            />
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<CreateNewFolderOutlinedIcon />}
            disabled={busy || loading || !!loadError}
            onClick={() => openAction({ type: "folder" })}
          >
            Создать папку
          </Button>
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
        >
          Word, Excel, PDF или фото · до 10 файлов за раз · документы до 20 МБ,
          фото до 50 МБ
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Поиск по названию во всех папках"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {loading || busy ? (
          <LinearProgress aria-label="Загрузка документов" />
        ) : null}
        {loadError ? (
          <Alert
            severity="error"
            action={<Button onClick={reload}>Повторить</Button>}
          >
            {loadError}
          </Alert>
        ) : null}
        {error && !action ? <Alert severity="error">{error}</Alert> : null}
        {!query.trim() ? (
          <>
            {folderId ? (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Button
                  size="small"
                  onClick={() => setFolderId(null)}
                >
                  Все документы
                </Button>
                <Typography
                  variant="body2"
                  sx={{
                    overflowWrap: "anywhere",
                  }}
                >
                  / {currentFolder?.name}
                </Typography>
              </Stack>
            ) : folders.length > 0 ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "minmax(0, 1fr)",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 1,
                }}
              >
                {folders.map((folder) => (
                  <Paper
                    key={folder.id}
                    variant="outlined"
                    sx={{
                      boxShadow: "none",
                      display: "flex",
                      alignItems: "center",
                      p: 0.5,
                      minWidth: 0,
                    }}
                  >
                    <Button
                      color="inherit"
                      startIcon={<FolderOutlinedIcon />}
                      onClick={() => setFolderId(folder.id)}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        justifyContent: "flex-start",
                        textAlign: "left",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {folder.name}
                    </Button>
                    <Tooltip title="Переименовать папку">
                      <IconButton
                        size="small"
                        aria-label={`Переименовать папку ${folder.name}`}
                        disabled={busy}
                        onClick={() =>
                          openAction({ type: "folder", folder }, folder.name)
                        }
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить папку">
                      <IconButton
                        size="small"
                        aria-label={`Удалить папку ${folder.name}`}
                        disabled={busy}
                        onClick={() =>
                          openAction({ type: "delete-folder", folder })
                        }
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Paper>
                ))}
              </Box>
            ) : null}
          </>
        ) : null}
        {!loading && !loadError && !visible.length ? (
          <Typography
            color="text.secondary"
            sx={{
              py: 2,
            }}
          >
            {query.trim()
              ? "Документы не найдены."
              : folderId
                ? "В этой папке пока нет файлов."
                : "Загрузите документы или откройте папку."}
          </Typography>
        ) : null}
        {!loadError ? (
          <Stack divider={<Divider />}>
            {visible.map((file) => (
              <Stack
                key={file.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{
                  py: 1.5,
                  alignItems: { sm: "center" },
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    overflowWrap: "anywhere",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                    }}
                  >
                    {file.originalName}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    {Math.max(1, Math.round(file.sizeBytes / 1024))} КБ
                    {query.trim()
                      ? ` · ${folders.find((folder) => folder.id === file.folderId)?.name ?? "Без папки"}`
                      : ""}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={0.5}
                >
                  <Button
                    component="a"
                    href={`/api/pro/documents/files/${file.id}/download`}
                    size="small"
                    color="inherit"
                    startIcon={<DownloadOutlinedIcon />}
                    aria-label={`Скачать ${file.originalName}`}
                  >
                    Скачать
                  </Button>
                  <Tooltip title="Переместить">
                    <IconButton
                      size="small"
                      aria-label={`Переместить ${file.originalName}`}
                      disabled={busy}
                      onClick={() =>
                        openAction({ type: "move", file }, file.folderId ?? "")
                      }
                    >
                      <DriveFileMoveOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Удалить">
                    <IconButton
                      size="small"
                      aria-label={`Удалить ${file.originalName}`}
                      disabled={busy}
                      onClick={() => openAction({ type: "delete-file", file })}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            ))}
          </Stack>
        ) : null}
      </Stack>
      <Dialog
        open={!!action}
        fullWidth
        maxWidth="xs"
        onClose={() => {
          if (!busy) setAction(null);
        }}
        aria-labelledby="library-action-title"
      >
        <DialogTitle id="library-action-title">
          {action?.type === "folder"
            ? action.folder
              ? "Переименовать папку"
              : "Создать папку"
            : action?.type === "move"
              ? "Переместить документ"
              : "Удалить?"}
        </DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{
              pt: 1,
            }}
          >
            {error ? <Alert severity="error">{error}</Alert> : null}
            {action?.type === "folder" ? (
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="Название папки"
                value={value}
                disabled={busy}
                onChange={(event) => setValue(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 100 } }}
                helperText="Папки создаются на одном уровне, без вложенных папок."
              />
            ) : action?.type === "move" ? (
              <TextField
                select
                fullWidth
                size="small"
                label="Папка"
                value={value}
                disabled={busy}
                onChange={(event) => setValue(event.target.value)}
              >
                <MenuItem value="">Без папки</MenuItem>
                {folders.map((folder) => (
                  <MenuItem
                    key={folder.id}
                    value={folder.id}
                  >
                    {folder.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Typography
                sx={{
                  overflowWrap: "anywhere",
                }}
              >
                {action?.type === "delete-folder"
                  ? `Папка «${action.folder.name}» будет удалена. Файлы останутся в «Моих документах» без папки.`
                  : action?.type === "delete-file"
                    ? `Файл «${action.file.originalName}» будет удалён из хранилища. Копии, прикреплённые к заявкам, сохранятся.`
                    : ""}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={busy}
            onClick={() => setAction(null)}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            loading={busy}
            disabled={busy || (action?.type === "folder" && !value.trim())}
            onClick={() => {
              if (!action) return;
              void run(() =>
                action.type === "folder"
                  ? saveDocumentFolder(value, action.folder?.id)
                  : action.type === "move"
                    ? moveProviderDocument(action.file.id, value || null)
                    : action.type === "delete-folder"
                      ? documentRequest(`/folders/${action.folder.id}`, {
                          method: "DELETE",
                        })
                      : documentRequest(`/files/${action.file.id}`, {
                          method: "DELETE",
                        }),
              );
            }}
          >
            {action?.type.startsWith("delete") ? "Удалить" : "Сохранить"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
