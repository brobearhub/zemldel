"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material";
import { Collapse, IconButton, Paper, Stack } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export type DocumentsSectionShellProps = {
  id?: string;
  headerLeft: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  paperSx?: SxProps<Theme>;
  spacing?: number;
  /** Если true — контент можно свернуть/развернуть. */
  collapsible?: boolean;
  /** Начальное состояние (и при смене `expandedResetKey`). */
  defaultExpanded?: boolean;
  /** Сброс раскрытия при смене заявки/статуса. */
  expandedResetKey?: string;
  /** Текст для aria-label у кнопки сворачивания. */
  collapseAriaLabel?: { expanded: string; collapsed: string };
};

export function DocumentsSectionShell({
  id,
  headerLeft,
  headerRight,
  children,
  paperSx,
  spacing = 1.5,
  collapsible = false,
  defaultExpanded = true,
  expandedResetKey,
  collapseAriaLabel,
}: DocumentsSectionShellProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded, expandedResetKey]);

  return (
    <Paper id={id} variant="outlined" sx={{ p: 2.5, ...paperSx }}>
      <Stack spacing={spacing}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap"
          }}>
          {headerLeft}
          <Stack direction="row" spacing={1} useFlexGap sx={{
            alignItems: "center"
          }}>
            {headerRight ? headerRight : null}
            {collapsible ? (
              <IconButton
                size="small"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? (collapseAriaLabel?.expanded ?? "Свернуть документы")
                    : (collapseAriaLabel?.collapsed ?? "Развернуть документы")
                }
              >
                <ExpandMoreIcon
                  sx={{
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: (theme) => theme.transitions.create("transform", { duration: theme.transitions.duration.shorter }),
                  }}
                />
              </IconButton>
            ) : null}
          </Stack>
        </Stack>
        {collapsible ? (
          <Collapse in={expanded}>
            <Stack spacing={spacing}>{children}</Stack>
          </Collapse>
        ) : (
          children
        )}
      </Stack>
    </Paper>
  );
}
