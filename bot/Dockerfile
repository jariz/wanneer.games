FROM node:24-alpine AS builder

WORKDIR /app

# Build tools required for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

# Install root dependencies (shared by shared/ files)
COPY package*.json ./
RUN npm ci --omit=dev

# Install bot dependencies (compiles better-sqlite3)
COPY bot/package*.json ./bot/
RUN cd bot && npm ci --omit=dev

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
