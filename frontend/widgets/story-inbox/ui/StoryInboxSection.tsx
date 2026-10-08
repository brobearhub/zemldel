"use client";

import { createContext, forwardRef, useContext, useEffect, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import { Alert, Avatar, Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ChatBox,
  chatBoxClasses,
  chatComposerClasses,
  chatConversationClasses,
  chatMessageClasses,
  chatMessageListClasses,
} from "@mui/x-chat";
import type { ChatAdapter, ChatConversation, ChatMessage, ConversationListItemProps } from "@mui/x-chat/headless";
import { toPublicAssetSrc } from "@/shared/lib/public-asset-src";
import {
  fetchStoryConversationMessages,
  fetchStoryConversations,
  sendStoryConversationMessage,
  type StoryConversationDto,
  type StoryConversationMessageDto,
  type StoryScope,
} from "@/entities/story";
import { pluralRu } from "@/shared/lib/plural-ru";
import { formatInboxTime, storyMarkerLabel, withSentPreview } from "../lib/inbox-format";
import { brown } from "@mui/material/colors";
const InboxLookupContext = createContext<ReadonlyMap<string, StoryConversationDto>>(new Map());

type Props = {
  scope: StoryScope;
};

function messageText(message: ChatMessage): string {
  const part = message.parts.find((item) => item.type === "text");
  return part?.type === "text" ? part.text.trim() : "";
}

function avatarSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return toPublicAssetSrc(url);
}

function stampSelfAvatar(messages: ChatMessage[], selfImageUrl: string | null): ChatMessage[] {
  const src = avatarSrc(selfImageUrl);
  if (!src) return messages;
  let changed = false;
  const next = messages.map((message) => {
    if (message.role !== "user" || message.author?.avatarUrl) return message;
    if (message.author && message.author.id !== "self") return message;
    changed = true;
    return { ...message, author: { id: "self", avatarUrl: src } };
  });
  return changed ? next : messages;
}

function emptyAssistantStream(): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.close();
    },
  });
}

function toChatMessages(items: StoryConversationMessageDto[], conversationId: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let storyId: string | null = null;
  for (const item of items) {
    if (item.storyId !== storyId) {
      messages.push({
        id: `story:${item.storyId}:${item.id}`,
        conversationId,
        role: "system",
        status: "sent",
        createdAt: item.createdAt,
        parts: [{ type: "text", text: storyMarkerLabel(item.storyText) }],
      });
      storyId = item.storyId;
    }
    messages.push({
      id: item.id,
      conversationId,
      role: item.mine ? "user" : "assistant",
      status: "sent",
      createdAt: item.createdAt,
      parts: [{ type: "text", text: item.text }],
      author: {
        id: item.mine ? "self" : item.id,
        avatarUrl: avatarSrc(item.imageUrl),
      },
    });
  }
  return messages;
}

