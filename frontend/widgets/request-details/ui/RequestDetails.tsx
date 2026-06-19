"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { StatusProgressList, StatusProgressStepper, StatusProgressViewToggle, useStatusProgressView } from "@/entities/request";
import type { RequestDetailsBehavior, RequestDetailsBehaviorViewModel } from "../model/request-details-behavior";

export type RequestDetailsProps = {
  behavior: RequestDetailsBehavior;
  busy?: boolean;
};

export function RequestDetails(props: RequestDetailsProps) {
  const [statusView, setStatusView] = useStatusProgressView();
  const [newRemarkText, setNewRemarkText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [remarksBusy, setRemarksBusy] = useState(false);

  const vm: RequestDetailsBehaviorViewModel = props.behavior.getViewModel();

  const isBusy = Boolean(props.busy) || remarksBusy;

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

        {vm.remarksSection ? (
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={800}>Замечания</Typography>
                {vm.remarksSection.canAdd ? (
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={isBusy}
                    onClick={() => setAddOpen((v) => !v)}
                  >
                    {addOpen ? "Скрыть" : "Добавить"}
                  </Button>
                ) : null}
              </Stack>

              {addOpen && vm.remarksSection.canAdd ? (
                <Stack spacing={1}>
                  <TextField
                    label="Новое замечание"
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    minRows={2}
                    multiline
                    disabled={isBusy}
                  />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignSelf: "flex-start" }}>
                    <Button
                      variant="contained"
                      disabled={isBusy || newRemarkText.trim().length < 3}
                      onClick={async () => {
                        setRemarksBusy(true);
                        try {
                          await runAction("remarkAdd", { text: newRemarkText.trim() });
                          setNewRemarkText("");
                          setAddOpen(false);
                        } finally {
                          setRemarksBusy(false);
                        }
                      }}
                    >
                      Добавить замечание
                    </Button>
                    <Button variant="text" disabled={isBusy} onClick={() => setAddOpen(false)}>
                      Отмена
                    </Button>
                  </Stack>
                </Stack>
              ) : null}

              <Divider />

              {vm.remarksSection.items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Пока нет замечаний.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {vm.remarksSection.items.map((item) => {
                    const checked = item.status === "DONE";
                    const canToggle = item.canComplete && item.status === "OPEN" && !isBusy;
                    return (
                      <ListItem key={item.id} disableGutters disablePadding>
                        <ListItemButton
                          disabled={!canToggle}
                          onClick={async () => {
                            if (!canToggle) return;
                            setRemarksBusy(true);
                            try {
                              await runAction("remarkComplete", { remarkId: item.id });
                            } finally {
                              setRemarksBusy(false);
                            }
                          }}
                          sx={{
                            py: 0.5,
                            "&.Mui-disabled": { opacity: 1 },
                          }}
                        >
                          <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                sx={{
                                  textDecoration: checked ? "line-through" : "none",
                                  color: checked ? "text.secondary" : "text.primary",
                                  fontWeight: checked ? 600 : 700,
                                }}
                              >
                                {item.text}
                              </Typography>
                            }
                            secondary={item.meta}
                            secondaryTypographyProps={{ variant: "caption", color: "text.secondary" }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Stack>
          </Paper>
        ) : null}

        {vm.actions.length > 0 ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 0.5, alignSelf: "flex-start" }}>
            {vm.actions.map((a) => {
              const disabled =
                isBusy ||
                Boolean(a.disabled);

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

