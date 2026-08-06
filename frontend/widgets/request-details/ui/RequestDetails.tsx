"use client";

import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { StatusProgressList, StatusProgressStepper, StatusProgressViewToggle, useStatusProgressView } from "@/entities/request";
import type { RequestDetailsBehavior, RequestDetailsBehaviorViewModel } from "../model/request-details-behavior";

export type RequestDetailsProps = {
  behavior: RequestDetailsBehavior;
  busy?: boolean;
};

export function RequestDetails(props: RequestDetailsProps) {
  const [statusView, setStatusView] = useStatusProgressView();

  const vm: RequestDetailsBehaviorViewModel = props.behavior.getViewModel();

  const isBusy = Boolean(props.busy);

  async function runAction(actionId: string, payload?: unknown) {
    await props.behavior.run({ id: actionId, payload });
  }

  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: 2.5,
        ...(vm.muted
          ? {
              bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "action.hover",
              borderColor: "divider",
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

        {vm.lockedAlert ? (
          <Alert
            severity="warning"
            variant="outlined"
            sx={{
              mt: 0.5,
              "& .MuiAlert-message": { width: "100%" },
              "& .MuiAlert-icon": { alignSelf: "flex-start", mt: "2px" },
            }}
          >
            <Typography variant="body2" fontWeight={800}>
              {vm.lockedAlert.title}
            </Typography>
          </Alert>
        ) : null}

        {vm.note ? (
          <Typography variant="body2" color="text.secondary">
            {vm.note}
          </Typography>
        ) : null}

        {vm.autoAcceptAtLabel ? (
          <Typography variant="body2" color="text.secondary">
            {vm.autoAcceptAtLabel}
          </Typography>
        ) : null}

        {vm.infoRows.map((row) => (
          <Typography key={row.label} variant="body2" color="text.secondary">
            {row.label}: {row.value}
          </Typography>
        ))}

        {vm.actions.length > 0 ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 0.5, alignSelf: "flex-start" }}>
            {vm.actions.map((a) => {
              const disabled = isBusy || Boolean(a.disabled);

              return (
                <Button
                  key={a.id}
                  variant={a.variant}
                  color={a.color}
                  disabled={disabled}
                  onClick={() => void runAction(a.id)}
                >
                  {a.label}
                </Button>
              );
            })}
          </Stack>
        ) : null}

        {vm.bottomSlot ? <Box sx={{ pt: 0.5 }}>{vm.bottomSlot}</Box> : null}
      </Stack>
    </Paper>
  );
}
