# Stage 1: Build TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8004

USER node

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder --chown=node:node /app/dist ./dist

EXPOSE 8004

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8004/healthz || exit 1

CMD ["node", "dist/index.js"]
