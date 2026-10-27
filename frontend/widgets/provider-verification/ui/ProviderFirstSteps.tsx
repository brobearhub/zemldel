"use client";

import { useState } from "react";
import { Box, Button, Paper, Stack, Step, StepButton, StepLabel, Stepper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { visuallyHidden } from "@mui/utils";
import Link from "@/shared/ui/Link";
import type { FirstSteps } from "../lib/first-steps";

type Props = Pick<FirstSteps, "progressLabel" | "steps">;

export function ProviderFirstSteps({ progressLabel, steps }: Props) {
  const firstOpen = steps.findIndex((step) => !step.done);
  const [selected, setSelected] = useState(firstOpen === -1 ? steps.length - 1 : firstOpen);
  const step = steps[selected];

  return (
    <Paper
      component="section"
      aria-labelledby="first-steps-title"
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800 }}
    >
      <Stack spacing={3}>
        <Typography id="first-steps-title" component="h2" variant="h6" sx={{ fontWeight: 800 }}>
          Первые шаги
          <Box component="span" sx={visuallyHidden}>
            , выполнено {progressLabel} обязательных
          </Box>
        </Typography>

        <Stepper
          nonLinear
          alternativeLabel
          activeStep={selected}
          sx={{
            "& .MuiStepIcon-root.Mui-completed": { color: "success.main" },
            "& .MuiStepConnector-line": { borderTopWidth: 3 },
            "& .MuiStepConnector-root.Mui-active .MuiStepConnector-line, & .MuiStepConnector-root.Mui-completed .MuiStepConnector-line":
              { borderColor: "success.main" },
          }}
        >
          {steps.map((item, index) => (
            <Step key={item.id} completed={item.done}>
              <StepButton
                onClick={() => setSelected(index)}
                aria-current={index === selected ? "step" : undefined}
                optional={
                  item.optional ? (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      по желанию
                    </Typography>
                  ) : undefined
                }
                sx={{ minHeight: 44 }}
              >
                <StepLabel error={item.error}>{item.label}</StepLabel>
              </StepButton>
            </Step>
          ))}
        </Stepper>

        {step ? (
          <Stack
            aria-live="polite"
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
            }}
          >
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
              <Typography component="h3" sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.35 }}>
                {step.title}
              </Typography>
              {step.note ? (
                <Typography variant="body2" sx={{ color: step.error ? "error.main" : "text.secondary", maxWidth: "60ch" }}>
                  {step.note}
                </Typography>
              ) : null}
            </Stack>
            {step.href && step.actionLabel ? (
              <Button
                component={Link}
                href={step.href}
                variant={step.current || step.error ? "contained" : "outlined"}
                sx={{
                  flex: "0 0 auto",
                  minHeight: 44,
                  ...(step.current || step.error ? {} : { color: "text.primary", borderColor: "primary.dark" }),
                }}
              >
                {step.actionLabel}
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