const InboxRow = forwardRef<HTMLDivElement, ConversationListItemProps>(function InboxRow(props, ref) {
  const {
    conversation,
    selected,
    unread: _unread,
    focused: _focused,
    ownerState: _ownerState,
    slots: _slots,
    slotProps: _slotProps,
    children: _children,
    ...rest
  } = props as ConversationListItemProps & { ownerState?: unknown };
  const item = useContext(InboxLookupContext).get(conversation.id);
  const unreadCount = item?.unreadCount ?? conversation.unreadCount ?? 0;
  const titles = (item?.storyTitles ?? []).map((title) => `«${title}»`).join(", ");

  return (
    <Box
      ref={ref}
      {...rest}
      sx={{
        display: "flex",
        gap: 1.25,
        alignItems: "flex-start",
        px: 1.5,
        py: 1.25,
        cursor: "pointer",
        bgcolor: selected ? (theme) => alpha(theme.palette.primary.main, 0.1) : "transparent",
        "&:hover": { bgcolor: (theme) => alpha(theme.palette.primary.main, selected ? 0.14 : 0.06) },
      }}
    >
      <Avatar
        src={item?.imageUrl ? toPublicAssetSrc(item.imageUrl) : undefined}
        sx={{
          width: 40,
          height: 40,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
          color: "primary.dark",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {(conversation.title ?? "?").trim().charAt(0).toLocaleUpperCase("ru-RU") || "?"}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
          <Typography noWrap sx={{ flex: 1, fontWeight: unreadCount > 0 ? 800 : 700 }}>
            {conversation.title}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", flexShrink: 0 }}>
            {item ? formatInboxTime(item.lastMessageAt, new Date()) : ""}
          </Typography>
        </Stack>
        {titles ? (
          <Typography noWrap variant="body2" sx={{ color: "primary.dark" }}>
            {titles}
          </Typography>
        ) : null}
        <Typography noWrap variant="body2" sx={{ color: "text.secondary" }}>
          {item?.preview ?? ""}
        </Typography>
      </Box>
      {unreadCount > 0 ? (
        <Box
          sx={{
            minWidth: 22,
            height: 22,
            px: 0.75,
            borderRadius: 11,
            bgcolor: "primary.main",
            color: "common.white",
            fontSize: 12,
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {unreadCount}
        </Box>
      ) : null}
    </Box>
  );
});

const SendButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button"> & { ownerState?: unknown }>(
  function SendButton({ ownerState: _ownerState, children: _children, ...props }, ref) {
    return (
      <Button ref={ref} variant="contained" {...props} sx={{ flexShrink: 0, px: 2.5 }}>
        Отправить
      </Button>
    );
  },
);

export function StoryInboxSection({ scope }: Props) {
  const [items, setItems] = useState<StoryConversationDto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfImageUrl, setSelfImageUrl] = useState<string | null>(null);
  const [seenScope, setSeenScope] = useState(scope);

  if (seenScope !== scope) {
    setSeenScope(scope);
    setActiveId(null);
    setItems([]);
    setMessages([]);
    setSelfImageUrl(null);
    setLoaded(false);
    setError(null);
  }

  useEffect(() => {
    let alive = true;
    void fetchStoryConversations(scope)
      .then((payload) => {
        if (!alive) return;
        setItems(payload.items);
        setSelfImageUrl(payload.selfImageUrl);
        setActiveId(payload.items[0]?.id ?? null);
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить переписку");
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [scope]);

  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    void Promise.all([fetchStoryConversations(scope), fetchStoryConversationMessages(scope, activeId)])
      .then(([list, thread]) => {
        if (!alive) return;
        setSelfImageUrl(list.selfImageUrl);
        setItems(list.items.map((item) => (item.id === activeId ? { ...item, unreadCount: 0 } : item)));
        setMessages(stampSelfAvatar(toChatMessages(thread.items, activeId), list.selfImageUrl));
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить переписку");
      });
    return () => {
      alive = false;
    };
  }, [scope, activeId]);

  const adapter = useMemo<ChatAdapter>(
    () => ({
      async sendMessage(input) {
        const conversationId = input.conversationId;
        const text = messageText(input.message);
        if (!conversationId || !text) throw new Error("Введите сообщение");
        await sendStoryConversationMessage(scope, conversationId, text);
        setItems((current) => withSentPreview(current, conversationId, text, new Date().toISOString()));
        return emptyAssistantStream();
      },
    }),
    [scope],
  );

  const lookup = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const conversations = useMemo<ChatConversation[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.cityName ?? undefined,
        unreadCount: item.unreadCount,
        lastMessageAt: item.lastMessageAt,
      })),
    [items],
  );
  const unreadTotal = items.reduce((sum, item) => sum + item.unreadCount, 0);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: "baseline", justifyContent: "space-between", gap: 2, pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.dark" }}>
          Сообщения по историям
        </Typography>
        {unreadTotal > 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {unreadTotal} {pluralRu(unreadTotal, ["непрочитанное", "непрочитанных", "непрочитанных"])}
          </Typography>
        ) : null}
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {loaded && items.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Пока нет переписки.
        </Typography>
      ) : null}
      {items.length > 0 ? (
        <InboxLookupContext.Provider value={lookup}>
          <ChatBox
            adapter={adapter}
            features={{
              conversationList: true,
              attachments: false,
              helperText: false,
              suggestions: false,
              streamingIndicator: false,
            }}
            conversations={conversations}
            activeConversationId={activeId ?? undefined}
            onActiveConversationChange={(nextId) => setActiveId(nextId ?? null)}
            messages={messages}
            onMessagesChange={(next) => setMessages(stampSelfAvatar(next, selfImageUrl))}
            localeText={{
              composerInputPlaceholder: "Написать сообщение...",
              composerInputAriaLabel: "Сообщение",
              composerSendButtonLabel: "Отправить",
            }}
            slots={{ composerSendButton: SendButton, messageAuthorName: null }}
            slotProps={{
              conversationList: { slots: { item: InboxRow } },
              messageList: { sx: { bgcolor: "primary.light" } },
              composerRoot: {
                sx: {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1,
                  border: 0,
                  boxShadow: "none",
                  bgcolor: "background.paper",
                  m: 0,
                  px: 1.5,
                  py: 1.5,
                  "&:focus-within": { borderColor: "transparent", boxShadow: "none" },
                  [`& .${chatComposerClasses.textArea}`]: {
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    px: 1.5,
                    py: 1.25,
                  },
                },
              },
            }}
            sx={{
              height: 640,
              bgcolor: "background.paper",
              borderRadius: 3,
              border: 1,
              borderColor: "divider",
              overflow: "hidden",
              "--ChatBox-conversationListWidth": "320px",
              [`& .${chatBoxClasses.threadPane}`]: {
                bgcolor: "background.paper",
              },
              [`& .${chatMessageListClasses.root}`]: {
                bgcolor: (theme) => alpha(theme.palette.primary.dark, 0.4),
              },
              [`& .${chatConversationClasses.headerActions}`]: { display: "none" },
              [`& .${chatMessageClasses.roleUser} .${chatMessageClasses.bubble}`]: {
                bgcolor: "primary.main",
                color: "common.white",
              },
              [`& .${chatMessageClasses.roleAssistant} .${chatMessageClasses.bubble}`]: {
                bgcolor: "background.paper",
                color: "text.primary",
              },
              [`& .${chatMessageClasses.root}:not(.${chatMessageClasses.roleUser}):not(.${chatMessageClasses.roleAssistant})`]: {
                justifyItems: "center",
                [`& .${chatMessageClasses.bubble}`]: {
                  bgcolor: "transparent",
                  color: "text.secondary",
                  boxShadow: "none",
                  fontSize: 13,
                },
              },
            }}
          />
        </InboxLookupContext.Provider>
      ) : null}
    </Stack>
  );
}
