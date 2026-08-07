"use client";

import { Box, Stack, Typography } from "@mui/material";
import { StatusProgressList, StatusProgressStepper, StatusProgressViewToggle, useStatusProgressView } from "@/entities/request";
import type { RequestDetailsBehavior, RequestDetailsBehaviorViewModel } from "../model/request-details-behavior";

export type RequestDetailsProps = {
  behavior: RequestDetailsBehavior;
  busy?: boolean;
};

export function RequestDetails(props: RequestDetailsProps) {
  const [statusView, setStatusView] = useStatusProgressView();

  const vm: RequestDetailsBehaviorViewModel = props.behavior.getViewModel();

  return (
    <Box
      sx={(theme) => ({
        p: 2.5,
        ...(vm.muted
          ? {
              bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "action.hover",
              borderRadius: 2,
            }
          : null),
      })}
    >
      <Stack spacing={3}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Typography variant="h6" fontWeight={800}>
            Детали
          </Typography>
          <StatusProgressViewToggle value={statusView} onChange={setStatusView} disabled={vm.muted} />
        </Stack>

        {statusView === "list" ? (
          <StatusProgressList steps={vm.steps} activeStepId={vm.activeStepId} muted={vm.muted} />
        ) : (
          <StatusProgressStepper steps={vm.steps} activeStepId={vm.activeStepId} muted={vm.muted} />
        )}
      </Stack>
    </Box>
  );
}
