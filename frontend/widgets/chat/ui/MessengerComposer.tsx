"use client";

import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import { IconButton } from "@mui/material";
import { ChatComposer, ChatComposerTextArea } from "@mui/x-chat";
import { ChatProvider, type ChatAdapter } from "@mui/x-chat/headless";

// MUI owns presentation only. Both form submission and Enter use the existing
// outbox, which already handles replies, idempotency, failures and retries.
const externalTransport: ChatAdapter = {
  async sendMessage() {
    throw new Error("Messages must be sent through the request chat outbox");
  },
};

export function MessengerComposer({
  draft,
  onDraftChange,
  onSend,
  disabled,
  sending,
  autoFocus,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  sending?: boolean;
  autoFocus?: boolean;
}) {
  const send = () => {
    if (!disabled && !sending && draft.trim()) onSend();
  };
  return (
    <ChatProvider
      adapter={externalTransport}
      composerValue={draft}
      onComposerValueChange={onDraftChange}
    >
      <ChatComposer
        variant="compact"
        features={{ attachments: false }}
        disabled={disabled}
        aria-label="Ответ клиенту"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        sx={{
          "&&": {
            m: 0,
            px: {
              xs: 1.5,
              tablet: 2,
            },
            pt: 1.5,
            pb: "max(12px, env(safe-area-inset-bottom))",
            border: 0,
            borderRadius: 0,
            boxShadow: "none",
            flexWrap: "nowrap",
            gap: 1,
            alignItems: "flex-end",
            bgcolor: "background.paper",
          },
        }}
      >
        <ChatComposerTextArea
          aria-label="Сообщение"
          placeholder="Сообщение…"
          maxRows={4}
          autoFocus={autoFocus}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              send();
            }
          }}
          sx={{
            minWidth: 0,
            flex: 1,
            border: 1,
            borderColor: "divider",
            borderRadius: {
              xs: "22px",
              tablet: "12px",
            },
            px: 2,
            py: 1.25,
            fontFamily: "inherit",
            fontSize: "1rem",
            lineHeight: 1.5,
            bgcolor: "background.default",
            "&:focus": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: -1,
            },
          }}
        />
        <IconButton
          type="submit"
          aria-label="Отправить"
          disabled={disabled || sending || !draft.trim()}
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: "50%",
            "&&": {
              bgcolor: "text.primary",
              color: "background.paper",
            },
            "&&.Mui-disabled": {
              bgcolor: "action.disabledBackground",
              color: "action.disabled",
            },
            "&:hover": {
              bgcolor: "text.primary",
            },
          }}
        >
          <ArrowUpwardRoundedIcon />
        </IconButton>
      </ChatComposer>
    </ChatProvider>
  );
}
