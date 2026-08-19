"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Button, IconButton, Stack, Typography } from "@mui/material";
import {
  createEmptyCadastralParts,
  type CadastralNumberParts,
} from "@/entities/request/lib/cadastral-number";
import { CadastralNumberInput } from "@/shared/ui/CadastralNumberInput";

type Props = {
  value: CadastralNumberParts[];
  onChange: (next: CadastralNumberParts[]) => void;
  disabled?: boolean;
};

export function CadastralNumberListEditor({ value, onChange, disabled = false }: Props) {
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

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" fontWeight={700}>
        Кадастровые номера (опционально)
      </Typography>
      {rows.map((row, index) => (
        <Stack key={index} direction="row" spacing={1} alignItems="center">
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
        variant="outlined"
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
