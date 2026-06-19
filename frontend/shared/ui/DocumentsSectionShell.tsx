import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material";
import { Paper, Stack } from "@mui/material";

export type DocumentsSectionShellProps = {
  id?: string;
  headerLeft: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  paperSx?: SxProps<Theme>;
  spacing?: number;
};

export function DocumentsSectionShell({
  id,
  headerLeft,
  headerRight,
  children,
  paperSx,
  spacing = 1.5,
}: DocumentsSectionShellProps) {
  return (
    <Paper id={id} variant="outlined" sx={{ p: 2.5, ...paperSx }}>
      <Stack spacing={spacing}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          {headerLeft}
          {headerRight ? headerRight : null}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

