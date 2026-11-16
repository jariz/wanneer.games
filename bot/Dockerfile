FROM node:24-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.9 --activate

# Build tools required for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY bot/package.json ./bot/
RUN pnpm install --prod --frozen-lockfile

FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/bot/node_modules ./bot/node_modules

# Copy shared source files
COPY shared/ ./shared/

# Copy bot source and migration files
COPY bot/src/ ./bot/src/
COPY bot/drizzle/ ./bot/drizzle/

RUN mkdir -p /data

ENV DATABASE_URL=/data/bot.db
ENV NODE_ENV=production

CMD ["node", "bot/src/index.ts"]
