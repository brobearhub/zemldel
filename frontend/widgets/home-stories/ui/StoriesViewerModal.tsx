"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import { Box, Button, Dialog, Divider, IconButton, Link, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import NextLink from "next/link";
import {
  commentOnStory,
  deleteStoryComment,
  fetchStoryComments,
  followStoryAuthor,
  isOwnStory,
  likeStoryComment,
  recordStoryProfileOpen,
  replyToStory,
  saveStory,
  unfollowStoryAuthor,
  unlikeStoryComment,
  updateStoryComment,
  StoryFrame,
  unsaveStory,
  type StoryCommentDto,
  type StoryDto,
  type StoryScope,
} from "@/entities/story";
import { useAppSelector } from "@/core/store/hooks";
import {
  alignScrollerToStory,
  centeredStoryId,
  scrollTopForNeighborSlide,
  storyStepProgress,
  withNeighborFetches,
} from "../lib/story-window";
import { mergeStoryComments } from "../lib/story-comments";
import { storyViewerKeyAction } from "../lib/story-keys";
import { StoryCommentStream } from "./StoryCommentStream";

const STORY_GAP_PX = 28;
const STORY_CARD_HEIGHT = "min(86dvh, 820px)";
const STORY_STEP_MS = 640;

type Props = {
  items: StoryDto[];
  startId: string | null;
  scope?: StoryScope;
  onClose: () => void;
  onViewed?: (storyId: string) => void;
  onChange?: (storyId: string, patch: Partial<StoryDto>) => void;
};

type CommentBucket = {
  generation: number;
  status: "loading" | "ready" | "error";
  items: StoryCommentDto[];
  truncated: boolean;
  error: string | null;
};

const storyActionIconSx = {
  width: 32,
  height: 32,
  color: "common.black",
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.55),
  "&:hover": {
    bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.78),
  },
  "& .MuiSvgIcon-root": { fontSize: 18 },
  "&.Mui-disabled": { color: "common.black", opacity: 0.5 },
};

function authorTarget(story: StoryDto) {
  if (story.authorType === "PROVIDER" && story.providerId) return { targetProviderId: story.providerId };
  if (story.authorUserId) return { targetUserId: story.authorUserId };
  return null;
}

const storyCaptionTextSx = {
  typography: "body1",
  m: 0,
  width: "100%",
  color: "inherit",
  textAlign: "left",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
} as const;

/** Пустые строки между абзацами иначе съедают лимит в три строки, и многоточие негде нарисовать. */
function clampedStoryText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n");
}

function storyTextScrollTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const node = target.closest("[data-story-text-scroll], [data-story-comments]");
  return node instanceof HTMLElement ? node : null;
}

function wheelDeltaPixels(event: WheelEvent, pageSize: number): number {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * pageSize;
  return event.deltaY;
}

/**
 * Три строки на кадре. Клон без clamp живёт только на время замера: у обрезанного блока
 * scrollHeight совпадает с видимой высотой, а вторая копия текста в вёрстке ломает поиск по тексту.
 */
function captionOverflows(clamp: HTMLElement): boolean {
  const clone = clamp.cloneNode(true);
  if (!(clone instanceof HTMLElement)) return false;
  clone.style.display = "block";
  clone.style.setProperty("-webkit-line-clamp", "unset");
  clone.style.overflow = "visible";
  clone.style.position = "absolute";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  if (clamp.clientWidth < 1) return false;
  clone.style.width = `${clamp.clientWidth}px`;
  clone.removeAttribute("role");
  clone.removeAttribute("aria-expanded");
  clamp.parentElement?.appendChild(clone);
  const overflows = clone.scrollHeight > clamp.clientHeight + 1;
  clone.remove();
  return overflows;
}

