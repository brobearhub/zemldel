"use client";

import { useEffect, useId, useState } from "react";
import { Avatar, Box, Button, FormHelperText, Stack, Typography } from "@mui/material";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";

export const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateAvatarFile(file: File, maxMegabytes: number): string | null {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) return "Поддерживаются только JPG, PNG или WebP.";
  if (file.size > maxMegabytes * 1024 * 1024) return `Максимальный размер изображения — ${maxMegabytes} МБ.`;
  return null;
}

export function AvatarPickerField(props: {
  label: string;
  file: File | null;
  // Why: лимит повторяет бэкенд: аватар исполнителя до 10 МБ, фото пользователя до 5 МБ.
  maxMegabytes: number;
  disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  const helperId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          sx={{ width: 64, height: 64, bgcolor: "action.hover", color: "text.secondary" }}
        >
          <AddAPhotoOutlinedIcon />
        </Avatar>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {props.label}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              size="small"
              component="label"
              disabled={props.disabled}
              aria-label={`${props.label}: ${props.file ? "заменить" : "загрузить фото"}`}
              aria-describedby={helperId}
              sx={{ whiteSpace: "nowrap" }}
            >
              {props.file ? "Заменить" : "Загрузить фото"}
              <input
                type="file"
                hidden
                accept={AVATAR_ALLOWED_TYPES.join(",")}
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  event.currentTarget.value = "";
                  if (!next) return;
                  const message = validateAvatarFile(next, props.maxMegabytes);
                  setError(message);
                  if (!message) props.onChange(next);
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
        {error ?? `Необязательно · JPG, PNG или WebP до ${props.maxMegabytes} МБ`}
      </FormHelperText>
    </Stack>
  );
}
