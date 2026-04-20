import { Fragment, type ReactNode } from "react";
import { List, ListItem, Paper } from "@mui/material";

type RenderRowArgs = { isLast: boolean };

export const FEED_ROW_MIN_HEIGHT = 104;

type Props<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderRow: (item: T, args: RenderRowArgs) => ReactNode;
  minRows?: number;
};

function FeedRowPlaceholder({ isLast }: { isLast: boolean }) {
  return (
    <ListItem
      disablePadding
      sx={{
        px: 2,
        py: 1.25,
        minHeight: FEED_ROW_MIN_HEIGHT,
        borderBottom: isLast ? "none" : "1px solid",
        borderBottomColor: "divider",
        bgcolor: "transparent",
      }}
    />
  );
}

export function FeedList<T>({ items, getKey, renderRow, minRows = 6 }: Props<T>) {
  const placeholderCount = Math.max(0, minRows - items.length);
  const totalRows = items.length + placeholderCount;

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      }}
    >
      <List dense disablePadding>
        {items.map((item, idx) => {
          const isLast = placeholderCount === 0 && idx === totalRows - 1;
          return (
            <Fragment key={getKey(item)}>
              {renderRow(item, { isLast })}
            </Fragment>
          );
        })}
        {Array.from({ length: placeholderCount }).map((_, idx) => (
          <FeedRowPlaceholder key={`empty-${idx}`} isLast={items.length + idx === totalRows - 1} />
        ))}
      </List>
    </Paper>
  );
}

