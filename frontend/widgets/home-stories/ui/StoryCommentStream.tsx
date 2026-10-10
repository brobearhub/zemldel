"use client";

import { useEffect, useRef, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import type { StoryCommentDto } from "@/entities/story";
import { pluralRu } from "@/shared/lib/plural-ru";
import { commentWasEdited } from "../lib/story-comments";

type Props = {
  status: "loading" | "ready" | "error";
  items: StoryCommentDto[];
  truncated: boolean;
  error: string | null;
  signedIn: boolean;
  canReply: boolean;
  canModerate: boolean;
  draft: string;
  posting: boolean;
  replyNote: string | null;
  editingId: string | null;
  editText: string;
  pendingDeleteId: string | null;
  onDraftChange: (value: string) => void;
  onComment: () => void;
  onReply: () => void;
  onLike: (comment: StoryCommentDto) => void;
  onStartEdit: (comment: StoryCommentDto) => void;
  onEditText: (value: string) => void;
  onSaveEdit: (commentId: string) => void;
  onCancelEdit: () => void;
  onAskDelete: (commentId: string) => void;
  onConfirmDelete: (commentId: string) => void;
  onCancelDelete: () => void;
  startWithComment?: boolean;
};

export function StoryCommentStream({
  status,
  items,
  truncated,
  error,
  signedIn,
  canReply,
  canModerate,
  draft,
  posting,
  replyNote,
  editingId,
  editText,
  pendingDeleteId,
  onDraftChange,
  onComment,
  onReply,
  onLike,
  onStartEdit,
  onEditText,
  onSaveEdit,
  onCancelEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
  startWithComment = false,
}: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const wasPosting = useRef(false);
  const [composer, setComposer] = useState<"comment" | "reply" | null>(startWithComment ? "comment" : null);
  const busy = posting || status === "loading";

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [items, status]);

  useEffect(() => {
    if (!canReply && composer === "reply") setComposer(null);
  }, [canReply, composer]);

  useEffect(() => {
    if (wasPosting.current && !posting && draft === "") setComposer(null);
    wasPosting.current = posting;
  }, [posting, draft]);

  return (
    <Stack spacing={1} sx={{ flex: 1, minHeight: 0 }}>
      <Box
        ref={listRef}
        data-story-comments
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}
      >
        {status === "loading" && items.length === 0 ? (
          <Typography variant="body2">Загрузка комментариев</Typography>
        ) : null}
        {status === "error" ? (
          <Typography variant="body2" sx={{ color: "error.light" }}>
            {error ?? "Не удалось загрузить комментарии"}
          </Typography>
        ) : null}
        {status === "ready" && items.length === 0 ? (
          <Typography variant="body2">Пока нет комментариев</Typography>
        ) : null}
        {truncated ? (
          <Typography variant="caption" sx={{ display: "block", mb: 0.5, opacity: 0.8 }}>
            Показаны последние 100
          </Typography>
        ) : null}
        <Stack spacing={1}>
          {items.map((comment) => {
            const edited = commentWasEdited(comment.createdAt, comment.updatedAt);
            const editing = editingId === comment.id;
            return (
              <Box key={comment.id}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {comment.authorName}
                  {edited ? (
                    <Typography component="span" variant="caption" sx={{ ml: 0.75, fontWeight: 400, opacity: 0.75 }}>
                      изменено
                    </Typography>
                  ) : null}
                </Typography>
                {editing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editText}
                    onChange={(event) => onEditText(event.target.value)}
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {comment.text}
                  </Typography>
                )}
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  {signedIn && !comment.mine ? (
                    <IconButton
                      size="small"
                      aria-label={comment.liked ? "Убрать отметку" : "Нравится"}
                      disabled={comment.id.startsWith("pending-")}
                      onClick={() => onLike(comment)}
                      sx={{ color: "primary.main" }}
                    >
                      {comment.liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
                    </IconButton>
                  ) : null}
                  <Typography variant="caption">
                    {comment.likeCount} {pluralRu(comment.likeCount, ["отметка", "отметки", "отметок"])}
                  </Typography>
                  {comment.mine && !editing ? (
                    <Button size="small" color="inherit" onClick={() => onStartEdit(comment)}>
                      Изменить
                    </Button>
                  ) : null}
                  {(comment.mine || canModerate) && !editing ? (
                    <Button size="small" color="inherit" onClick={() => onAskDelete(comment.id)}>
                      Удалить
                    </Button>
                  ) : null}
                  {editing ? (
                    <>
                      <Button size="small" color="inherit" disabled={!editText.trim() || posting} onClick={() => onSaveEdit(comment.id)}>
                        Сохранить
                      </Button>
                      <Button size="small" color="inherit" onClick={onCancelEdit}>
                        Отмена
                      </Button>
                    </>
                  ) : null}
                </Stack>
                {pendingDeleteId === comment.id ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="caption">Удалить комментарий?</Typography>
                    <Button size="small" color="inherit" onClick={() => onConfirmDelete(comment.id)}>
                      Да
                    </Button>
                    <Button size="small" color="inherit" onClick={onCancelDelete}>
                      Нет
                    </Button>
                  </Stack>
                ) : null}
              </Box>
            );
          })}
        </Stack>
      </Box>
      {signedIn ? (
        <Stack spacing={0.75} sx={{ flexShrink: 0 }}>
          {composer === null ? (
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" disabled={posting} onClick={() => setComposer("comment")} sx={{ flex: 1 }}>
                Комментировать
              </Button>
              {canReply ? (
                <Button
                  variant="outlined"
                  size="small"
                  color="inherit"
                  disabled={posting}
                  onClick={() => setComposer("reply")}
                  sx={{ flex: 1 }}
                >
                  Ответить
                </Button>
              ) : null}
            </Stack>
          ) : (
            <Stack
              data-story-composer
              direction="row"
              spacing={1}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                event.stopPropagation();
                setComposer(null);
              }}
              sx={{ alignItems: "center" }}
            >
              <IconButton aria-label="Отменить" onClick={() => setComposer(null)} sx={{ color: "common.white" }}>
                <CloseRoundedIcon />
              </IconButton>
              <TextField
                autoFocus
                fullWidth
                size="small"
                placeholder={composer === "reply" ? "Ответ" : "Комментарий"}
                disabled={busy}
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  if (composer === "reply") onReply();
                  else onComment();
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "rgba(255,255,255,0.12)",
                    color: "common.white",
                    borderRadius: 1,
                    "&.Mui-focused": { bgcolor: "common.white", color: "text.primary" },
                  },
                }}
              />
              <IconButton
                aria-label={composer === "reply" ? "Отправить ответ" : "Отправить комментарий"}
                disabled={busy || !draft.trim()}
                onClick={composer === "reply" ? onReply : onComment}
                sx={{
                  color: "common.white",
                  "&&.Mui-disabled": { color: "action.disabledBackground" },
                }}
              >
                {composer === "reply" ? <ReplyRoundedIcon /> : <SendRoundedIcon />}
              </IconButton>
            </Stack>
          )}
          {replyNote ? (
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {replyNote}
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
