"use client";
import Button from "@mui/material/Button";
import type { BillingPeriod } from "./model";
import s from "./billing.module.css";

export function BillingPeriodSelector({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={className ?? s.periods}
      role="group"
      aria-label="Период оплаты"
    >
      <Button
        type="button"
        size="small"
        variant={value === "MONTH" ? "contained" : "outlined"}
        className={s.smallButton}
        aria-pressed={value === "MONTH"}
        onClick={() => onChange("MONTH")}
        disabled={disabled}
      >
        Месяц
      </Button>
      <Button
        type="button"
        size="small"
        variant={value === "YEAR" ? "contained" : "outlined"}
        className={s.smallButton}
        aria-pressed={value === "YEAR"}
        onClick={() => onChange("YEAR")}
        disabled={disabled}
      >
        Год −10%
      </Button>
    </div>
  );
}
