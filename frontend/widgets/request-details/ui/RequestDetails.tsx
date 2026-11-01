"use client";

import { useState } from "react";
import { Box, Button, Stack, useMediaQuery, useTheme } from "@mui/material";
import { StatusProgressStepper } from "@/entities/request";
import type { RequestDetailsBehavior, RequestDetailsBehaviorViewModel } from "../model/request-details-behavior";

export type RequestDetailsProps = {
  behavior: RequestDetailsBehavior;
  busy?: boolean;
};

export function RequestDetails(props: RequestDetailsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [showAllSteps, setShowAllSteps] = useState(false);
  const vm: RequestDetailsBehaviorViewModel = props.behavior.getViewModel();
  const activeIndex = Math.max(vm.steps.findIndex((step) => step.id === vm.activeStepId), 0);

  return (
    <Box
      sx={(theme) => ({
        ...(vm.muted
          ? {
              bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "action.hover",
              borderRadius: 1,
              p: 2.5,
            }
          : null),
      })}
    >
      {isMobile ? (
        <Stack spacing={1}>
          <Box component="p" sx={{ m: 0, fontWeight: 700 }}>
            Шаг {activeIndex + 1} из {vm.steps.length} — {vm.steps[activeIndex]?.label}
          </Box>
          <Button
            size="small"
            variant="text"
            onClick={() => setShowAllSteps((value) => !value)}
            aria-expanded={showAllSteps}
            sx={{ alignSelf: "flex-start", color: "text.primary" }}
          >
            {showAllSteps ? "Скрыть все этапы" : "Показать все этапы"}
          </Button>
          {showAllSteps ? (
            <StatusProgressStepper steps={vm.steps} activeStepId={vm.activeStepId} muted={vm.muted} orientation="vertical" />
          ) : null}
        </Stack>
      ) : (
        <StatusProgressStepper steps={vm.steps} activeStepId={vm.activeStepId} muted={vm.muted} orientation="horizontal" />
      )}
    </Box>
  );
}
