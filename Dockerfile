# Simple production Dockerfile (Railway / Docker deployments)
# Includes ffmpeg for server-side video generation.

FROM node:20-bookworm-slim AS base

# Install ffmpeg (and minimal deps for native modules if needed)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
