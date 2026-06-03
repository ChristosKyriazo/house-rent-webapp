FROM node:20-alpine AS base

# ── deps: install all dependencies ──────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder: compile the Next.js app ────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build — only NEXT_PUBLIC_* vars are embedded in the client bundle and must be
# real values at build time. All other secrets are injected at runtime via .env.
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
# Clerk needs a key with valid format during build-time module init; the placeholder
# is never used at runtime — docker-compose.prod.yml injects the real value via .env.
ARG CLERK_SECRET_KEY=sk_test_placeholder
# DATABASE_URL is NOT needed at build time: prisma generate uses the schema file,
# not an actual DB connection. It is intentionally absent here.
RUN npm run build

# ── runner: minimal production image ────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
