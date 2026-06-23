"use client";

import { useId, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
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
  actions?: ReactNode;
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
  actions,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;

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
      {description ? (
        <DialogContent dividers id={descriptionId}>
          {typeof description === "string" ? (
            <Typography color="text.secondary">{description}</Typography>
          ) : (
            <Stack spacing={1}>{description}</Stack>
          )}
        </DialogContent>
      ) : null}
      <DialogActions>
        {actions}
        <Button onClick={onCancel}>{cancelText}</Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

