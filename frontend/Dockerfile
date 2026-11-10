# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Public values are embedded by next build. App Platform passes these as build args.
# NEXTAUTH_URL also sets the origin in prerendered metadata and robots.txt.
ARG NEXTAUTH_URL=https://zemledel.ru
ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_CHAT_SOCKET_URL
ARG NEXT_PUBLIC_S3_ENDPOINT
ARG NEXT_PUBLIC_S3_PUBLIC_BUCKET
ARG NEXT_PUBLIC_S3_FORCE_PATH_STYLE=false

RUN npm run build

FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# curl is also used by the existing deploy/docker-compose.prod.yml healthcheck.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

# Standalone contains only traced runtime dependencies; no second npm install.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Image optimization and ISR must be able to write their caches as a non-root user.
RUN mkdir -p .next/cache && chown -R node:node .next

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/maintenance" >/dev/null || exit 1

CMD ["node", "server.js"]
