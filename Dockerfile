# Stage 1: Base image
FROM node:20-alpine AS base

# Stage 2: Install dependencies
FROM base AS deps
# Install build tools required for sqlite3 and sharp on Alpine
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json* ./
# If you use npm, keep npm ci. If using yarn, use yarn install --frozen-lockfile
RUN npm ci

# Stage 3: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# This command generates the .next/standalone directory
RUN npm run build

# Stage 4: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Next.js standalone mode ignores the port in package.json and listens on 3000 by default
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: Run as a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public directory
COPY --from=builder /app/public ./public

# Copy the standalone build and static files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy the SQLite DB
COPY --from=builder /app/collection.db ./collection.db

# Give full permissions to everything
RUN chmod -R 777 /app

USER nextjs

EXPOSE 3000

# Standalone mode runs via server.js, not the package.json scripts
CMD ["node", "server.js"]