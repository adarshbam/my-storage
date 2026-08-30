# ==============================================================================
# Vault Storage Backend — Production Multi-Stage Dockerfile
# ==============================================================================

# --- Stage 1: Build & Dependencies ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (sharp, argon2)
RUN apk add --no-cache python3 make g++ gcc libc-dev

COPY package*.json ./
RUN npm ci --omit=dev

# --- Stage 2: Production Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for FFmpeg and Sharp
RUN apk add --no-cache ffmpeg vips

# Create a non-root system user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY . .

# Set proper ownership
USER nodejs

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "app.js"]
