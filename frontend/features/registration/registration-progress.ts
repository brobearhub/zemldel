"use client";

import type { AccountKind } from "@/core/auth/authorization";

type RegistrationEmail = {
  email: string;
  accountKind: AccountKind | null;
};

export type RegistrationProgress = RegistrationEmail & (
  | { stage: "code"; resendAt: string; codeUnavailable?: boolean }
  | { stage: "verified" }
);

const STORAGE_KEY = "zemledel.registration-progress";
let currentProgress: RegistrationProgress | null = null;

// Only display state is kept in the tab. The server validates the HttpOnly proof on submission.
export function readRegistrationProgress(): RegistrationProgress | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return currentProgress;
    const saved = JSON.parse(raw);
    if (typeof saved?.email !== "string" || !saved.email) return null;
    const accountKind = saved.accountKind === "PROVIDER" || saved.accountKind === "CUSTOMER"
      ? saved.accountKind : null;
    if (saved.stage === "verified") return { stage: "verified", email: saved.email, accountKind };
    if (saved.stage === "code" && typeof saved.resendAt === "string" && Number.isFinite(Date.parse(saved.resendAt))) {
      return {
        stage: "code",
        email: saved.email,
        accountKind,
        resendAt: saved.resendAt,
        codeUnavailable: saved.codeUnavailable === true || undefined,
      };
    }
    return null;
  } catch {
    return currentProgress;
  }
}

export function saveRegistrationProgress(progress: RegistrationProgress) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    currentProgress = null;
  } catch {
    currentProgress = progress;
  }
}

export function clearRegistrationProgress() {
  currentProgress = null;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The in-memory state was cleared above.
  }
}