function StoryCaption({
  text,
  expanded,
  onToggle,
  expandable = false,
}: {
  text: string;
  expanded: boolean;
  onToggle: () => void;
  expandable?: boolean;
}) {
  const clampRef = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const clamp = clampRef.current;
    if (!clamp || expanded) return;
    const update = () => {
      const next = captionOverflows(clamp);
      setOverflows((current) => (current === next ? current : next));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(clamp);
    return () => observer.disconnect();
  }, [text, expanded]);

  const interactive = expanded || overflows || expandable;
  const shown = expanded ? text : clampedStoryText(text);

  return (
    <Box
      sx={{
        position: "relative",
        minWidth: 0,
        ...(expanded ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } : null),
      }}
    >
      <Box
        ref={clampRef}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-expanded={interactive ? expanded : undefined}
        data-story-text-scroll={expanded ? "" : undefined}
        onClick={
          interactive
            ? (event) => {
                event.stopPropagation();
                onToggle();
              }
            : undefined
        }
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                event.stopPropagation();
                onToggle();
              }
            : undefined
        }
        sx={{
          ...storyCaptionTextSx,
          ...(expanded
            ? {
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overscrollBehavior: "contain",
                display: "block",
                cursor: "pointer",
                touchAction: "pan-y",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(255,255,255,0.5) transparent",
              }
            : {
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                cursor: interactive ? "pointer" : "auto",
              }),
          ...(interactive
            ? {
                "&:focus-visible": {
                  outline: "2px solid",
                  outlineColor: "common.white",
                  outlineOffset: 2,
                },
              }
            : null),
        }}
      >
        {shown}
      </Box>
    </Box>
  );
}

