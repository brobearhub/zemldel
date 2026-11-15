"use client";

import { useState } from "react";
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
  MenuItem,
  Stack,
  TextField,
  Typography,
  LinearProgress,
} from "@mui/material";
import type { ProviderDocument } from "@/entities/provider-document/api/documents";
import { useDocumentLibrary } from "../model/use-document-library";

export function ProviderDocumentPicker({
  multiple = false,
  onClose,
  onSelect,
}: {
  multiple?: boolean;
  onClose: () => void;
  onSelect: (files: ProviderDocument[]) => void;
}) {
  const { files, folders, loading, error, reload } = useDocumentLibrary();
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("all");
  const [selected, setSelected] = useState<ProviderDocument[]>([]);
  const visible = files.filter(
    (file) =>
      (folder === "all" || (file.folderId ?? "root") === folder) &&
      file.originalName
        .toLocaleLowerCase("ru")
        .includes(query.trim().toLocaleLowerCase("ru")),
  );
  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      aria-labelledby="document-picker-title"
    >
      <DialogTitle id="document-picker-title">
        Выбрать из «Моих документов»
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Поиск по названию документа"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <TextField
            select
            fullWidth
            size="small"
            label="Папка"
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
          >
            <MenuItem value="all">Все папки</MenuItem>
            <MenuItem value="root">Без папки</MenuItem>
            {folders.map((item) => (
              <MenuItem
                key={item.id}
                value={item.id}
              >
                {item.name}
              </MenuItem>
            ))}
          </TextField>
          {loading ? (
            <LinearProgress />
          ) : error ? (
            <Alert
              severity="error"
              action={<Button onClick={reload}>Повторить</Button>}
            >
              {error}
            </Alert>
          ) : visible.length === 0 ? (
            <Typography color="text.secondary">
              {files.length
                ? "Документы не найдены."
                : "Загрузите файлы в разделе «Документы» → «Мои документы»."}
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {visible.map((file) => (
                <FormControlLabel
                  key={file.id}
                  sx={{
                    mx: 0,
                    alignItems: "flex-start",
                    "& .MuiFormControlLabel-label": { minWidth: 0 },
                  }}
                  control={
                    <Checkbox
                      checked={selected.some((item) => item.id === file.id)}
                      disabled={
                        multiple &&
                        selected.length >= 10 &&
                        !selected.some((item) => item.id === file.id)
                      }
                      onChange={(_, checked) =>
                        setSelected((current) =>
                          checked
                            ? multiple
                              ? [...current, file]
                              : [file]
                            : current.filter((item) => item.id !== file.id),
                        )
                      }
                    />
                  }
                  label={
                    <Box
                      sx={{
                        py: 1,
                        overflowWrap: "anywhere",
                      }}
                    >
                      <Typography variant="body2">
                        {file.originalName}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {folders.find((item) => item.id === file.folderId)
                          ?.name ?? "Без папки"}{" "}
                        · {Math.max(1, Math.round(file.sizeBytes / 1024))} КБ
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </Stack>
          )}
          {multiple ? (
            <Typography
              variant="caption"
              color="text.secondary"
            >
              Выбрано: {selected.length} из 10
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          disabled={loading || !!error || !selected.length}
          onClick={() => onSelect(selected)}
        >
          Выбрать
        </Button>
      </DialogActions>
    </Dialog>
  );
}
