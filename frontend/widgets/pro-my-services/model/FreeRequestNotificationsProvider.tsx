"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { resolveAccountKind } from "@/core/auth/authorization";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import { invalidateRequestListCache } from "../lib/request-list-cache";
import {
  emptyFreeRequestNotice,
  hasNewFreeRequests,
  isFreeRequestMarker,
  receiveFreeRequest,
  type FreeRequestNoticeState,
  type FreeRequestMarker,
} from "../lib/free-request-notices";

const Context = createContext({
  hasNew: false,
  getLatestMarker: (): FreeRequestMarker | null => null,
  markSeen: (_marker?: FreeRequestMarker | null) => {},
});
export const useFreeRequestNotifications = () => useContext(Context);

function readState(key: string): FreeRequestNoticeState {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) ?? "null",
    ) as Partial<FreeRequestNoticeState> | null;
    if (
      value?.initialized === true &&
      (value.latest === null || isFreeRequestMarker(value.latest)) &&
      (value.seen === null || isFreeRequestMarker(value.seen))
    )
      return value as FreeRequestNoticeState;
  } catch {
    /* Notification still works when storage is unavailable. */
  }
  return emptyFreeRequestNotice();
}

export function FreeRequestNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session, status } = useSession();
  const { socket } = useChatSocket();
  const userId = session?.user?.id;
  const enabled =
    status === "authenticated" &&
    resolveAccountKind(session?.user) === "PROVIDER";
  const key = `free-requests.notice:v2:${userId}`;
  const stateRef = useRef(emptyFreeRequestNotice());
  const [view, setView] = useState<{
    key: string;
    state: FreeRequestNoticeState;
  } | null>(null);

  const save = useCallback(
    (next: FreeRequestNoticeState) => {
      stateRef.current = next;
      setView({ key, state: next });
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Keep the in-memory state. */
      }
    },
    [key],
  );

  useEffect(() => {
    stateRef.current =
      enabled && userId ? readState(key) : emptyFreeRequestNotice();
    setView({ key, state: stateRef.current });
    if (!enabled || !userId) return;

    const refreshList = () => {
      invalidateRequestListCache({ serviceId: null });
      window.dispatchEvent(new Event("free-request:created"));
    };
    const onCreated = (payload: unknown) => {
      if (!isFreeRequestMarker(payload)) return;
      const next = receiveFreeRequest(stateRef.current, payload);
      if (next.latest?.requestId === stateRef.current.latest?.requestId) return;
      save(next);
      refreshList();
    };
    const onSnapshot = (payload: unknown) => {
      if (payload !== null && !isFreeRequestMarker(payload)) return;
      const previous = stateRef.current.latest?.requestId;
      const next = receiveFreeRequest(stateRef.current, payload, true);
      save(next);
      if (previous !== next.latest?.requestId) refreshList();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      const next = readState(key);
      const changed =
        next.latest?.requestId !== stateRef.current.latest?.requestId;
      stateRef.current = next;
      setView({ key, state: next });
      if (changed) refreshList();
    };
    socket?.on("free-request.created", onCreated);
    socket?.on("free-request.snapshot", onSnapshot);
    window.addEventListener("storage", onStorage);
    return () => {
      socket?.off("free-request.created", onCreated);
      socket?.off("free-request.snapshot", onSnapshot);
      window.removeEventListener("storage", onStorage);
    };
  }, [enabled, key, save, socket, userId]);

  const getLatestMarker = useCallback(() => stateRef.current.latest, []);
  const markSeen = useCallback(
    (marker = stateRef.current.latest) => {
      const seen = stateRef.current.seen;
      if (!enabled || !marker) return;
      // An older HTTP response must not undo another tab's read marker.
      if (
        seen &&
        (Date.parse(seen.createdAt) > Date.parse(marker.createdAt) ||
          (Date.parse(seen.createdAt) === Date.parse(marker.createdAt) &&
            seen.requestId >= marker.requestId))
      )
        return;
      save({ ...stateRef.current, seen: marker });
    },
    [enabled, save],
  );

  return (
    <Context.Provider
      value={{
        hasNew: enabled && view?.key === key && hasNewFreeRequests(view.state),
        markSeen,
        getLatestMarker,
      }}
    >
      {children}
    </Context.Provider>
  );
}
