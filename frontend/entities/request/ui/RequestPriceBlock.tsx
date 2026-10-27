"use client";

import { Stack, Typography } from "@mui/material";
import { formatRubles, resolveRequestPriceView } from "@/entities/request/lib/request-finance";
import Link from "@/shared/ui/Link";

type Props = {
  totalAmountRubles: number | null;
  servicePriceRubles: number | null;
  serviceId?: string | null;
  /** Короткая строка «Цена: …» для договора и приёмки. */
  statedOnly?: boolean;
};

export function RequestPriceBlock({
  totalAmountRubles,
  servicePriceRubles,
  serviceId,
  statedOnly = false,
}: Props) {
  const view = resolveRequestPriceView({ totalAmountRubles, servicePriceRubles });
  if (statedOnly) {
    if (view.statedAmount == null) return null;
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Цена: {formatRubles(view.statedAmount)}
      </Typography>
    );
  }

  return (
    <Stack spacing={0.25} sx={{ minWidth: 0, maxWidth: "100%" }}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: "baseline", flexWrap: "wrap", minWidth: 0 }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
          {view.headline}
        </Typography>
        {serviceId ? (
          <Link
            href={`/services/${serviceId}`}
            onClick={(event) => event.stopPropagation()}
            sx={{ fontWeight: 700, fontSize: 14 }}
          >
            Услуга
          </Link>
        ) : null}
      </Stack>
      {view.changedNote ? (
        <Typography variant="body2" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
          {view.changedNote}
        </Typography>
      ) : null}
    </Stack>
  );
}
