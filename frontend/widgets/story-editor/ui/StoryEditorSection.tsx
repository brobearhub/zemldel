"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import {
  createStory,
  deleteStory,
  fetchMyStories,
  fetchStoryLimits,
  type StoryLimits,
  STORY_VIDEO_MAX_BYTES,
  fetchSavedStories,
  unsaveStory,
  fetchStoryAudience,
  fetchStoryInsights,
  fetchStoryReplyMessages,
  sendStoryReplyMessage,
  STORY_IMAGE_MAX_BYTES,
  type StoryAudienceDto,
  type StoryDto,
  type StoryDurationHours,
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
import { convertImageToWebp } from "@/shared/lib/image/convert-to-webp";

type Props = {
  scope: StoryScope;
  initialLane?: StoriesLane;
  providerName?: string | null;
  authorName?: string | null;
};

export function StoryEditorSection({ scope, providerName, authorName, initialLane = "live" }: Props) {
  const [items, setItems] = useState<StoryDto[]>([]);
  const [saved, setSaved] = useState<StoryDto[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [savedAttempt, setSavedAttempt] = useState(0);
  const [lane, setLane] = useState<StoriesLane>(initialLane);
  useEffect(() => setLane(initialLane), [initialLane]);
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
  const [durationHours, setDurationHours] = useState<StoryDurationHours>(24);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [limits, setLimits] = useState<StoryLimits | null>(null);
  const refreshLimits = useCallback(async () => {
    const value = await fetchStoryLimits(scope);
    setLimits(value);
    setDurationHours((current) => value.durationHours.includes(current) ? current : 24);
  }, [scope]);

  useEffect(() => {
    setLimits(null);
    const refresh = () => void refreshLimits().catch((cause) => setError(cause instanceof Error ? cause.message : "Не удалось загрузить лимиты"));
    refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [refreshLimits]);

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
    void fetchStoryAudience(scope)
      .then((payload) => {
        if (alive) setAudience(payload);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [scope]);

  useEffect(() => {
    let alive = true;
    setSavedLoading(true);
    setSavedError(null);
    void fetchSavedStories(scope)
      .then((payload) => {
        if (alive) setSaved(payload.items);
      })
      .catch((cause: unknown) => {
        if (alive) setSavedError(cause instanceof Error ? cause.message : "Не удалось загрузить сохранённые истории");
      })
      .finally(() => {
        if (alive) setSavedLoading(false);
      });
    return () => { alive = false; };
  }, [scope, savedAttempt]);

  async function removeSaved(storyId: string) {
    setBusy(true);
    setSavedError(null);
    try {
      await unsaveStory(storyId, scope);
      setSaved((current) => current.filter((story) => story.id !== storyId));
    } catch (cause) {
      setSavedError(cause instanceof Error ? cause.message : "Не удалось убрать историю из сохранённых");
    } finally {
      setBusy(false);
    }
  }

  function cancelCompose() {
    setComposing(false);
    setText("");
    setFile(null);
    setDurationHours(24);
    setError(null);
  }

  async function selectStoryFile(selected: File | null) {
    if (!selected || selected.type.startsWith("video/")) {
      setFile(selected);
      return;
    }
    setError(null);
    setBusy(true);
    setImageProcessing(true);
    try {
      setFile(await convertImageToWebp(selected, { maxBytes: STORY_IMAGE_MAX_BYTES }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обработать фото.");
    } finally {
      setImageProcessing(false);
      setBusy(false);
    }
  }

  async function publish() {
    const trimmed = text.trim();
    if (!limits) return;
    if (trimmed.length > limits.textLimit) { setError(`Максимум ${limits.textLimit} символов`); return; }
    if (file?.type.startsWith("video/") && !limits.video) { setError("Видео доступно на тарифе Бизнес"); return; }
    if (!trimmed) {
      setError("Введите текст истории");
      return;
    }
    if (file && file.size > (file.type.startsWith("video/") ? STORY_VIDEO_MAX_BYTES : STORY_IMAGE_MAX_BYTES)) {
      setError("Максимальный размер фото — 10 МБ, видео — 100 МБ");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createStory({ scope, text: trimmed, durationHours, file });
      setText("");
      setFile(null);
      setComposing(false);
      await load();
      await refreshLimits();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось опубликовать историю");
    } finally {
      void refreshLimits().catch(() => undefined);
      setBusy(false);
    }
  }

  async function remove(storyId: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteStory(storyId);
      await load();
      await refreshLimits();
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
    if (!selectedId || lane === "saved") {
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
  }, [selectedId, lane]);

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

  if (initialLane === "saved") {
    return (
      <Stack spacing={3}>
        <Typography
          variant="h4"
          component="h1"
        >
          Сохранённые истории
        </Typography>
        {savedError ? (
          <Alert
            severity="error"
            action={<Button onClick={() => setSavedAttempt((value) => value + 1)}>Повторить</Button>}
          >
            {savedError}
          </Alert>
        ) : null}
        {savedLoading ? (
          <CircularProgress aria-label="Загрузка сохранённых историй" />
        ) : saved.length ? (
          <StoryTileRow
            stories={saved}
            selectedId={null}
            busy={busy}
            saved
            onSelect={(storyId) => setPreview({ items: saved, startId: storyId })}
            onOpen={(storyId) => setPreview({ items: saved, startId: storyId })}
            onRemove={(storyId) => void removeSaved(storyId)}
          />
        ) : !savedError ? (
          <Typography color="text.secondary">
            Сохранённых историй пока нет. Добавляйте понравившиеся истории в закладки при просмотре.
          </Typography>
        ) : null}
        {preview ? (
          <StoriesViewerModal
            items={preview.items}
            startId={preview.startId}
            onClose={() => {
              setPreview(null);
              setSavedAttempt((value) => value + 1);
            }}
          />
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Мои истории
      </Typography>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {limits ? (
        <Alert severity={limits.used >= limits.dailyLimit ? "warning" : "info"}>
          Опубликовано сегодня: {limits.used} из {limits.dailyLimit}. Лимит обновится {new Date(limits.resetAt).toLocaleString("ru-RU", { timeZone: limits.timezone })} ({limits.timezone}).
          {scope === "provider" ? " Лимит общий для всех сотрудников профиля." : ""} Удаление истории не возвращает публикацию.
        </Alert>
      ) : null}

      {live.length === 0 && completed.length === 0 && saved.length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>
          Историй пока нет. Добавьте первую кнопкой «Новая».
        </Typography>
      ) : null}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, alignItems: "flex-start" }}>
        <MyStoriesGallery
          composing={composing}
          completed={completed}
          lane={lane}
          busy={busy}
          imageProcessing={imageProcessing}
          previewUrl={previewUrl}
          previewVideo={!!file?.type.startsWith("video/")}
          allowVideo={limits?.video ?? false}
          textFormat={limits?.textFormat}
          previewAuthor={previewAuthor}
          previewText={text}
          onToggleCompose={() => setComposing(true)}
          onFile={(selected) => void selectStoryFile(selected)}
          onLane={(next) => setLane((current) => (current === next ? "live" : next))}
          metrics={
            live.length === 0 && completed.length === 0 && saved.length === 0 ? undefined : (
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
            )
          }
        />
        {composing && limits ? (
          <NewStoryComposer
            text={text}
            limits={limits}
            durationHours={durationHours}
            busy={busy}
            onText={setText}
            onDuration={setDurationHours}
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

      {lane === "saved" && savedError ? <Alert severity="error">{savedError}</Alert> : null}
      {!composing && visibleStories.length > 0 ? lane === "saved" ? (
        <StoryTileRow
          stories={saved}
          selectedId={selectedId}
          busy={busy}
          saved
          onSelect={setPickedId}
          onOpen={(storyId) => setPreview({ items: saved, startId: storyId })}
          onRemove={(storyId) => void removeSaved(storyId)}
        />
      ) : (
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
