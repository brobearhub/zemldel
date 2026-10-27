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
  caption?: string | null;
  serviceHref?: string | null;
};

export function FeedListItem({ href, disabled, isLast, title, meta, preview, caption, serviceHref }: Props) {
  const isClickable = Boolean(href) && !disabled;

  return (
    <ListItem
      disablePadding
      sx={{
        borderBottom: isLast ? "none" : "1px solid",
        borderBottomColor: "divider",
      }}
    >
      <Stack direction="row" sx={{ width: "100%", minWidth: 0, alignItems: "stretch" }}>
      <ListItemButton
        component={isClickable ? Link : "div"}
        href={isClickable ? href : undefined}
        disabled={!isClickable}
        sx={{
          px: 2,
          py: 1.25,
          minHeight: FEED_ROW_MIN_HEIGHT,
          alignItems: "stretch",
          flex: 1,
          minWidth: 0,
        }}
      >
        <Stack spacing={0.5} sx={{ width: "100%", minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              justifyContent: "space-between"
            }}>
            <Typography variant="caption" noWrap sx={{
              color: "text.secondary"
            }}>
              {title}
            </Typography>
            {meta ? (
              <Typography variant="caption" noWrap sx={{
                color: "text.secondary"
              }}>
                {meta}
              </Typography>
            ) : null}
          </Stack>

          {caption ? (
            <Typography variant="caption" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
              {caption}
            </Typography>
          ) : null}

          {preview ? (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: "text.primary",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
              }}>
              {preview}
            </Typography>
          ) : (
            <Box sx={{ height: 20 }} />
          )}
        </Stack>
      </ListItemButton>
      {serviceHref ? (
        <Box sx={{ display: "flex", alignItems: "center", pr: 1.5, flexShrink: 0 }}>
          <Link href={serviceHref} sx={{ fontWeight: 700, fontSize: 13 }}>
            Услуга
          </Link>
        </Box>
      ) : null}
      </Stack>
    </ListItem>
  );
}

