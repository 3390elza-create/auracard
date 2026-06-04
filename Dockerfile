# syntax=docker/dockerfile:1

# ---- deps: install node_modules ----
FROM node:20-alpine AS deps
WORKDIR /app
# openssl + libc6-compat are required by the Prisma engine.
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: produce the standalone Next.js server ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client (admin dashboard) before the Next build. Uses the
# pinned local prisma (6.x) from node_modules — never the registry's latest.
RUN npx prisma generate

# NEXT_PUBLIC_* values are inlined into the client bundle AT BUILD TIME.
# They must be present here (passed as build args from docker-compose).
ARG NEXT_PUBLIC_WC_PROJECT_ID
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_RPC_URL_BASE
ARG NEXT_PUBLIC_RPC_URL_ARBITRUM
ARG NEXT_PUBLIC_RPC_URL_POLYGON
ARG NEXT_PUBLIC_VAULT_ADDRESS
ARG NEXT_PUBLIC_USDC_ADDRESS
ARG NEXT_PUBLIC_USDC_PERMIT_VERSION
ENV NEXT_PUBLIC_WC_PROJECT_ID=$NEXT_PUBLIC_WC_PROJECT_ID \
    NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL \
    NEXT_PUBLIC_RPC_URL_BASE=$NEXT_PUBLIC_RPC_URL_BASE \
    NEXT_PUBLIC_RPC_URL_ARBITRUM=$NEXT_PUBLIC_RPC_URL_ARBITRUM \
    NEXT_PUBLIC_RPC_URL_POLYGON=$NEXT_PUBLIC_RPC_URL_POLYGON \
    NEXT_PUBLIC_VAULT_ADDRESS=$NEXT_PUBLIC_VAULT_ADDRESS \
    NEXT_PUBLIC_USDC_ADDRESS=$NEXT_PUBLIC_USDC_ADDRESS \
    NEXT_PUBLIC_USDC_PERMIT_VERSION=$NEXT_PUBLIC_USDC_PERMIT_VERSION \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- migrator: tiny image with the Prisma CLI + schema to sync the DB ----
# Run once after the DB is up:  docker compose run --rm migrate
FROM node:20-alpine AS migrator
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY package.json ./
# No migration history yet — push the schema directly to create the tables.
CMD ["npx", "prisma", "db", "push"]

# ---- runner: small runtime image ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
RUN apk add --no-cache openssl libc6-compat
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
# Standalone output bundles only what the server needs.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma generated client + query engine for the admin routes at runtime
# (Next standalone tracing does not include the generated engine binary).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
