import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type LegalDocId = "public-offer" | "privacy-policy";

export const LEGAL_DOCS: Record<
  LegalDocId,
  {
    title: string;
    version: string;
    filename: string;
  }
> = {
  "public-offer": {
    title: "Публичная оферта",
    version: "2026-04-19",
    filename: "public-offer-2026-04-19.md",
  },
  "privacy-policy": {
    title: "Политика конфиденциальности",
    version: "2026-04-19",
    filename: "privacy-policy-2026-04-19.md",
  },
} as const;

async function readFromRepoDocs(filename: string) {
  const candidates = [
    // monorepo root: <repo>/docs/...
    resolve(process.cwd(), "..", "docs", filename),
    // fallback: <repo>/frontend/docs/...
    resolve(process.cwd(), "docs", filename),
  ];

  for (const absolute of candidates) {
    try {
      return await readFile(absolute, "utf-8");
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Legal doc file not found: ${filename}`);
}

export async function loadLegalDoc(id: LegalDocId) {
  const meta = LEGAL_DOCS[id];
  const markdown = await readFromRepoDocs(meta.filename);
  return {
    id,
    title: meta.title,
    version: meta.version,
    markdown,
  };
}

