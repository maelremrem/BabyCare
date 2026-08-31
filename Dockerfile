FROM node:24-alpine AS build

WORKDIR /app

ARG APP_VERSION=""

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY . .
RUN if [ -n "${APP_VERSION}" ]; then npm version --no-git-tag-version "${APP_VERSION}"; fi \
    && npm ci

RUN npm run build:distribution \
    && npm prune --omit=dev

FROM docker:cli AS updater

RUN apk add --no-cache curl jq

COPY scripts/docker-update-worker.sh /usr/local/bin/babycare-docker-update
RUN chmod 0755 /usr/local/bin/babycare-docker-update

ENTRYPOINT ["/usr/local/bin/babycare-docker-update"]

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/babycare.db \
    TZ=Europe/Paris

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/dist-modern ./dist-modern
COPY --from=build /app/dist-ios15 ./dist-ios15

RUN mkdir -p /data /update \
    && chown -R node:node /data /update

USER node

EXPOSE 3000
VOLUME ["/data", "/update"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "server/app.js"]
