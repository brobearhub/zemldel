import "server-only";

import { createHmac } from "node:crypto";

function toBase64UrlJson(obj: object) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

/**
 * HS256 JWT compatible with `jsonwebtoken.verify` on the Nest chat gateway.
 */
export function signSocketJwt(userId: string, secret: string, ttlSeconds: number) {
  const header = toBase64UrlJson({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = toBase64UrlJson({
    sub: userId,
    iat: now,
    exp: now + ttlSeconds,
  });
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function getSocketJwtSecret() {
  const secret = process.env.SOCKET_JWT_SECRET;
  if (!secret) {
    throw new Error("SOCKET_JWT_SECRET is not configured");
  }
  return secret;
}

