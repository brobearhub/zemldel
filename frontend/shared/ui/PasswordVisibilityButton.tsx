"use client";

import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { IconButton, InputAdornment } from "@mui/material";

type Props = {
  visible: boolean;
  onToggle: () => void;
};

export function PasswordVisibilityButton({ visible, onToggle }: Props) {
  return (
    <InputAdornment position="end">
      <IconButton
        type="button"
        aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        aria-pressed={visible}
        onClick={onToggle}
        edge="end"
        sx={{ minWidth: 44, minHeight: 44 }}
      >
        {visible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
      </IconButton>
    </InputAdornment>
  );
}
