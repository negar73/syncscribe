# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build for the SyncScribe Next.js app.
#
#   docker build -t syncscribe .
#   docker run -p 3000:3000 --env-file .env syncscribe
#
# Produces a minimal runner image via Next.js `output: "standalone"`.
# (The WebSocket collaboration server runs as a separate process — see
# `npm run ws` in the README; it can be containerized the same way.)
# ─────────────────────────────────────────────────────────────────────────────

# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
# Prisma is generated during install (postinstall) — the schema must exist.
COPY package.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

# ── Stage 2: build the Next.js application ──────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* variables are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_WS_URL=ws://localhost:1234
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build

# ── Stage 3: minimal production runner ───────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
