# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim
WORKDIR /app

# Baileys / native deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm install --no-save tsx@4.20.5

COPY services/whatsapp-gateway ./services/whatsapp-gateway
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV WHATSAPP_GATEWAY_PORT=8787
EXPOSE 8787

# Railway sets PORT at runtime; config/dev.ts also read PORT.
CMD ["npx", "tsx", "services/whatsapp-gateway/src/dev.ts"]
