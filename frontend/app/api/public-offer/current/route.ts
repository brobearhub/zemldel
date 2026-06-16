import { NextResponse } from "next/server";
import { loadLegalDoc } from "@/shared/lib/server";

export async function GET() {
  try {
    const doc = await loadLegalDoc("public-offer");
    return NextResponse.json({ version: doc.version, markdown: doc.markdown }, { status: 200 });
  } catch (error) {
    console.error("Error fetching public offer:", error);
    return NextResponse.json({ error: "Failed to fetch public offer" }, { status: 500 });
  }
}

