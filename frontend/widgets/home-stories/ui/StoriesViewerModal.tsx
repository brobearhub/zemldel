"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import BookmarkRoundedIcon from "@mui/icons-material/BookmarkRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Box, Button, CircularProgress, Dialog, IconButton, Link, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import NextLink from "next/link";
import {
  followStoryAuthor,
  isOwnStory,
  recordStoryProfileOpen,
  replyToStory,
  repostStory,
  saveStory,
  unfollowStoryAuthor,
  StoryFrame,
  unsaveStory,
  type StoryDto,
} from "@/entities/story";
import { useAppSelector } from "@/core/store/hooks";
import {
  alignScrollerToStory,
  centeredStoryId,
  scrollTopForNeighborSlide,
  storyStepProgress,
  withNeighborFetches,
} from "../lib/story-window";
import { storyViewerKeyAction } from "../lib/story-keys";

const STORY_GAP_PX = 28;
const STORY_CARD_HEIGHT = "min(86dvh, 820px)";
const STORY_STEP_MS = 640;

type Props = {
  items: StoryDto[];
  startId: string | null;
  onClose: () => void;
  onViewed?: (storyId: string) => void;
  onChange?: (storyId: string, patch: Partial<StoryDto>) => void;
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
  const node = target.closest("[data-story-text-scroll]");
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

function StoryCaption({ text, expanded, onToggle }: { text: string; expanded: boolean; onToggle: () => void }) {
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

  const interactive = expanded || overflows;
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
      {overflows && !expanded ? (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            right: 0,
            bottom: 0,
            pl: 2,
            pointerEvents: "none",
            lineHeight: 1.5,
            background: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.72) 55%)",
          }}
        >
          …
        </Box>
      ) : null}
    </Box>
  );
}

