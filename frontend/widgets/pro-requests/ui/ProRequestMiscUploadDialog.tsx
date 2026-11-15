"use client";

import { ProviderDocumentPicker } from "@/features/provider-documents/ui/ProviderDocumentPicker";
import type { ProviderDocument } from "@/entities/provider-document/api/documents";

import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import {
  REQUEST_DOCUMENT_INPUT_ACCEPT,
  validateRequestDocumentUpload,
} from "@/entities/request/lib/request-document-upload";

export function ProRequestMiscUploadDialog({
  isBusy,
  onClose,
  onUpload,
}: {
  isBusy: boolean;
  onClose: () => void;
  onUpload: (
    files: File[],
    visibleToCustomer: boolean,
    sourceDocuments?: ProviderDocument[],
  ) => Promise<void> | void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sourceDocuments, setSourceDocuments] = useState<ProviderDocument[]>(
    [],
  );
  const [files, setFiles] = useState<File[]>([]);
  const [visibleToCustomer, setVisibleToCustomer] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const disabled = isBusy || uploading;

  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      aria-labelledby="misc-upload-title"
      onClose={() => {
        if (!disabled) onClose();
      }}
    >
      <DialogTitle id="misc-upload-title">Загрузить документы</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Button
            component="label"
            variant="outlined"
            disabled={disabled}
            sx={{
              width: "100%",
              minHeight: 144,
              p: 3,
              borderStyle: "dashed",
              borderColor: "divider",
              color: "text.primary",
              textTransform: "none",
            }}
          >
            <Stack
              spacing={1}
              sx={{
                alignItems: "center",
              }}
            >
              <CloudUploadOutlinedIcon fontSize="large" />
              <Typography
                component="span"
                sx={{
                  fontWeight: 700,
                }}
              >
                {files.length > 0
                  ? "Выбрать другие файлы"
                  : "Выберите файлы для загрузки"}
              </Typography>
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
              >
                Word, Excel, PDF или фото · не более 10 файлов
              </Typography>
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
              >
                Документы до 20 МБ, фото до 50 МБ
              </Typography>
            </Stack>
            <input
              hidden
              type="file"
              multiple
              disabled={disabled}
              aria-label="Файлы исполнителя"
              accept={REQUEST_DOCUMENT_INPUT_ACCEPT}
              onChange={(event) => {
                const selected = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = "";
                if (selected.length === 0) return;
                setFiles(selected);
                setSourceDocuments([]);
                setError(null);
              }}
            />
          </Button>
          <Button
            variant="outlined"
            disabled={disabled}
            onClick={() => setPickerOpen(true)}
          >
            Выбрать из «Моих документов»
          </Button>
          {sourceDocuments.map((file) => (
            <Typography
              key={file.id}
              variant="body2"
              sx={{ overflowWrap: "anywhere" }}
            >
              {file.originalName}
            </Typography>
          ))}
          {files.length > 0 ? (
            <Stack
              component="ul"
              spacing={0.5}
              sx={{
                m: 0,
                pl: 2.5,
              }}
            >
              {files.map((file, index) => (
                <Typography
                  component="li"
                  variant="body2"
                  key={`${file.name}:${index}`}
                  sx={{
                    overflowWrap: "anywhere",
                  }}
                >
                  {file.name}
                </Typography>
              ))}
            </Stack>
          ) : null}
          <FormControlLabel
            control={
              <Checkbox
                checked={visibleToCustomer}
                disabled={disabled}
                onChange={(_, checked) => setVisibleToCustomer(checked)}
              />
            }
            label="Показывать файл клиенту"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          disabled={disabled}
          onClick={onClose}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          loading={uploading}
          disabled={
            disabled || (files.length === 0 && sourceDocuments.length === 0)
          }
          onClick={async () => {
            if (
              disabled ||
              (files.length === 0 && sourceDocuments.length === 0)
            )
              return;
            if (files.length > 10) {
              setError("За один раз можно загрузить не более 10 файлов.");
              return;
            }
            const validation = files
              .map(validateRequestDocumentUpload)
              .find(Boolean);
            if (validation) {
              setError(validation);
              return;
            }
            setError(null);
            setUploading(true);
            try {
              if (sourceDocuments.length)
                await onUpload(files, visibleToCustomer, sourceDocuments);
              else await onUpload(files, visibleToCustomer);
              onClose();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Не удалось загрузить документы. Повторите попытку.",
              );
            } finally {
              setUploading(false);
            }
          }}
        >
          Загрузить
        </Button>
      </DialogActions>
      {pickerOpen ? (
        <ProviderDocumentPicker
          multiple
          onClose={() => setPickerOpen(false)}
          onSelect={(selected) => {
            setSourceDocuments(selected);
            setFiles([]);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </Dialog>
  );
}
