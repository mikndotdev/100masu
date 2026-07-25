FROM oven/bun:1.3.11 AS build
WORKDIR /app

ENV SKIP_ENV_VALIDATION=1

COPY . .
RUN bun install --frozen-lockfile
RUN bun run build:realtime

FROM debian:12-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libstdc++6 \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -r app \
  && useradd -r -g app -u 10001 app

COPY --from=build --chown=app:app /app/apps/realtime/realtime ./realtime

USER app
EXPOSE 8080

CMD ["./realtime"]