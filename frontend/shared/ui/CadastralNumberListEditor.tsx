"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import {
  createEmptyCadastralParts,
  type CadastralNumberParts,
} from "@/entities/request/lib/cadastral-number";
import { CadastralNumberInput } from "@/shared/ui/CadastralNumberInput";

type Props = {
  value: CadastralNumberParts[];
  onChange: (next: CadastralNumberParts[]) => void;
  disabled?: boolean;
  variant?: "default" | "sidebar";
};

export function CadastralNumberListEditor({
  value,
  onChange,
  disabled = false,
  variant = "default",
}: Props) {
  const rows = value.length > 0 ? value : [createEmptyCadastralParts()];

  function updateRow(index: number, nextParts: CadastralNumberParts) {
    const next = rows.map((row, rowIndex) => (rowIndex === index ? nextParts : row));
    onChange(next);
  }

  function removeRow(index: number) {
    const next = rows.filter((_, rowIndex) => rowIndex !== index);
    onChange(next.length > 0 ? next : [createEmptyCadastralParts()]);
  }

  function addRow() {
    onChange([...rows, createEmptyCadastralParts()]);
  }

  if (variant === "sidebar") {
    return (
      <Stack spacing={0.75} sx={{ width: "100%", maxWidth: 292, overflowX: "hidden" }}>
        <Typography sx={{ fontSize: 12, color: "#616161" }}>
          Кадастровые номера (необязательно)
        </Typography>

        {rows.map((row, index) => (
          <CadastralNumberInput
            key={index}
            value={row}
            onChange={(next) => updateRow(index, next)}
            disabled={disabled}
            variant="sidebar"
            onClear={() => removeRow(index)}
          />
        ))}

        <Box sx={{ pt: 0.5 }}>
          <Button
            type="button"
            variant="text"
            size="small"
            onClick={addRow}
            disabled={disabled}
            sx={{
              p: 0,
              minWidth: 0,
              textTransform: "none",
              color: "#2e7d32",
              fontWeight: 400,
              fontSize: 13,
              justifyContent: "flex-start",
              "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
            }}
          >
            + Добавить номер
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{
        fontWeight: 700
      }}>
        Кадастровые номера (необязательно)
      </Typography>
      {rows.map((row, index) => (
        <Stack key={index} direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <CadastralNumberInput
            value={row}
            onChange={(next) => updateRow(index, next)}
            disabled={disabled}
          />
          <IconButton
            aria-label="Удалить кадастровый номер"
            onClick={() => removeRow(index)}
            disabled={disabled || rows.length === 1}
            size="small"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Button
        type="button"
        variant="text"
        size="small"
        startIcon={<AddIcon />}
        onClick={addRow}
        disabled={disabled}
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        Добавить номер
      </Button>
    </Stack>
  );
}
