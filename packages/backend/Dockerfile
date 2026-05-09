FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
COPY packages/mock-service/package.json packages/mock-service/
RUN pnpm install --filter backend --filter shared
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/
RUN cd packages/backend && npx prisma generate
RUN pnpm --filter backend build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/backend/package.json packages/backend/
COPY --from=builder /app/packages/backend/node_modules packages/backend/node_modules
COPY --from=builder /app/packages/backend/dist packages/backend/dist
COPY --from=builder /app/packages/backend/prisma packages/backend/prisma
COPY --from=builder /app/packages/shared packages/shared
CMD ["node", "packages/backend/dist/backend/src/index.js"]
