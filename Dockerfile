# One image for every process; PT_PROCESS picks which one runs:
#   admin  — app.prayer.tools (runs migrations on boot)
#   public — site domains, api., go., /my
#   worker — reminders, jobs, daily sweeps
FROM oven/bun:1.3 AS build
WORKDIR /app
COPY . .
RUN bun install && bun run --cwd apps/admin sync-layers && bun install
RUN bun run --cwd apps/admin build && bun run --cwd apps/public build

FROM oven/bun:1.3
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends nodejs ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "scripts/start.sh"]
