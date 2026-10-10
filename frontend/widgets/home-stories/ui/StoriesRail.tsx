"use client";

import { Box, Stack, Typography } from "@mui/material";
import type { StoryDto } from "@/entities/story";
import { resolveStoryCover, storyAuthorInitials } from "@/entities/story";
import { CdnAvatar } from "@/shared/ui/cdn-image";

type Props = {
  items: StoryDto[];
  onOpen: (storyId: string) => void;
};

const CIRCLE_SIZE = 72;

export function StoriesRail({ items, onOpen }: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        overflowX: "auto",
        pb: 0.5,
        mx: { xs: -2, sm: -3 },
        px: { xs: 2, sm: 3 },
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {items.map((story) => {
        const cover = resolveStoryCover(story);
        return (
          <Stack
            key={story.id}
            component="button"
            type="button"
            data-viewed={story.viewed ? "true" : "false"}
            onClick={() => onOpen(story.id)}
            spacing={0.75}
            sx={{
              minWidth: CIRCLE_SIZE,
              maxWidth: CIRCLE_SIZE,
              alignItems: "center",
              border: 0,
              bgcolor: "transparent",
              cursor: "pointer",
              p: 0,
              outline: "none",
              "&:focus, &:focus-visible": { outline: "none" },
            }}
          >
            <Box
              sx={{
                width: CIRCLE_SIZE,
                height: CIRCLE_SIZE,
                borderRadius: "50%",
                p: "3px",
                bgcolor: story.viewed ? "transparent" : "primary.main",
              }}
            >
              <CdnAvatar
                src={cover.kind === "image" ? cover.src : undefined}
                alt={story.authorName}
                sx={{
                  width: "100%",
                  height: "100%",
                  bgcolor: "background.paper",
                  color: "text.primary",
                  border: 2,
                  borderColor: "background.default",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {cover.kind === "initials" ? storyAuthorInitials(story.authorName) : null}
              </CdnAvatar>
            </Box>
            <Typography
              variant="caption"
              noWrap
              sx={{ width: "100%", textAlign: "center", color: "text.secondary" }}
            >
              {story.authorName}
            </Typography>
          </Stack>
        );
      })}
    </Box>
  );
}
