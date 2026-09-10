# ── Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps (workspaces)
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm install --ignore-scripts

# Copy source
COPY packages/shared ./packages/shared
COPY server ./server
COPY client ./client
COPY tsconfig.json* ./

# Generate Prisma client (needs schema) and build
RUN npm --prefix server exec prisma generate || true
RUN npm run build

# ── Runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules

EXPOSE 4000
CMD ["node", "server/dist/server.js"]
