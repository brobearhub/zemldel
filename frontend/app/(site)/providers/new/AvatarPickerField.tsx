"use client";

import { useEffect, useId, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  FormHelperText,
  Stack,
  Typography,
} from "@mui/material";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import { convertImageToWebp, IMAGE_INPUT_ACCEPT, validateImageInput } from "@/shared/lib/image/convert-to-webp";

export function AvatarPickerField(props: {
  label: string;
  file: File | null;
  // Лимит применяется к обработанному файлу перед отправкой на сервер.
  maxMegabytes: number;
  disabled: boolean;
  onChange: (file: File | null) => void;
  onProcessingChange: (processing: boolean) => void;
}) {
  const helperId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function selectImage(file: File) {
    const message = validateImageInput(file);
    if (message) { setError(message); return; }
    setError(null);
    setProcessing(true);
    props.onProcessingChange(true);
    try {
      props.onChange(await convertImageToWebp(file, {
        maxBytes: props.maxMegabytes * 1024 * 1024,
        maxDimension: 2048,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обработать фото.");
    } finally {
      setProcessing(false);
      props.onProcessingChange(false);
    }
  }

  useEffect(() => {
    if (!props.file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(props.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [props.file]);

  return (
    <Stack spacing={0.5}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          src={previewUrl ?? undefined}
          alt={props.file ? props.label : undefined}
          sx={{
            width: 64,
            height: 64,
            bgcolor: "action.hover",
            color: "text.secondary",
          }}
        >
          <AddAPhotoOutlinedIcon />
        </Avatar>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {props.label}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Button
              variant="outlined"
              size="small"
              component="label"
              disabled={props.disabled}
              loading={processing}
              aria-label={`${props.label}: ${props.file ? "заменить" : "загрузить фото"}`}
              aria-describedby={helperId}
              sx={{ whiteSpace: "normal" }}
            >
              {props.file ? "Заменить" : "Загрузить фото"}
              <input
                type="file"
                hidden
                disabled={props.disabled || processing}
                accept={IMAGE_INPUT_ACCEPT}
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  event.currentTarget.value = "";
                  if (!next) return;
                  void selectImage(next);
                }}
              />
            </Button>
            {props.file ? (
              <Button
                variant="text"
                size="small"
                color="inherit"
                disabled={props.disabled}
                aria-label={`${props.label}: убрать`}
                onClick={() => {
                  setError(null);
                  props.onChange(null);
                }}
              >
                Убрать
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>
      <FormHelperText
        id={helperId}
        error={Boolean(error)}
        role={error ? "alert" : undefined}
        sx={{ mx: 1.75 }}
      >
        {error ??
          "Необязательно · изображение до 50 МБ"}
      </FormHelperText>
    </Stack>
  );
}
