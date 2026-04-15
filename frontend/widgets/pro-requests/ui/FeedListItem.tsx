import Link from "next/link";
import type { ReactNode } from "react";
import { Box, ListItem, ListItemButton, Stack, Typography } from "@mui/material";

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
          minHeight: 86,
          alignItems: "stretch",
        }}
      >
        <Stack spacing={0.25} sx={{ width: "100%", minWidth: 0 }}>
          <Typography fontWeight={800} noWrap>
            {title}
          </Typography>
          {meta ? (
            <Typography variant="body2" color="text.secondary" noWrap>
              {meta}
            </Typography>
          ) : null}
          {preview ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 1,
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

