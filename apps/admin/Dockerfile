# app.prayer.tools (runs migrations on boot). Build context is the repo root.
FROM oven/bun:1.3
WORKDIR /app
COPY . .
RUN bun install && bun run --cwd apps/admin sync-layers && bun install
RUN bun run --cwd apps/admin build
ENV NODE_ENV=production
EXPOSE 3000
# Bun: the boot migrations import the layers' .ts migration files.
CMD ["bun", "apps/admin/.output/server/index.mjs"]
