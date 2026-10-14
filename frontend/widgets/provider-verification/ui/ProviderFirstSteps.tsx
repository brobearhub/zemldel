import Link from "next/link";
import { Chip, Paper, Stack, Typography } from "@mui/material";
import type { FirstStepItem } from "../lib/first-steps";

type Props = {
  progressLabel: string;
  steps: FirstStepItem[];
};

export function ProviderFirstSteps({ progressLabel, steps }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: "baseline" }}
        >
          <Typography sx={{ fontWeight: 700 }}>Первые шаги</Typography>
          <Typography sx={{ color: "text.secondary" }}>{progressLabel}</Typography>
        </Stack>
        <Typography sx={{ color: "text.secondary" }}>
          Сначала у вас обычный профиль — это нормально
        </Typography>
        {steps.map((step, index) => (
          <Stack key={step.id} spacing={0.5}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography sx={{ fontWeight: step.done ? 400 : 700 }}>
                {index + 1}. {step.done ? `${step.title} — готово` : step.title}
              </Typography>
              {step.optional ? <Chip size="small" label="по желанию" variant="outlined" /> : null}
            </Stack>
            {step.note ? (
              <Typography sx={{ color: "text.secondary" }}>{step.note}</Typography>
            ) : null}
            {step.href ? (
              <Link href={step.href}>Перейти</Link>
            ) : null}
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
