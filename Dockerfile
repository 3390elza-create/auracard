# syntax=docker/dockerfile:1

# ---- deps: install node_modules ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: produce the standalone Next.js server ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle AT BUILD TIME.
# They must be present here (passed as build args from docker-compose).
ARG NEXT_PUBLIC_WC_PROJECT_ID
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_RPC_URL_BASE
ARG NEXT_PUBLIC_RPC_URL_ARBITRUM
ARG NEXT_PUBLIC_RPC_URL_POLYGON
ARG NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA
ARG NEXT_PUBLIC_TEST_USDC_ADDRESS
ARG NEXT_PUBLIC_VAULT_ADDRESS
ENV NEXT_PUBLIC_WC_PROJECT_ID=$NEXT_PUBLIC_WC_PROJECT_ID \
    NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL \
    NEXT_PUBLIC_RPC_URL_BASE=$NEXT_PUBLIC_RPC_URL_BASE \
    NEXT_PUBLIC_RPC_URL_ARBITRUM=$NEXT_PUBLIC_RPC_URL_ARBITRUM \
    NEXT_PUBLIC_RPC_URL_POLYGON=$NEXT_PUBLIC_RPC_URL_POLYGON \
    NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA=$NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA \
    NEXT_PUBLIC_TEST_USDC_ADDRESS=$NEXT_PUBLIC_TEST_USDC_ADDRESS \
    NEXT_PUBLIC_VAULT_ADDRESS=$NEXT_PUBLIC_VAULT_ADDRESS \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: small runtime image ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
# Standalone output bundles only what the server needs.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
