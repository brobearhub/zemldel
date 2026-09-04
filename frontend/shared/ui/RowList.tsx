import { Fragment, type ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material";
import { Box, List, ListItem, Paper, Stack, Typography } from "@mui/material";

export type RowListRenderRowArgs = { isLast: boolean; index: number };

export type RowListProps<T> = {
  title: string;
  items: readonly T[];
  getKey: (item: T) => string;
  renderRow: (item: T, args: RowListRenderRowArgs) => ReactNode;
  empty?: ReactNode;
  paperSx?: SxProps<Theme>;
};

export function RowList<T>({ title, items, getKey, renderRow, empty, paperSx }: RowListProps<T>) {
  const tabRadiusPx = 10;
  const tabLiftPx = 10;

  return (
    <Box sx={{ pt: `${tabLiftPx}px` }}>
      <Paper
        variant="elevation"
        elevation={1}
        sx={{
          display: "inline-block",
          mt: `-${tabLiftPx}px`,
          px: 2,
          py: 1,
          bgcolor: "background.paper",
          borderRadius: `${tabRadiusPx}px ${tabRadiusPx}px 0 0`,
          clipPath: `inset(-${tabRadiusPx}px -${tabRadiusPx}px 0 -${tabRadiusPx}px)`,
          mb: "-1px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: "text.disabled"
          }}>{title}</Typography>
      </Paper>

      <Paper
        square
        variant="elevation"
        elevation={1}
        sx={{
          overflow: "hidden",
          ...paperSx,
          borderRadius: 0,
        }}
      >
        {items.length === 0 ? (
          empty ? (
            <Box sx={{ borderTop: "1px solid", borderTopColor: "divider", p: 2 }}>{empty}</Box>
          ) : null
        ) : (
          <List dense disablePadding sx={{ borderTop: "1px solid", borderTopColor: "divider" }}>
            {items.map((item, idx) => (
              <Fragment key={getKey(item)}>
                {renderRow(item, { isLast: idx === items.length - 1, index: idx })}
              </Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
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
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-end",
              flexShrink: 0
            }}>
            {right}
          </Stack>
        ) : null}
      </Box>
    </ListItem>
  );
}
