FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
RUN pnpm install --filter frontend --filter shared
COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/
RUN pnpm --filter frontend build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
RUN pnpm install --filter frontend --filter shared --prod
COPY --from=builder /app/packages/frontend/.next packages/frontend/.next
COPY --from=builder /app/packages/frontend/public packages/frontend/public
CMD ["sh", "-c", "cd packages/frontend && npx next start -p ${FRONTEND_PORT:-3000}"]
