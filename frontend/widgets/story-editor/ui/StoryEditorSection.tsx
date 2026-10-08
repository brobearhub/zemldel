"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";
import {
  createStory,
  deleteStory,
  fetchMyStories,
  fetchSavedStories,
  fetchStoryAudience,
  fetchStoryInsights,
  fetchStoryReplyMessages,
  sendStoryReplyMessage,
  clampStoryText,
  STORY_IMAGE_MAX_BYTES,
  type StoryAudienceDto,
  type StoryDto,
  type StoryDurationDays,
  type StoryInsightsDto,
  type StoryReplyMessageDto,
  type StoryScope,
} from "@/entities/story";
import { StoriesViewerModal } from "@/widgets/home-stories/ui/StoriesViewerModal";
import { buildAuthorStoryMetrics } from "../lib/story-metrics";
import { isLiveStory, MyStoriesGallery, StoryTileRow, type StoriesLane } from "./MyStoriesGallery";
import { NewStoryComposer } from "./NewStoryComposer";
import { StoryInsightsPanel } from "./StoryInsightsPanel";
import { StoryMetricCards } from "./StoryMetricCard";

type Props = {
  scope: StoryScope;
  providerName?: string | null;
  authorName?: string | null;
};

export function StoryEditorSection({ scope, providerName, authorName }: Props) {
  const [items, setItems] = useState<StoryDto[]>([]);
  const [saved, setSaved] = useState<StoryDto[]>([]);
  const [lane, setLane] = useState<StoriesLane>("live");
  const [composing, setComposing] = useState(false);
  const [preview, setPreview] = useState<{ items: StoryDto[]; startId: string } | null>(null);
  const [audience, setAudience] = useState<StoryAudienceDto | null>(null);
  const [insights, setInsights] = useState<StoryInsightsDto | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [replyMessages, setReplyMessages] = useState<StoryReplyMessageDto[]>([]);
  const [replySending, setReplySending] = useState(false);
  const [replyStoryId, setReplyStoryId] = useState<string | null>(null);
  const replyLoad = useRef(0);
  const [text, setText] = useState("");
  const [durationDays, setDurationDays] = useState<StoryDurationDays>(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const load = useCallback(async () => {
    setItems((await fetchMyStories(scope)).items);
  }, [scope]);

  useEffect(() => {
    let alive = true;
    void fetchMyStories(scope)
      .then((payload) => {
        if (alive) setItems(payload.items);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Не удалось загрузить истории");
      });
    void fetchSavedStories()
      .then((payload) => {
        if (alive) setSaved(payload.items);
      })
      .catch(() => undefined);
    void fetchStoryAudience(scope)
      .then((payload) => {
        if (alive) setAudience(payload);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [scope]);

  function cancelCompose() {
    setComposing(false);
    setText("");
    setFile(null);
    setDurationDays(1);
    setError(null);
  }

  async function publish() {
    const trimmed = clampStoryText(text.trim());
    if (!trimmed) {
      setError("Введите текст истории");
      return;
    }
    if (file && file.size > STORY_IMAGE_MAX_BYTES) {
      setError("Максимальный размер фото — 10 МБ");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createStory({ scope, text: trimmed, durationDays, file });
      setText("");
      setFile(null);
      setComposing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось опубликовать историю");
    } finally {
      setBusy(false);
    }
  }

  async function remove(storyId: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteStory(storyId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить историю");
    } finally {
      setBusy(false);
    }
  }

  const live = items.filter(isLiveStory);
  const completed = items.filter((story) => !isLiveStory(story));
  const visibleStories = lane === "completed" ? completed : lane === "saved" ? saved : live;
  const selectedId =
    pickedId && visibleStories.some((story) => story.id === pickedId) ? pickedId : (visibleStories[0]?.id ?? null);
  const selectedStory = visibleStories.find((story) => story.id === selectedId) ?? null;
  if (selectedId !== replyStoryId) {
    setReplyStoryId(selectedId);
    setOpenReplyId(null);
    setReplyMessages([]);
  }
  const previewAuthor = scope === "provider" && providerName ? providerName : authorName?.trim() || "";

  useEffect(() => {
    if (!selectedId) {
      setInsights(null);
      return;
    }
    let alive = true;
    setInsights(null);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    void fetchStoryInsights(selectedId, timeZone)
      .then((payload) => {
        if (alive) setInsights(payload);
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить статистику");
      });
    return () => {
      alive = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !openReplyId) return;
    const loadId = replyLoad.current + 1;
    replyLoad.current = loadId;
    setReplyMessages([]);
    void fetchStoryReplyMessages(selectedId, openReplyId)
      .then((payload) => {
        if (replyLoad.current === loadId) setReplyMessages(payload.items);
      })
      .catch((cause: unknown) => {
        if (replyLoad.current !== loadId) return;
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить переписку");
      });
  }, [selectedId, openReplyId]);

  async function sendReply(text: string) {
    if (!selectedId || !openReplyId) return;
    const loadId = replyLoad.current + 1;
    replyLoad.current = loadId;
    setReplySending(true);
    setError(null);
    try {
      const created = await sendStoryReplyMessage(selectedId, openReplyId, text);
      if (replyLoad.current === loadId) setReplyMessages((current) => [...current, created]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отправить сообщение");
    } finally {
      setReplySending(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Мои истории
      </Typography>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, alignItems: "flex-start" }}>
        <MyStoriesGallery
          composing={composing}
          completed={completed}
          lane={lane}
          busy={busy}
          previewUrl={previewUrl}
          previewAuthor={previewAuthor}
          previewText={text}
          onToggleCompose={() => setComposing(true)}
          onFile={setFile}
          onLane={(next) => setLane((current) => (current === next ? "live" : next))}
          metrics={
            <StoryMetricCards
              metrics={buildAuthorStoryMetrics({
                liveCount: live.length,
                followerCount: audience?.followers.length ?? 0,
                unfollowCount: audience?.unfollows.length ?? 0,
                replyCount: audience?.replyCount ?? 0,
                savedCount: saved.length,
              })}
              activeId={lane === "saved" ? "saved" : lane === "live" ? "live" : null}
              onSelect={(id) => {
                if (id === "live") setLane("live");
                if (id === "saved") setLane((current) => (current === "saved" ? "live" : "saved"));
              }}
            />
          }
        />
        {composing ? (
          <NewStoryComposer
            text={text}
            durationDays={durationDays}
            busy={busy}
            onText={setText}
            onDuration={setDurationDays}
            onPublish={() => void publish()}
            onCancel={cancelCompose}
          />
        ) : null}
      </Box>

      {preview ? (
        <StoriesViewerModal items={preview.items} startId={preview.startId} onClose={() => setPreview(null)} />
      ) : null}

      <Stack spacing={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Подписались
        </Typography>
        {(audience?.followers ?? []).length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Пока никто не подписался.
          </Typography>
        ) : (
          audience?.followers.map((person) => (
            <Typography key={`${person.userId}-${person.at}`} variant="body2">
              {person.name}
            </Typography>
          ))
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Отписались
        </Typography>
        {(audience?.unfollows ?? []).map((person) => (
          <Typography key={`${person.userId}-${person.at}`} variant="body2">
            {person.name}
          </Typography>
        ))}
      </Stack>

      {!composing && visibleStories.length > 0 ? (
        <StoryInsightsPanel
          insights={insights}
          storyText={selectedStory?.text ?? ""}
          storyPublishedAt={selectedStory?.publishedAt ?? null}
          replyMessages={replyMessages}
          replySending={replySending}
          onOpenReply={setOpenReplyId}
          onCloseReply={() => setOpenReplyId(null)}
          onSendReply={(text) => void sendReply(text)}
          stories={
            <StoryTileRow
              stories={visibleStories}
              selectedId={selectedId}
              busy={busy}
              onSelect={setPickedId}
              onOpen={(storyId) => setPreview({ items: visibleStories, startId: storyId })}
              onRemove={(storyId) => void remove(storyId)}
            />
          }
        />
      ) : null}
    </Stack>
  );
}
