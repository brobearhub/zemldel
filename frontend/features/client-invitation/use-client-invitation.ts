"use client";

import { useEffect, useState } from "react";
import { teamApi } from "@/shared/lib/team-api";

export type ClientInvitationPreview = {
  providerName: string;
  email: string;
  expiresAt: string;
  accepted: boolean;
};

type Result = { path: string; preview?: ClientInvitationPreview; error?: string };

export function acceptClientInvitation(path: string) {
  return teamApi(`/api${path}/accept`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
}

// Bind the auth form to the recipient on the server. Email stays out of login URLs.
export function useClientInvitation(returnTo: string | null) {
  const path = returnTo && /^\/client-invitations\/[\w-]{43}$/.test(returnTo) ? returnTo : null;
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    teamApi<ClientInvitationPreview>(`/api${path}`, { signal: controller.signal })
      .then((preview) => { if (!controller.signal.aborted) setResult({ path, preview }); })
      .catch((err: Error) => { if (!controller.signal.aborted) setResult({ path, error: err.message }); });
    return () => controller.abort();
  }, [path]);
  const current = result?.path === path ? result : null;
  return { path, loading: Boolean(path && !current), preview: current?.preview, error: current?.error };
}
