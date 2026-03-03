FROM node:24-alpine

WORKDIR /app

# Install root dependencies (shared by shared/ files)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy bot dependencies and install
COPY bot/package*.json ./bot/
RUN cd bot && npm ci --omit=dev

# Copy shared source files
COPY shared/ ./shared/

# Copy bot source and migration files
COPY bot/src/ ./bot/src/
COPY bot/drizzle/ ./bot/drizzle/

# Create data directory for SQLite
RUN mkdir -p /data

ENV DATABASE_URL=/data/bot.db
ENV NODE_ENV=production

CMD ["node", "--experimental-strip-types", "bot/src/index.ts"]
