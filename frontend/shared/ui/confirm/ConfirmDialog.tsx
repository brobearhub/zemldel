"use client";

import { useId, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  type ButtonProps,
} from "@mui/material";

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmText: string;
  cancelText?: string;
  confirmColor?: ButtonProps["color"];
  buttonSize?: ButtonProps["size"];
  actions?: ReactNode;
  reasonField?: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  };
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText = "Отмена",
  confirmColor = "primary",
  buttonSize,
  actions,
  reasonField,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const reasonId = `${dialogId}-reason`;
  const buttonSx = buttonSize === "small" ? {
    minHeight: 32,
    px: 1.5,
    py: 0.5,
    fontSize: "0.875rem",
  } : undefined;

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") onCancel();
      }}
      fullWidth
      maxWidth="sm"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      {description || reasonField ? (
        <DialogContent dividers id={description ? descriptionId : undefined}>
          <Stack spacing={2}>
            {description ? (
              typeof description === "string" ? (
                <Typography sx={{
                  color: "text.secondary"
                }}>{description}</Typography>
              ) : (
                <Stack spacing={1}>{description}</Stack>
              )
            ) : null}
            {reasonField ? (
              <TextField
                id={reasonId}
                label={reasonField.label}
                value={reasonField.value}
                onChange={(e) => reasonField.onChange(e.target.value)}
                multiline
                minRows={2}
                fullWidth
                autoFocus
                required
              />
            ) : null}
          </Stack>
        </DialogContent>
      ) : null}
      <DialogActions>
        {actions}
        <Button
          size={buttonSize}
          sx={buttonSx}
          onClick={onCancel}
        >
          {cancelText}
        </Button>
        <Button
          size={buttonSize}
          sx={buttonSx}
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
