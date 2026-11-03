"use client";

import { useCallback, useState } from "react";

function read(key: string): string {
  try { return key ? sessionStorage.getItem(key) ?? "" : ""; }
  catch { return ""; }
}

/** Tab-local drafts survive reauthentication without crossing accounts or conversations. */
export function useChatDraft(userId: string, requestId: string, conversationId: string) {
  const key = userId ? `chat-draft:${userId}:${requestId}:${conversationId}` : "";
  const [state, setState] = useState(() => ({key, value: read(key)}));
  const value = state.key === key ? state.value : read(key);
  const setValue = useCallback((value: string) => {
    try {
      if (key && value) sessionStorage.setItem(key, value);
      else if (key) sessionStorage.removeItem(key);
    } catch { /* Editing remains available when browser storage is unavailable. */ }
    setState({key, value});
  }, [key]);
  return [value, setValue] as const;
}