export function StoriesViewerModal({ items, startId, onClose, onViewed, onChange }: Props) {
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
  const [reply, setReply] = useState("");
  const [replyStoryId, setReplyStoryId] = useState<string | null>(null);
  const [sendingStoryId, setSendingStoryId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<ReadonlySet<string>>(() => new Set());
  const sentIdsRef = useRef(sentIds);
  const dismissSentRef = useRef<(storyId: string) => void>(() => undefined);
  sentIdsRef.current = sentIds;
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
        onClose();
        return;
      }
      const target = event.target;
      const scroller = scrollerRef.current;
      const storyId = scroller ? centeredStoryId(scroller) : null;
      const action = storyViewerKeyAction(event, {
        typing: target instanceof Element && Boolean(target.closest("input, textarea, [contenteditable='true']")),
        sent: Boolean(storyId && sentIdsRef.current.has(storyId)),
        activatable: target instanceof Element && Boolean(target.closest("button, a, [role='button']")),
      });
      if (!action) return;
      event.preventDefault();
      if (action === "dismiss-sent") {
        if (storyId) dismissSentRef.current(storyId);
        return;
      }
      stepRef.current(action === "next" ? 1 : -1);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function dismissSent(storyId: string) {
    setSentIds((current) => {
      if (!current.has(storyId)) return current;
      const next = new Set(current);
      next.delete(storyId);
      return next;
    });
  }
  dismissSentRef.current = dismissSent;

  function submitReply(storyId: string) {
    const text = reply.trim();
    if (!text || sendingStoryId) return;
    setSendingStoryId(storyId);
    setActionError(null);
    void replyToStory(storyId, text)
      .then(() => {
        setReply("");
        setReplyStoryId(null);
        setSendingStoryId(null);
        setSentIds((current) => new Set(current).add(storyId));
      })
      .catch((error: unknown) => {
        setSendingStoryId(null);
        setActionError(error instanceof Error ? error.message : "Не удалось отправить ответ");
      });
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
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
              {showActions ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  onClick={(event) => event.stopPropagation()}
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 1,
                    opacity: chromeVisible ? 1 : 0,
                    transition: "opacity 280ms ease",
                    pointerEvents: chromeVisible ? "auto" : "none",
                    "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                  }}
                >
                  <Tooltip title={story.saved ? "В закладках" : "Сохранить"}>
                    <IconButton
                      aria-label={story.saved ? "В закладках" : "Сохранить"}
                      onClick={() => {
                        const next = !story.saved;
                        onChange?.(story.id, { saved: next });
                        void (next ? saveStory(story.id) : unsaveStory(story.id)).catch((error: unknown) => {
                          onChange?.(story.id, { saved: !next });
                          setActionError(error instanceof Error ? error.message : "Не удалось сохранить");
                        });
                      }}
                      sx={storyActionIconSx}
                    >
                      {story.saved ? <BookmarkRoundedIcon /> : <BookmarkBorderRoundedIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Репост">
                    <IconButton
                      aria-label="Репост"
                      onClick={() => {
                        void repostStory(story.id, 1).catch((error: unknown) => {
                          setActionError(error instanceof Error ? error.message : "Не удалось сделать репост");
                        });
                      }}
                      sx={storyActionIconSx}
                    >
                      <RepeatRoundedIcon />
                    </IconButton>
                  </Tooltip>
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
                  pt: textExpanded ? 4.5 : story.imageUrl ? 14 : 2.5,
                  color: "common.white",
                  background: "transparent",
                  ...(story.imageUrl
                    ? {
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          inset: 0,
                          background: textExpanded
                            ? "rgba(0,0,0,0.82)"
                            : "linear-gradient(transparent, rgba(0,0,0,0.82))",
                          backdropFilter: textExpanded ? "blur(8px)" : "blur(2px)",
                          WebkitBackdropFilter: textExpanded ? "blur(8px)" : "blur(2px)",
                          maskImage: textExpanded
                            ? "linear-gradient(transparent, #000 28px)"
                            : "linear-gradient(transparent, #000 55%)",
                          WebkitMaskImage: textExpanded
                            ? "linear-gradient(transparent, #000 28px)"
                            : "linear-gradient(transparent, #000 55%)",
                          pointerEvents: "none",
                        },
                        "& > *": { position: "relative", zIndex: 1 },
                      }
                    : null),
                  transform: chromeVisible ? "none" : "translateY(100%)",
                  transition: "transform 320ms ease",
                  pointerEvents: chromeVisible ? "auto" : "none",
                  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                  ...(!story.imageUrl && !textExpanded
                    ? { top: 0, justifyContent: "flex-end" }
                    : null),
                  ...(textExpanded
                    ? { top: showActions ? 56 : 12, overflow: "hidden", justifyContent: "flex-start" }
                    : null),
                }}
              >
                {showActions && sendingStoryId === story.id ? (
                  <CircularProgress size={28} sx={{ color: "primary.main" }} aria-label="Отправка ответа" />
                ) : showActions && sentIds.has(story.id) ? (
                  <IconButton
                    aria-label="Ответ отправлен"
                    onClick={() => dismissSent(story.id)}
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "primary.main",
                      color: "common.black",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    <CheckRoundedIcon />
                  </IconButton>
                ) : (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: textExpanded ? "stretch" : "center",
                      ...(textExpanded ? { flex: 1, minHeight: 0, overflow: "hidden" } : null),
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        ...(textExpanded ? { minHeight: 0, display: "flex", flexDirection: "column" } : null),
                      }}
                    >
                      {showActions && replyStoryId === story.id ? (
                        <TextField
                          autoFocus
                          fullWidth
                          size="small"
                          placeholder="Ответ автору"
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                            event.preventDefault();
                            submitReply(story.id);
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              bgcolor: "rgba(255,255,255,0.12)",
                              color: "common.white",
                              borderRadius: 1,
                              "&.Mui-focused": {
                                bgcolor: "common.white",
                                color: "text.primary",
                              },
                            },
                          }}
                        />
                      ) : (
                        <Stack
                          spacing={0.75}
                          sx={textExpanded ? { flex: 1, minHeight: 0, overflow: "hidden" } : undefined}
                        >
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: "center", ...(textExpanded ? { flexShrink: 0 } : null) }}
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
                                      void (next ? followStoryAuthor(target) : unfollowStoryAuthor(target)).catch((error: unknown) => {
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
                                  void recordStoryProfileOpen(story.id).catch(() => undefined);
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
                          <StoryCaption
                            text={story.text}
                            expanded={textExpanded}
                            onToggle={() => setExpandedStoryId((current) => (current === story.id ? null : story.id))}
                          />
                        </Stack>
                      )}
                    </Box>
                    {showActions ? (
                      replyStoryId === story.id ? (
                        <Tooltip title="Ответить">
                          <Box component="span" sx={{ display: "flex", alignSelf: "stretch" }}>
                            <IconButton
                              aria-label="Отправить ответ"
                              disabled={!reply.trim()}
                              onClick={() => submitReply(story.id)}
                              sx={{
                                height: "100%",
                                width: 40,
                                p: 0,
                                borderRadius: 1,
                                flexShrink: 0,
                                color: "primary.contrastText",
                                bgcolor: "primary.main",
                                "&:hover": { bgcolor: "primary.dark" },
                                "&.Mui-disabled": {
                                  color: "primary.contrastText",
                                  bgcolor: "primary.main",
                                  opacity: 0.5,
                                },
                              }}
                            >
                              <SendRoundedIcon />
                            </IconButton>
                          </Box>
                        </Tooltip>
                      ) : (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            setReply("");
                            setReplyStoryId(story.id);
                            setActionError(null);
                            setExpandedStoryId(null);
                          }}
                          sx={{ flexShrink: 0, ...(textExpanded ? { alignSelf: "flex-end" } : null) }}
                        >
                          Ответить
                        </Button>
                      )
                    ) : null}
                  </Stack>
                )}
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
