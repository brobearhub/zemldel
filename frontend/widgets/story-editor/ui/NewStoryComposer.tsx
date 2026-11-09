"use client";

import { useEffect, useState, useRef } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { type StoryLimits, type StoryDurationHours } from "@/entities/story";
import {
  PlanFeatureGate,
  LITE_AND_BUSINESS,
  BUSINESS_ONLY,
} from "@/shared/ui/PlanFeatureGate";
import { STORY_TILE_HEIGHT } from "./MyStoriesGallery";

type Props = {
  text: string;
  limits: StoryLimits;
  durationHours: StoryDurationHours;
  busy: boolean;
  onText: (value: string) => void;
  onDuration: (days: StoryDurationHours) => void;
  onPublish: () => void;
  onCancel: () => void;
};

export function NewStoryComposer({
  text,
  limits,
  durationHours,
  busy,
  onText,
  onDuration,
  onPublish,
  onCancel,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  function wrapSelection(before: string, after: string, placeholder: string) {
    const field = inputRef.current;
    const start = field?.selectionStart ?? text.length;
    const end = field?.selectionEnd ?? start;
    const selected = text.slice(start, end) || placeholder;
    onText(text.slice(0, start) + before + selected + after + text.slice(end));
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }
  const [publishClicked, setPublishClicked] = useState(false);

  useEffect(() => {
    if (!busy) setPublishClicked(false);
  }, [busy, publishClicked]);

  return (
    <Box
      sx={{
        flex: "1 1 420px",
        width: "100%",
        maxWidth: 640,
        minWidth: 0,
        minHeight: STORY_TILE_HEIGHT,
        height: STORY_TILE_HEIGHT + 40,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, lineHeight: 1.2 }}
        >
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
      <Box sx={{ display: "flex", gap: 1 }}>
        <PlanFeatureGate
          message={limits.textFormat === "PLAIN" ? LITE_AND_BUSINESS : null}
          label="Жирный"
        >
          <Button
            size="small"
            disabled={busy}
            onClick={() => wrapSelection("**", "**", "жирный текст")}
          >
            Жирный
          </Button>
        </PlanFeatureGate>
        <PlanFeatureGate
          message={limits.textFormat === "PLAIN" ? LITE_AND_BUSINESS : null}
          label="Курсив"
        >
          <Button
            size="small"
            disabled={busy}
            onClick={() => wrapSelection("*", "*", "курсив")}
          >
            Курсив
          </Button>
        </PlanFeatureGate>
        <PlanFeatureGate
          message={limits.textFormat !== "LINKS" ? BUSINESS_ONLY : null}
          label="Ссылка"
        >
          <Button
            size="small"
            disabled={busy}
            onClick={() =>
              wrapSelection("[", "](https://example.com)", "текст ссылки")
            }
          >
            Ссылка
          </Button>
        </PlanFeatureGate>
      </Box>
      <TextField
        size="small"
        inputRef={inputRef}
        disabled={busy}
        error={text.length > limits.textLimit}
        value={text}
        onChange={(event) => onText(event.target.value)}
        multiline
        fullWidth
        placeholder="Текст истории"
        slotProps={{
          htmlInput: {
            "aria-label": "Текст",
            "aria-describedby": "story-text-count",
          },
        }}
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
      <PlanFeatureGate
        message={
          limits.textLimit < 2048
            ? `До 1000 символов — на Лайте, до 2048 — на Бизнесе. Сейчас доступно ${limits.textLimit}.`
            : null
        }
        label="Лимит текста истории"
      >
        <Typography
          id="story-text-count"
          variant="caption"
          sx={{ alignSelf: "flex-end", color: "text.secondary", lineHeight: 1 }}
        >
          {text.length} / {limits.textLimit}
        </Typography>
      </PlanFeatureGate>
      <Box sx={{ display: "flex", gap: 1 }}>
        {([6, 12, 24, 48] as StoryDurationHours[]).map((days) => {
          const selected = durationHours === days;
          return (
            <PlanFeatureGate
              key={days}
              grow
              message={
                limits.durationHours.includes(days)
                  ? null
                  : days === 48
                    ? LITE_AND_BUSINESS
                    : BUSINESS_ONLY
              }
              label={`${days} ч`}
            >
              <Box
                component="button"
                type="button"
                aria-pressed={selected}
                disabled={busy}
                onClick={() => onDuration(days)}
                sx={{
                  flex: 1,
                  border: 0,
                  borderRadius: 999,
                  py: 1,
                  bgcolor: selected
                    ? (theme) => alpha(theme.palette.primary.main, 0.28)
                    : "transparent",
                  color: "text.primary",
                  font: "inherit",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {days} ч
              </Box>
            </PlanFeatureGate>
          );
        })}
      </Box>
      <PlanFeatureGate
        message={
          limits.used >= limits.dailyLimit
            ? `Использовано ${limits.dailyLimit} историй за сутки. ${limits.plan === "STANDARD" ? "До 5 — на Лайте, до 20 — на Бизнесе. " : limits.plan === "LITE" ? "До 20 — на Бизнесе. " : ""}Лимит обновится ${new Date(limits.resetAt).toLocaleString("ru-RU", { timeZone: limits.timezone })} (${limits.timezone}).`
            : text.length > limits.textLimit
              ? text.length > 2048
                ? "Максимальная длина истории — 2048 символов."
                : text.length > 1000
                  ? BUSINESS_ONLY
                  : LITE_AND_BUSINESS
              : null
        }
        label="Опубликовать"
      >
        <Button
          variant="contained"
          color="primary"
          loading={busy && publishClicked}
          disabled={busy || !text.trim()}
          onClick={() => {
            setPublishClicked(true);
            onPublish();
          }}
          sx={{
            alignSelf: "flex-start",
            borderRadius: "14px",
            px: 2.5,
            py: 0.75,
            fontWeight: 700,
            fontSize: "1rem",
            textTransform: "none",
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          }}
        >
          Опубликовать
        </Button>
      </PlanFeatureGate>
    </Box>
  );
}
