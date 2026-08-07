"use client";

import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import type { RequestLifecycleBehavior } from "../model/request-lifecycle-behavior";
import { isLifecycleEmpty } from "../model/request-lifecycle-model";

export type RequestLifecycleActionsProps = {
  behavior: RequestLifecycleBehavior;
  busy?: boolean;
};

export function RequestLifecycleActions(props: RequestLifecycleActionsProps) {
  const vm = props.behavior.getViewModel();
  if (isLifecycleEmpty(vm)) return null;

  const isBusy = Boolean(props.busy);

  return (
    <Box>
      <Stack spacing={1.5}>
        {vm.lockedAlert ? (
          <Alert
            severity="warning"
            variant="outlined"
            sx={{
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
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignSelf: "flex-start" }}>
            {vm.actions.map((a) => (
              <Button
                key={a.id}
                variant={a.variant}
                color={a.color}
                disabled={isBusy || Boolean(a.disabled)}
                onClick={() => void props.behavior.run({ id: a.id })}
              >
                {a.label}
              </Button>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
