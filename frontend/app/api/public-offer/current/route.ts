import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CURRENT_PUBLIC_OFFER_VERSION = "2026-04-19" as const;
const CURRENT_PUBLIC_OFFER_DOC = `public-offer-${CURRENT_PUBLIC_OFFER_VERSION}.md` as const;

export async function GET() {
  try {
    const candidates = [
      resolve(process.cwd(), "..", "docs", CURRENT_PUBLIC_OFFER_DOC),
      resolve(process.cwd(), "docs", CURRENT_PUBLIC_OFFER_DOC),
    ];

    let markdown: string | null = null;
    for (const absolute of candidates) {
      try {
        markdown = await readFile(absolute, "utf-8");
        break;
      } catch {
        // try next candidate
      }
    }

    if (!markdown) {
      return NextResponse.json(
        { error: `Public offer file not found: ${CURRENT_PUBLIC_OFFER_DOC}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ version: CURRENT_PUBLIC_OFFER_VERSION, markdown }, { status: 200 });
  } catch (error) {
    console.error("Error fetching public offer:", error);
    return NextResponse.json({ error: "Failed to fetch public offer" }, { status: 500 });
  }
}

