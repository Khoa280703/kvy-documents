FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
COPY packages/mock-service/package.json packages/mock-service/
RUN pnpm install --filter backend --filter shared
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/
RUN pnpm --filter backend build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
COPY packages/mock-service/package.json packages/mock-service/
RUN pnpm install --filter backend --filter shared --prod
COPY --from=builder /app/packages/backend/dist packages/backend/dist
COPY packages/backend/prisma packages/backend/prisma
RUN cd packages/backend && npx prisma generate
CMD ["node", "packages/backend/dist/index.js"]
