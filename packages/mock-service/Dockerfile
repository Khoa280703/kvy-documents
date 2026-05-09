FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/mock-service/package.json ./
RUN npm install
COPY packages/mock-service/ ./
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
COPY packages/mock-service/package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
