import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material";
import { Box, List, ListItem, Paper, Stack } from "@mui/material";

export type RowListRenderRowArgs = { isLast: boolean };

export type RowListProps<T> = {
  items: readonly T[];
  getKey: (item: T) => string;
  renderRow: (item: T, args: RowListRenderRowArgs) => ReactNode;
  empty?: ReactNode;
  paperSx?: SxProps<Theme>;
};

export function RowList<T>({ items, getKey, renderRow, empty, paperSx }: RowListProps<T>) {
  return (
    <Paper variant="elevation" elevation={1} square sx={{ overflow: "hidden", ...paperSx }}>
      {items.length === 0 ? (
        empty ?? null
      ) : (
        <List dense disablePadding>
          {items.map((item, idx) => renderRow(item, { isLast: idx === items.length - 1 }))}
        </List>
      )}
    </Paper>
  );
}

export type RowListItemProps = {
  isLast: boolean;
  left: ReactNode;
  right?: ReactNode;
  minHeight?: number;
  sx?: SxProps<Theme>;
};

export function RowListItem({ isLast, left, right, minHeight = 76, sx }: RowListItemProps) {
  return (
    <ListItem
      disablePadding
      sx={{
        borderBottom: isLast ? "none" : "1px solid",
        borderBottomColor: "divider",
        ...sx,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          minHeight,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          {left}
        </Stack>
        {right ? (
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            alignItems="center"
            justifyContent="flex-end"
            sx={{ flexShrink: 0 }}
          >
            {right}
          </Stack>
        ) : null}
      </Box>
    </ListItem>
  );
}
