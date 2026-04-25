# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV DEBIAN_FRONTEND=noninteractive

# Copy application files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Install @playwright/mcp globally, then use ITS OWN playwright-core
# to install the exact matching chromium revision it expects.
RUN npm install -g @playwright/mcp@0.0.68 && \
    /usr/local/lib/node_modules/@playwright/mcp/node_modules/.bin/playwright install --with-deps chromium

EXPOSE 3000

CMD ["node", "server.js"]
