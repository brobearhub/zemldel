"use client";
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
      <button
        type="button"
        className={value === "MONTH" ? s.button : s.secondary}
        aria-pressed={value === "MONTH"}
        onClick={() => onChange("MONTH")}
        disabled={disabled}
      >
        Месяц
      </button>
      <button
        type="button"
        className={value === "YEAR" ? s.button : s.secondary}
        aria-pressed={value === "YEAR"}
        onClick={() => onChange("YEAR")}
        disabled={disabled}
      >
        Год −10%
      </button>
    </div>
  );
}
