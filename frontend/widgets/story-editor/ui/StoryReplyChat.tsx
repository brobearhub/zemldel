"use client";

import { useState, type ReactNode } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import { Avatar, Box, Button, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { StoryReplyMessageDto } from "@/entities/story";
import { formatInsightAge } from "../lib/story-insights";

type Props = {
  name: string;
  initial: string;
  replyText: string;
  replyAt: string;
  storyText: string;
  storyPublishedAt?: string | null;
  messages: StoryReplyMessageDto[];
  sending: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
};

export function StoryReplyChat({
  name,
  initial,
  replyText,
  replyAt,
  storyText,
  storyPublishedAt,
  messages,
  sending,
  onBack,
  onSend,
}: Props) {
  const [draft, setDraft] = useState("");
  const now = new Date();
  const storyWhen = storyPublishedAt ? formatInsightAge(storyPublishedAt, now) : null;

  function send() {
    const text = draft.trim();
    if (!text || sending) return;
    onSend(text);
    setDraft("");
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "common.white",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <IconButton aria-label="Назад" onClick={onBack} size="small">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
            color: "primary.dark",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {initial}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            ответ на историю
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflow: "auto", py: 2 }}>
        <Bubble align="end" tone="own" when={storyWhen}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <PhotoCameraOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>История · {storyText}</Typography>
          </Stack>
        </Bubble>
        <Bubble align="start" tone="other" when={formatInsightAge(replyAt, now)}>
          <Typography sx={{ fontSize: 14 }}>{replyText}</Typography>
        </Bubble>
        {messages.map((message) => (
          <Bubble
            key={message.id}
            align={message.mine ? "end" : "start"}
            tone={message.mine ? "own" : "other"}
            when={formatInsightAge(message.createdAt, now)}
          >
            <Typography sx={{ fontSize: 14 }}>{message.text}</Typography>
          </Bubble>
        ))}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Написать сообщение..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <Button variant="contained" disabled={sending || !draft.trim()} onClick={send}>
          Отправить
        </Button>
      </Stack>
    </Paper>
  );
}

function Bubble({
  align,
  tone,
  when,
  children,
}: {
  align: "start" | "end";
  tone: "own" | "other";
  when: string | null;
  children: ReactNode;
}) {
  const own = tone === "own";
  return (
    <Stack spacing={0.5} sx={{ alignItems: align === "end" ? "flex-end" : "flex-start" }}>
      <Box
        sx={{
          maxWidth: "80%",
          px: 1.5,
          py: 1,
          borderRadius: own ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          bgcolor: own ? "primary.main" : (theme) => alpha(theme.palette.primary.main, 0.12),
          color: own ? "common.white" : "text.primary",
        }}
      >
        {children}
      </Box>
      {when ? (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {when}
        </Typography>
      ) : null}
    </Stack>
  );
}
