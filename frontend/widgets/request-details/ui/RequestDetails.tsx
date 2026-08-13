"use client";

import { Box, useMediaQuery, useTheme } from "@mui/material";
import { StatusProgressStepper } from "@/entities/request";
import type { RequestDetailsBehavior, RequestDetailsBehaviorViewModel } from "../model/request-details-behavior";

export type RequestDetailsProps = {
  behavior: RequestDetailsBehavior;
  busy?: boolean;
};

export function RequestDetails(props: RequestDetailsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const vm: RequestDetailsBehaviorViewModel = props.behavior.getViewModel();

  return (
    <Box
      sx={(theme) => ({
        ...(vm.muted
          ? {
              bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "action.hover",
              borderRadius: 2,
              p: 2.5,
            }
          : null),
      })}
    >
      <StatusProgressStepper
        steps={vm.steps}
        activeStepId={vm.activeStepId}
        muted={vm.muted}
        orientation={isMobile ? "vertical" : "horizontal"}
      />
    </Box>
  );
}
