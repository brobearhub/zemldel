import { NextResponse } from "next/server";
import { loadLegalDoc } from "@/lib/legal-docs";

export async function GET() {
  try {
    const doc = await loadLegalDoc("privacy-policy");
    return NextResponse.json({ version: doc.version, markdown: doc.markdown }, { status: 200 });
  } catch (error) {
    console.error("Error fetching privacy policy:", error);
    return NextResponse.json({ error: "Failed to fetch privacy policy" }, { status: 500 });
  }
}

