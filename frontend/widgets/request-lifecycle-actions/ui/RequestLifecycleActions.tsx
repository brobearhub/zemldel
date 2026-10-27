"use client";

import { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import type { RequestLifecycleBehavior } from "../model/request-lifecycle-behavior";
import { isLifecycleEmpty } from "../model/request-lifecycle-model";

export type RequestLifecycleActionsProps = {
  behavior: RequestLifecycleBehavior;
  busy?: boolean;
};

export function RequestLifecycleActions(props: RequestLifecycleActionsProps) {
  // Why: общий busy приходит снаружи — запоминаем нажатую кнопку, чтобы спиннер был только на ней.
  const [pendingId, setPendingId] = useState<string | null>(null);
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
            <Typography variant="body2" sx={{
              fontWeight: 800
            }}>
              {vm.lockedAlert.title}
            </Typography>
          </Alert>
        ) : null}

        {vm.note ? (
          vm.actions.some((a) => a.id === "markRendered" && a.disabled) ? (
            <Alert severity="warning" variant="outlined">
              <Typography variant="body2">{vm.note}</Typography>
            </Alert>
          ) : (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {vm.note}
            </Typography>
          )
        ) : null}

        {vm.autoAcceptAtLabel ? (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {vm.autoAcceptAtLabel}
          </Typography>
        ) : null}

        {vm.infoRows.map((row) => (
          <Typography key={row.label} variant="body2" sx={{
            color: "text.secondary"
          }}>
            {row.label}: {row.value}
          </Typography>
        ))}

        {vm.actions.length > 0 ? (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignSelf: "flex-start"
            }}>
            {vm.actions.map((a) => {
              const loading = isBusy && pendingId === a.id;
              return (
                <Button
                  key={a.id}
                  variant={a.variant}
                  color={a.color}
                  loading={loading}
                  disabled={(isBusy && !loading) || Boolean(a.disabled)}
                  onClick={() => {
                    setPendingId(a.id);
                    void Promise.resolve(props.behavior.run({ id: a.id })).finally(() => setPendingId(null));
                  }}
                >
                  {a.label}
                </Button>
              );
            })}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
