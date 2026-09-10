# syntax=docker/dockerfile:1
# Root Dockerfile so Railway auto-detects DOCKERFILE builder (gateway only).
FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY services/whatsapp-gateway ./services/whatsapp-gateway
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV WHATSAPP_GATEWAY_PORT=8787
EXPOSE 8787

CMD ["npx", "tsx", "services/whatsapp-gateway/src/dev.ts"]
