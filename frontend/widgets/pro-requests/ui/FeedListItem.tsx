import Link from "@/shared/ui/Link";
import type { ReactNode } from "react";
import { Box, ListItem, ListItemButton, Stack, Typography } from "@mui/material";
import { FEED_ROW_MIN_HEIGHT } from "@/widgets/pro-requests/ui/FeedList";

type Props = {
  href?: string;
  disabled?: boolean;
  isLast?: boolean;
  title: string;
  meta?: string;
  preview?: ReactNode;
};

export function FeedListItem({ href, disabled, isLast, title, meta, preview }: Props) {
  const isClickable = Boolean(href) && !disabled;

  return (
    <ListItem
      disablePadding
      sx={{
        borderBottom: isLast ? "none" : "1px solid",
        borderBottomColor: "divider",
      }}
    >
      <ListItemButton
        component={isClickable ? Link : "div"}
        href={isClickable ? href : undefined}
        disabled={!isClickable}
        sx={{
          px: 2,
          py: 1.25,
          minHeight: FEED_ROW_MIN_HEIGHT,
          alignItems: "stretch",
        }}
      >
        <Stack spacing={0.5} sx={{ width: "100%", minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary" noWrap>
              {title}
            </Typography>
            {meta ? (
              <Typography variant="caption" color="text.secondary" noWrap>
                {meta}
              </Typography>
            ) : null}
          </Stack>

          {preview ? (
            <Typography
              variant="body2"
              fontWeight={600}
              color="text.primary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {preview}
            </Typography>
          ) : (
            <Box sx={{ height: 20 }} />
          )}
        </Stack>
      </ListItemButton>
    </ListItem>
  );
}

