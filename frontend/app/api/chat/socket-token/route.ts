import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/core/auth";
import { getSocketJwtSecret, signSocketJwt } from "@/entities/chat/lib/server/socket-jwt";

const TTL_SECONDS = 300;

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = signSocketJwt(session.user.id, getSocketJwtSecret(), TTL_SECONDS);
    return NextResponse.json({ token, expiresInSeconds: TTL_SECONDS });
  } catch (error) {
    console.error("Error issuing socket token:", error);
    return NextResponse.json({ error: "Failed to issue socket token" }, { status: 500 });
  }
}
