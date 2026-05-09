FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/mock-service/package.json packages/mock-service/
RUN corepack enable pnpm && pnpm install --frozen-lockfile --filter mock-service
COPY packages/mock-service/ packages/mock-service/
RUN pnpm --filter mock-service build

FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/mock-service/package.json packages/mock-service/
RUN corepack enable pnpm && pnpm install --frozen-lockfile --filter mock-service --prod
COPY --from=builder /app/packages/mock-service/dist packages/mock-service/dist
CMD ["node", "packages/mock-service/dist/index.js"]