export function StoriesViewerModal({ items, startId, scope = "user", onClose, onViewed, onChange }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollCleanup = useRef<(() => void) | null>(null);
  const seenInThisOpen = useRef(new Set<string>());
  const steppingRef = useRef(false);
  const stepAnimRef = useRef(0);
  const stepReleaseRef = useRef(0);
  // Позиция, на которой жест уже остановился. Snap после включения иначе дочитывает колесо и уезжает на следующую сторис.
  const landedTopRef = useRef<number | null>(null);
  const alignedRef = useRef(false);
  const signedIn = useAppSelector((state) => state.auth.status === "authenticated");
  const currentUser = useAppSelector((state) => state.auth.user);
  const viewer = signedIn && currentUser ? { userId: currentUser.id, memberships: currentUser.memberships } : null;
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyNote, setReplyNote] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, CommentBucket>>({});
  const commentGen = useRef(0);
  const [actionError, setActionError] = useState<string | null>(null);
  // Подписи и кнопки прячутся у конкретной истории. Общий флаг гасил их на всех кадрах ленты.
  const [hiddenChromeIds, setHiddenChromeIds] = useState<ReadonlySet<string>>(() => new Set());
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  // Сначала грузится только открытая сторис. Соседи сверху и снизу добавляются после её готовности.
  const [session, setSession] = useState<{ startId: string | null; fetchIds: ReadonlySet<string> }>(() => ({
    startId,
    fetchIds: new Set(startId ? [startId] : []),
  }));
  const open = Boolean(startId);
  const startIdRef = useRef(startId);
  const idsRef = useRef<string[]>([]);
  const readyRef = useRef(new Set<string>());
  const readyFor = useRef<string | null | undefined>(undefined);
  startIdRef.current = startId;
  idsRef.current = items.map((item) => item.id);

  let fetchIds = session.fetchIds;
  if (session.startId !== startId) {
    fetchIds = new Set(startId ? [startId] : []);
    setSession({ startId, fetchIds });
  }
  if (readyFor.current !== startId) {
    readyFor.current = startId;
    readyRef.current = new Set();
  }
  const chromeForRef = useRef(startId);
  if (chromeForRef.current !== startId) {
    chromeForRef.current = startId;
    setHiddenChromeIds(new Set());
    setExpandedStoryId(null);
  }

  const onViewedRef = useRef(onViewed);
  onViewedRef.current = onViewed;

  // Какая история сейчас в центре, решает чистая функция. Наблюдатель пересечений
  // внутри диалога не присылал колбэк, поэтому просмотр писался только отсюда.
  const noteVisibleRef = useRef<(scroller: HTMLElement) => void>(() => undefined);
  noteVisibleRef.current = (scroller: HTMLElement) => {
    const storyId = centeredStoryId(scroller);
    if (!storyId) return;
    setSession((current) => {
      if (current.startId !== startIdRef.current) return current;
      if (current.fetchIds.has(storyId)) return current;
      const nextIds = new Set(current.fetchIds);
      nextIds.add(storyId);
      return { ...current, fetchIds: nextIds };
    });
    if (seenInThisOpen.current.has(storyId)) return;
    seenInThisOpen.current.add(storyId);
    onViewedRef.current?.(storyId);
  };

  const stepRef = useRef<(direction: 1 | -1) => void>(() => undefined);
  stepRef.current = (direction) => {
    const scroller = scrollerRef.current;
    if (!scroller || steppingRef.current || !alignedRef.current) return;
    const currentId = centeredStoryId(scroller);
    if (!currentId) return;
    const scrollerBox = scroller.getBoundingClientRect();
    const slides = [...scroller.querySelectorAll<HTMLElement>("[data-story-id]")].map((slide) => {
      const box = slide.getBoundingClientRect();
      return {
        id: slide.dataset.storyId ?? "",
        top: box.top - scrollerBox.top + scroller.scrollTop,
        height: box.height,
      };
    });
    const currentIndex = slides.findIndex((slide) => slide.id === currentId);
    const top = scrollTopForNeighborSlide(slides, currentIndex, direction, scroller.clientHeight);
    if (top === null || Math.abs(top - scroller.scrollTop) < 1) return;
    steppingRef.current = true;
    const from = scroller.scrollTop;
    const started = performance.now();
    const snap = scroller.style.scrollSnapType;
    scroller.style.scrollSnapType = "none";
    const tick = (now: number) => {
      const node = scrollerRef.current;
      if (!node) return;
      const progress = storyStepProgress((now - started) / STORY_STEP_MS);
      node.scrollTop = from + (top - from) * progress;
      if (progress < 1) {
        stepAnimRef.current = requestAnimationFrame(tick);
        return;
      }
      node.scrollTop = top;
      landedTopRef.current = top;
      noteVisibleRef.current(node);
      window.clearTimeout(stepReleaseRef.current);
      stepReleaseRef.current = window.setTimeout(() => {
        const current = scrollerRef.current;
        if (current) {
          current.scrollTop = top;
          current.style.scrollSnapType = snap;
          current.scrollTop = top;
        }
        stepReleaseRef.current = window.setTimeout(() => {
          const pinned = scrollerRef.current;
          if (pinned) pinned.scrollTop = top;
          landedTopRef.current = null;
          steppingRef.current = false;
        }, 160);
      }, 480);
    };
    stepAnimRef.current = requestAnimationFrame(tick);
  };

  const markReadyRef = useRef<(storyId: string) => void>(() => undefined);
  markReadyRef.current = (storyId: string) => {
    if (!startIdRef.current || readyRef.current.has(storyId)) return;
    readyRef.current.add(storyId);
    setSession((current) => {
      if (current.startId !== startIdRef.current) return current;
      const nextIds = withNeighborFetches(current.fetchIds, idsRef.current, storyId);
      if (nextIds === current.fetchIds) return current;
      return { ...current, fetchIds: nextIds };
    });
  };

  useEffect(() => {
    if (!startId) return;
    for (const story of items) {
      if (fetchIds.has(story.id) && !story.imageUrl) markReadyRef.current(story.id);
    }
  }, [startId, items, fetchIds]);

  useLayoutEffect(() => {
    if (!startId) return;
    // Кольцо снимаем в тот же кадр, что и открытие. Выравнивание кадра и scrollend
    // запаздывают: диалог ещё без высоты, и просмотр так и не записывается.
    if (!seenInThisOpen.current.has(startId)) {
      seenInThisOpen.current.add(startId);
      onViewedRef.current?.(startId);
    }
    alignedRef.current = false;
    let frames = 0;
    let raf = 0;
    const tick = () => {
      const scroller = scrollerRef.current;
      const id = startIdRef.current;
      if (!scroller || !id) return;
      if (alignScrollerToStory(scroller, id)) {
        alignedRef.current = true;
        noteVisibleRef.current(scroller);
        return;
      }
      if (frames >= 8) return;
      frames += 1;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [startId]);

  useEffect(() => {
    if (!open) {
      seenInThisOpen.current.clear();
      alignedRef.current = false;
      steppingRef.current = false;
      landedTopRef.current = null;
      cancelAnimationFrame(stepAnimRef.current);
      window.clearTimeout(stepReleaseRef.current);
    }
  }, [open]);

  useEffect(
    () => () => {
      scrollCleanup.current?.();
      cancelAnimationFrame(stepAnimRef.current);
      window.clearTimeout(stepReleaseRef.current);
    },
    [],
  );

  const bindScroller = useCallback((node: HTMLDivElement | null) => {
    scrollCleanup.current?.();
    scrollCleanup.current = null;
    scrollerRef.current = node;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      const text = storyTextScrollTarget(event.target);
      // Слушатель в capture забирает колесо у кадра. Над раскрытым текстом жест остаётся прокруткой текста.
      if (text) {
        event.preventDefault();
        const delta = wheelDeltaPixels(event, text.clientHeight);
        if (delta !== 0 && text.scrollHeight > text.clientHeight + 1) text.scrollTop += delta;
        return;
      }
      event.preventDefault();
      if (event.deltaY === 0) return;
      stepRef.current(event.deltaY > 0 ? 1 : -1);
    };
    const onScroll = () => {
      const landed = landedTopRef.current;
      if (landed === null) return;
      if (Math.abs(node.scrollTop - landed) > 1) node.scrollTop = landed;
    };
    const finishStep = () => {
      if (steppingRef.current) return;
      noteVisibleRef.current(node);
    };
    node.addEventListener("wheel", onWheel, { passive: false, capture: true });
    node.addEventListener("scroll", onScroll, { passive: true });
    node.addEventListener("scrollend", finishStep);
    scrollCleanup.current = () => {
      node.removeEventListener("wheel", onWheel, { capture: true });
      node.removeEventListener("scroll", onScroll);
      node.removeEventListener("scrollend", finishStep);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        const target = event.target;
        if (target instanceof Element && target.closest("[data-story-composer]")) return;
        onClose();
        return;
      }
      const target = event.target;
      const action = storyViewerKeyAction(event, {
        typing: target instanceof Element && Boolean(target.closest("input, textarea, [contenteditable='true']")),
        sent: false,
        activatable: target instanceof Element && Boolean(target.closest("button, a, [role='button']")),
      });
      if (!action || action === "dismiss-sent") return;
      event.preventDefault();
      stepRef.current(action === "next" ? 1 : -1);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!expandedStoryId) return;
    const storyId = expandedStoryId;
    const generation = commentGen.current + 1;
    commentGen.current = generation;
    setComments((current) => ({
      ...current,
      [storyId]: {
        generation,
        status: "loading",
        items: current[storyId]?.items ?? [],
        truncated: current[storyId]?.truncated ?? false,
        error: null,
      },
    }));
    let alive = true;
    void fetchStoryComments(storyId, scope)
      .then((payload) => {
        if (!alive) return;
        setComments((current) => {
          const bucket = current[storyId];
          if (!bucket || bucket.generation !== generation) return current;
          return {
            ...current,
            [storyId]: {
              generation,
              status: "ready",
              items: mergeStoryComments(payload.items, bucket.items),
              truncated: payload.truncated,
              error: null,
            },
          };
        });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setComments((current) => {
          const bucket = current[storyId];
          if (!bucket || bucket.generation !== generation) return current;
          return {
            ...current,
            [storyId]: {
              ...bucket,
              status: "error",
              error: error instanceof Error ? error.message : "Не удалось загрузить комментарии",
            },
          };
        });
      });
    return () => {
      alive = false;
    };
  }, [expandedStoryId, scope]);

  function patchComment(storyId: string, commentId: string, patch: Partial<StoryCommentDto>) {
    setComments((current) => {
      const bucket = current[storyId];
      if (!bucket) return current;
      return {
        ...current,
        [storyId]: {
          ...bucket,
          items: bucket.items.map((item) => (item.id === commentId ? { ...item, ...patch } : item)),
        },
      };
    });
  }

  function submitComment(storyId: string) {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    setActionError(null);
    setReplyNote(null);
    void commentOnStory(storyId, text, scope)
      .then((created) => {
        setDraft("");
        setPosting(false);
        setComments((current) => {
          const bucket = current[storyId];
          const items = [
            ...(bucket?.items ?? []).filter((item) => item.id !== created.id && !item.id.startsWith("pending-")),
            created,
          ];
          return {
            ...current,
            [storyId]: {
              generation: bucket?.generation ?? 0,
              status: "ready",
              items,
              truncated: bucket?.truncated ?? false,
              error: null,
            },
          };
        });
      })
      .catch((error: unknown) => {
        setPosting(false);
        setActionError(error instanceof Error ? error.message : "Не удалось отправить комментарий");
      });
  }

  function submitReply(storyId: string) {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    setActionError(null);
    setReplyNote(null);
    void replyToStory(storyId, text, scope)
      .then(() => {
        setDraft("");
        setPosting(false);
        setReplyNote("Ответ отправлен");
      })
      .catch((error: unknown) => {
        setPosting(false);
        setActionError(error instanceof Error ? error.message : "Не удалось отправить ответ");
      });
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={(_event, reason) => {
        if (
          reason === "escapeKeyDown" &&
          document.activeElement instanceof Element &&
          document.activeElement.closest("[data-story-composer]")
        ) {
          return;
        }
        onClose();
      }}
      slotProps={{
        backdrop: { sx: { bgcolor: "rgba(0, 0, 0, 0.72)" } },
        paper: {
          sx: {
            bgcolor: "transparent",
            backgroundImage: "none",
            boxShadow: "none",
            overflow: "hidden",
          },
        },
        transition: {
          onEntered: () => {
            const id = startIdRef.current;
            const scroller = scrollerRef.current;
            if (!id || !scroller) return;
            if (!alignScrollerToStory(scroller, id)) return;
            alignedRef.current = true;
            noteVisibleRef.current(scroller);
          },
        },
      }}
    >
      <Box onClick={onClose} sx={{ height: "100dvh" }}>
      <Box
        ref={bindScroller}
        sx={{
          height: "100dvh",
          width: "100%",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          scrollSnapStop: "always",
          overscrollBehavior: "contain",
          position: "relative",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Box
          aria-hidden
          sx={{ height: { xs: 0, md: `calc((100dvh - ${STORY_CARD_HEIGHT}) / 2)` }, flexShrink: 0 }}
        />
        {items.map((story, index) => {
          const chromeVisible = !hiddenChromeIds.has(story.id);
          const showActions = signedIn && !isOwnStory(story, viewer);
          const textExpanded = expandedStoryId === story.id;
          return (
          <Box
            key={story.id}
            data-story-id={story.id}
            onClick={onClose}
            sx={{
              height: { xs: "100dvh", md: STORY_CARD_HEIGHT },
              mb: { xs: 0, md: index === items.length - 1 ? 0 : `${STORY_GAP_PX}px` },
              scrollSnapAlign: "center",
              scrollSnapStop: "always",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              px: { xs: 0, md: 2 },
            }}
          >
            <Box
              onClick={(event) => {
                event.stopPropagation();
                const scroller = scrollerRef.current;
                if (!scroller) return;
                const centered = centeredStoryId(scroller);
                if (centered && centered !== story.id) {
                  const slides = [...scroller.querySelectorAll<HTMLElement>("[data-story-id]")];
                  const currentIndex = slides.findIndex((slide) => slide.dataset.storyId === centered);
                  const targetIndex = slides.findIndex((slide) => slide.dataset.storyId === story.id);
                  if (currentIndex >= 0 && targetIndex >= 0 && targetIndex !== currentIndex) {
                    stepRef.current(targetIndex > currentIndex ? 1 : -1);
                  }
                  return;
                }
                setHiddenChromeIds((current) => {
                  const next = new Set(current);
                  if (next.has(story.id)) next.delete(story.id);
                  else next.add(story.id);
                  return next;
                });
                setExpandedStoryId(null);
              }}
              sx={{
                position: "relative",
                width: { xs: "100%", md: "fit-content" },
                height: { xs: "100%", md: "auto" },
                maxWidth: "100%",
                flex: "0 0 auto",
              }}
            >
              <StoryFrame
              imageUrl={fetchIds.has(story.id) ? story.imageUrl : null}
              imageAlt="Фото истории"
              onImageLoad={() => markReadyRef.current(story.id)}
              onImageError={() => markReadyRef.current(story.id)}
              sx={{
                height: { xs: "100%", md: STORY_CARD_HEIGHT },
                width: { xs: "100%", md: "auto" },
                aspectRatio: { xs: "auto", md: "9 / 16" },
                maxWidth: { xs: "100%", md: "calc(100vw - 32px)" },
                borderRadius: { xs: 0, md: 2 },
                boxShadow: { xs: "none", md: "0 16px 48px rgba(0,0,0,0.4)" },
              }}
            >
              {showActions || textExpanded ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  onClick={(event) => event.stopPropagation()}
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 2,
                    opacity: chromeVisible ? 1 : 0,
                    transition: "opacity 280ms ease",
                    pointerEvents: chromeVisible ? "auto" : "none",
                    "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                  }}
                >
                  {showActions ? (
                    <Tooltip title={story.saved ? "В закладках" : "Сохранить"}>
                      <IconButton
                        aria-label={story.saved ? "В закладках" : "Сохранить"}
                        onClick={() => {
                          const next = !story.saved;
                          onChange?.(story.id, { saved: next });
                          void (next ? saveStory(story.id, scope) : unsaveStory(story.id, scope)).catch((error: unknown) => {
                            onChange?.(story.id, { saved: !next });
                            setActionError(error instanceof Error ? error.message : "Не удалось сохранить");
                          });
                        }}
                        sx={storyActionIconSx}
                      >
                        {story.saved ? <BookmarkRoundedIcon /> : <BookmarkBorderRoundedIcon />}
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {textExpanded ? (
                    <Tooltip title="Закрыть комментарии">
                      <IconButton
                        aria-label="Закрыть комментарии"
                        onClick={() => {
                          setReplyNote(null);
                          setExpandedStoryId(null);
                        }}
                        sx={storyActionIconSx}
                      >
                        <CloseRoundedIcon />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
              ) : null}
              <Stack
                spacing={1}
                data-story-chrome={chromeVisible ? "visible" : "hidden"}
                onClick={(event) => event.stopPropagation()}
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  px: 2.5,
                  pb: 2.5,
                  pt: textExpanded ? 7 : story.imageUrl ? 14 : 2.5,
                  color: "common.white",
                  transform: chromeVisible ? "none" : "translateY(100%)",
                  transition: "transform 320ms ease",
                  pointerEvents: chromeVisible ? "auto" : "none",
                  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                  ...(textExpanded
                    ? {
                        top: 0,
                        bottom: 0,
                        overflow: "hidden",
                        justifyContent: "flex-start",
                        bgcolor: "rgba(0,0,0,0.4)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                      }
                    : story.imageUrl
                      ? {
                          background: "transparent",
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(transparent, rgba(0,0,0,0.82))",
                            backdropFilter: "blur(2px)",
                            WebkitBackdropFilter: "blur(2px)",
                            maskImage: "linear-gradient(transparent, #000 55%)",
                            WebkitMaskImage: "linear-gradient(transparent, #000 55%)",
                            pointerEvents: "none",
                          },
                          "& > *": { position: "relative", zIndex: 1 },
                        }
                      : { top: 0, justifyContent: "flex-end", background: "transparent" }),
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: textExpanded ? "stretch" : "center",
                    ...(textExpanded ? { flex: 1, minHeight: 0, overflow: "hidden" } : null),
                  }}
                >
                  <Stack
                    spacing={0.75}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      ...(textExpanded ? { minHeight: 0, overflow: "hidden" } : null),
                    }}
                  >
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ alignItems: "center", flexShrink: 0 }}
                  >
                    {showActions ? (
                      <Tooltip title={story.following ? "Вы подписаны" : "Подписаться"}>
                        <span>
                          <IconButton
                            aria-label={story.following ? "Вы подписаны" : "Подписаться"}
                            disabled={!authorTarget(story)}
                            onClick={() => {
                              const target = authorTarget(story);
                              if (!target) return;
                              const next = !story.following;
                              onChange?.(story.id, { following: next });
                              void (next ? followStoryAuthor({ ...target, scope }) : unfollowStoryAuthor({ ...target, scope })).catch((error: unknown) => {
                                onChange?.(story.id, { following: !next });
                                setActionError(error instanceof Error ? error.message : "Не удалось изменить подписку");
                              });
                            }}
                            sx={storyActionIconSx}
                          >
                            {story.following ? <HowToRegRoundedIcon /> : <PersonAddAlt1RoundedIcon />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : null}
                    {story.authorHref ? (
                      <Link
                        component={NextLink}
                        href={story.authorHref}
                        underline="hover"
                        onClick={() => {
                          void recordStoryProfileOpen(story.id, scope).catch(() => undefined);
                        }}
                        sx={{ color: "common.white", fontWeight: 700 }}
                      >
                        {story.authorName}
                      </Link>
                    ) : (
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {story.authorName}
                      </Typography>
                    )}
                  </Stack>
                  <Box sx={textExpanded ? { maxHeight: "45%", minHeight: 0, display: "flex", flexShrink: 0 } : undefined}>
                    <StoryCaption
                      text={story.text}
                      expanded={textExpanded}
                      expandable
                      onToggle={() => {
                        setReplyNote(null);
                        setExpandedStoryId((current) => (current === story.id ? null : story.id));
                      }}
                    />
                  </Box>
                  {textExpanded ? (
                    <Box sx={{ flexShrink: 0, py: 2 }}>
                      <Divider sx={{ borderColor: "rgba(255,255,255,0.28)" }} />
                    </Box>
                  ) : null}
                  {textExpanded ? (
                    <StoryCommentStream
                      status={comments[story.id]?.status ?? "loading"}
                      items={comments[story.id]?.items ?? []}
                      truncated={comments[story.id]?.truncated ?? false}
                      error={comments[story.id]?.error ?? null}
                      signedIn={signedIn}
                      canReply={showActions}
                      startWithComment={!showActions}
                      canModerate={Boolean(viewer && isOwnStory(story, viewer))}
                      draft={draft}
                      posting={posting}
                      replyNote={replyNote}
                      editingId={editingId}
                      editText={editText}
                      pendingDeleteId={pendingDeleteId}
                      onDraftChange={setDraft}
                      onComment={() => submitComment(story.id)}
                      onReply={() => submitReply(story.id)}
                      onLike={(comment) => {
                        if (comment.mine) return;
                        const next = !comment.liked;
                        patchComment(story.id, comment.id, {
                          liked: next,
                          likeCount: Math.max(0, comment.likeCount + (next ? 1 : -1)),
                        });
                        void (next ? likeStoryComment(story.id, comment.id) : unlikeStoryComment(story.id, comment.id)).catch((error: unknown) => {
                          patchComment(story.id, comment.id, { liked: comment.liked, likeCount: comment.likeCount });
                          setActionError(error instanceof Error ? error.message : "Не удалось поставить отметку");
                        });
                      }}
                      onStartEdit={(comment) => {
                        setEditingId(comment.id);
                        setEditText(comment.text);
                      }}
                      onEditText={setEditText}
                      onSaveEdit={(commentId) => {
                        const text = editText.trim();
                        if (!text || posting) return;
                        setPosting(true);
                        void updateStoryComment(story.id, commentId, text)
                          .then((updated) => {
                            patchComment(story.id, commentId, updated);
                            setEditingId(null);
                            setPosting(false);
                          })
                          .catch((error: unknown) => {
                            setPosting(false);
                            setActionError(error instanceof Error ? error.message : "Не удалось изменить комментарий");
                          });
                      }}
                      onCancelEdit={() => setEditingId(null)}
                      onAskDelete={setPendingDeleteId}
                      onCancelDelete={() => setPendingDeleteId(null)}
                      onConfirmDelete={(commentId) => {
                        setPosting(true);
                        void deleteStoryComment(story.id, commentId)
                          .then(() => {
                            setComments((current) => {
                              const bucket = current[story.id];
                              if (!bucket) return current;
                              return {
                                ...current,
                                [story.id]: { ...bucket, items: bucket.items.filter((item) => item.id !== commentId) },
                              };
                            });
                            setPendingDeleteId(null);
                            setPosting(false);
                          })
                          .catch((error: unknown) => {
                            setPosting(false);
                            setActionError(error instanceof Error ? error.message : "Не удалось удалить комментарий");
                          });
                      }}
                    />
                  ) : null}
                  </Stack>
                  {!textExpanded && signedIn ? (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setDraft("");
                        setReplyNote(null);
                        setActionError(null);
                        setExpandedStoryId(story.id);
                      }}
                      sx={{ flexShrink: 0 }}
                    >
                      {showActions ? "Написать" : "Комментировать"}
                    </Button>
                  ) : null}
                </Stack>
                {actionError ? (
                  <Typography variant="caption" sx={{ color: "error.light" }}>
                    {actionError}
                  </Typography>
                ) : null}
              </Stack>
            </StoryFrame>
            </Box>
          </Box>
          );
        })}
        <Box
          aria-hidden
          sx={{ height: { xs: 0, md: `calc((100dvh - ${STORY_CARD_HEIGHT}) / 2)` }, flexShrink: 0 }}
        />
      </Box>
      <IconButton
        aria-label="Закрыть"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        sx={{
          position: "fixed",
          zIndex: 2,
          top: 16,
          right: 16,
          borderRadius: "50%",
          color: "common.white",
          bgcolor: "rgba(0,0,0,0.45)",
          "&:hover": { bgcolor: "rgba(0,0,0,0.65)" },
        }}
      >
        <CloseRoundedIcon />
      </IconButton>
      </Box>
    </Dialog>
  );
}
