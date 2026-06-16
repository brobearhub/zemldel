import "server-only";

import { createHmac } from "node:crypto";

function getInternalApiSecret() {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is not configured");
  }
  return secret;
}

export function createInternalAuthTokenForUserId(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId }), "utf8").toString("base64url");
  const signature = createHmac("sha256", getInternalApiSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

