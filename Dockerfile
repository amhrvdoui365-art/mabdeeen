FROM node:24-bookworm-slim AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --include=dev
COPY client/ ./
ENV VITE_API_URL=/api
RUN npm run build

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --include=dev
COPY server/ ./
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=8080 \
    DATABASE_PATH=/data/mansa.db \
    UPLOAD_DIR=/data/uploads

WORKDIR /app/server
COPY --from=build /app/server/package.json /app/server/package-lock.json ./
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/client/dist /app/client/dist
RUN mkdir -p /data

EXPOSE 8080
CMD ["node", "dist/index.js"]
