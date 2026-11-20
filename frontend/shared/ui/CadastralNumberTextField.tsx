"use client";

import { useLayoutEffect, useRef, type ChangeEvent, type ReactNode } from "react";
import { TextField, type TextFieldProps } from "@mui/material";
import {
  cadastralCaretFromDigitCount,
  digitsOnly,
  formatCadastralInput,
} from "@/entities/request/lib/cadastral-number";

type Props = Pick<
  TextFieldProps,
  | "name"
  | "label"
  | "disabled"
  | "error"
  | "helperText"
  | "onBlur"
  | "onKeyDown"
  | "sx"
> & {
  value: string;
  onValueChange: (value: string) => void;
  endAdornment?: ReactNode;
};

export function CadastralNumberTextField({
  value,
  onValueChange,
  endAdornment,
  ...props
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nextCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (nextCaret.current !== null) {
      inputRef.current?.setSelectionRange(nextCaret.current, nextCaret.current);
      nextCaret.current = null;
    }
  }, [value]);

  function change(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { value: raw, selectionStart } = event.target;
    const formatted = formatCadastralInput(raw);
    const digits = digitsOnly(
      raw.slice(0, selectionStart ?? raw.length),
    ).length;
    nextCaret.current = formatted.endsWith(":")
      ? formatted.length
      : cadastralCaretFromDigitCount(formatted, digits);
    onValueChange(formatted);
  }

  return (
    <TextField
      {...props}
      size="small"
      fullWidth
      inputRef={inputRef}
      value={value}
      placeholder="66:41:0000000:000"
      onChange={change}
      slotProps={{
        input: { endAdornment },
        htmlInput: {
          inputMode: "numeric",
          autoComplete: "off",
          "aria-label": "Кадастровый номер",
        },
      }}
    />
  );
}
