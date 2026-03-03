FROM node:20-alpine

WORKDIR /app

# Copy bot dependencies and install
COPY bot/package*.json ./bot/
RUN cd bot && npm ci --omit=dev

# Copy shared source files (Cal.com utilities, event type map)
COPY src/lib/ ./src/lib/
COPY src/const/ ./src/const/

# Copy bot source and migration files
COPY bot/src/ ./bot/src/
COPY bot/drizzle/ ./bot/drizzle/
COPY bot/tsconfig.json ./bot/

# Create data directory for SQLite
RUN mkdir -p /data

ENV DATABASE_URL=/data/bot.db
ENV NODE_ENV=production

CMD ["./bot/node_modules/.bin/tsx", "--tsconfig", "./bot/tsconfig.json", "bot/src/index.ts"]
