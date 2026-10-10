"use client";

import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  fetchPublicStories,
  liftUnseenStories,
  markStoriesViewed,
  readGuestStoryViews,
  recordStoryView,
  rememberGuestStoryView,
  type StoryDto,
  type StoryScope,
} from "@/entities/story";
import { useAppSelector } from "@/core/store/hooks";
import { useSelectedCity } from "@/features/select-city";
import { StoriesRail } from "./StoriesRail";
import { StoriesViewerModal } from "./StoriesViewerModal";

type Props = {
  providerId?: string;
  scope?: StoryScope;
};

export function HomeStoriesStrip({ providerId, scope = "user" }: Props = {}) {
  const city = useSelectedCity(scope === "provider" ? "provider" : "customer");
  const signedIn = useAppSelector((state) => state.auth.status === "authenticated");
  const activeProviderId = useAppSelector((state) => state.auth.user?.activeProviderId ?? null);
  const [items, setItems] = useState<StoryDto[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const sessionSeenRef = useRef(new Set<string>());
  const cityId = providerId ? null : (city?.id ?? null);
  const cabinetKey = scope === "provider" ? activeProviderId : null;

  useEffect(() => {
    let alive = true;
    void fetchPublicStories(providerId ? { providerId, scope } : { cityId, scope })
      .then((payload) => {
        if (!alive) return;
        const seen = [...sessionSeenRef.current, ...(signedIn ? [] : readGuestStoryViews())];
        const marked = markStoriesViewed(payload.items, seen);
        setItems(signedIn ? marked : liftUnseenStories(marked, seen));
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [cityId, providerId, signedIn, scope, cabinetKey]);

  if (items.length === 0) return null;

  return (
    <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
      <StoriesRail items={items} onOpen={setOpenId} />
      <StoriesViewerModal
        items={items}
        startId={openId}
        scope={scope}
        onClose={() => setOpenId(null)}
        onViewed={(storyId) => {
          sessionSeenRef.current.add(storyId);
          setItems((current) => markStoriesViewed(current, [storyId]));
          if (signedIn) {
            void recordStoryView(storyId, scope).catch(() => undefined);
            return;
          }
          rememberGuestStoryView(storyId);
        }}
        onChange={(storyId, patch) => {
          setItems((current) => current.map((item) => (item.id === storyId ? { ...item, ...patch } : item)));
        }}
      />
    </Box>
  );
}
