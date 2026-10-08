"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { clampStoryText, STORY_DURATION_OPTIONS, STORY_TEXT_MAX_LENGTH, type StoryDurationDays } from "@/entities/story";
import { STORY_TILE_HEIGHT } from "./MyStoriesGallery";

type Props = {
  text: string;
  durationDays: StoryDurationDays;
  busy: boolean;
  onText: (value: string) => void;
  onDuration: (days: StoryDurationDays) => void;
  onPublish: () => void;
  onCancel: () => void;
};

export function NewStoryComposer({ text, durationDays, busy, onText, onDuration, onPublish, onCancel }: Props) {
  return (
    <Box
      sx={{
        flex: "1 1 420px",
        width: "100%",
        maxWidth: 640,
        minWidth: 0,
        height: STORY_TILE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          Новая история
        </Typography>
        <IconButton
          aria-label="Отменить"
          size="small"
          disabled={busy}
          onClick={onCancel}
          sx={{ color: "text.secondary" }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>
      <TextField
        value={text}
        onChange={(event) => onText(clampStoryText(event.target.value))}
        multiline
        fullWidth
        placeholder="Текст истории"
        slotProps={{ htmlInput: { "aria-label": "Текст", "aria-describedby": "story-text-count" } }}
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          "& .MuiOutlinedInput-root": {
            flex: 1,
            height: "100%",
            bgcolor: "background.paper",
            borderRadius: "16px",
            alignItems: "flex-start",
            color: "text.primary",
            "& fieldset": { borderColor: "divider" },
          },
          "& textarea": {
            height: "100% !important",
            overflow: "auto !important",
            boxSizing: "border-box",
          },
        }}
      />
      <Typography
        id="story-text-count"
        variant="caption"
        sx={{ alignSelf: "flex-end", color: "text.secondary", lineHeight: 1 }}
      >
        {text.length} / {STORY_TEXT_MAX_LENGTH}
      </Typography>
      <Box sx={{ display: "flex", gap: 1 }}>
        {STORY_DURATION_OPTIONS.map((days) => {
          const selected = durationDays === days;
          return (
            <Box
              key={days}
              component="button"
              type="button"
              aria-pressed={selected}
              onClick={() => onDuration(days)}
              sx={{
                flex: 1,
                border: 0,
                borderRadius: 999,
                py: 1,
                bgcolor: selected ? (theme) => alpha(theme.palette.primary.main, 0.28) : "transparent",
                color: "text.primary",
                font: "inherit",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {days} д
            </Box>
          );
        })}
      </Box>
      <Button
        variant="contained"
        color="primary"
        disabled={busy}
        onClick={onPublish}
        sx={{
          alignSelf: "flex-start",
          borderRadius: "14px",
          px: 2.5,
          py: 0.75,
          fontWeight: 700,
          fontSize: 15,
          textTransform: "none",
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        }}
      >
        Опубликовать
      </Button>
    </Box>
  );
}
