"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DocumentsSectionShell } from "@/shared/ui/DocumentsSectionShell";
import type { RequestRemarksBehavior, RequestRemarksViewModel } from "../model/request-remarks-behavior";

export type RequestRemarksProps = {
  behavior: RequestRemarksBehavior;
  busy?: boolean;
};

export function RequestRemarks(props: RequestRemarksProps) {
  const [newRemarkText, setNewRemarkText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [remarksBusy, setRemarksBusy] = useState(false);

  const vm: RequestRemarksViewModel | null = props.behavior.getViewModel();
  if (!vm) return null;

  const isBusy = Boolean(props.busy) || remarksBusy;

  async function runAction(actionId: string, payload?: unknown) {
    await props.behavior.run({ id: actionId, payload });
  }

  return (
    <DocumentsSectionShell
      headerLeft={
        <Typography variant="h6" fontWeight={800}>
          Замечания
        </Typography>
      }
      headerRight={
        vm.canAdd ? (
          <Button size="small" variant="outlined" disabled={isBusy} onClick={() => setAddOpen((v) => !v)}>
            {addOpen ? "Скрыть" : "Добавить"}
          </Button>
        ) : null
      }
      collapsible={vm.collapsible}
      defaultExpanded={vm.defaultExpanded}
      expandedResetKey={vm.expandedResetKey}
      collapseAriaLabel={{ expanded: "Свернуть замечания", collapsed: "Развернуть замечания" }}
    >
      <Stack spacing={1.5}>
        {addOpen && vm.canAdd ? (
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
                    await runAction(vm.submitActionId, { text: newRemarkText.trim() });
                    setNewRemarkText("");
                    setAddOpen(false);
                  } finally {
                    setRemarksBusy(false);
                  }
                }}
              >
                Отправить
              </Button>
              <Button variant="text" disabled={isBusy} onClick={() => setAddOpen(false)}>
                Отмена
              </Button>
            </Stack>
          </Stack>
        ) : null}

        <Divider />

        {vm.items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Пока нет замечаний.
          </Typography>
        ) : (
          <List dense disablePadding>
            {vm.items.map((item) => {
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
                    <Checkbox
                      edge="start"
                      checked={checked}
                      tabIndex={-1}
                      disableRipple
                      disabled={!canToggle}
                      sx={{
                        "&.Mui-checked": { color: "success.main" },
                        "&.Mui-disabled.Mui-checked": { color: "success.main", opacity: 1 },
                      }}
                    />
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            textDecoration: checked ? "line-through" : "none",
                            color: checked
                              ? "text.secondary"
                              : item.highlightAsIncoming
                                ? "info.main"
                                : "text.primary",
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
    </DocumentsSectionShell>
  );
}
