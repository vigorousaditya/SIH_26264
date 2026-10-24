# ========================================================
# Dockerfile for CaseBridge — AICTE System (SIH26264)
# Production Multi-Stage Build: Client + Express API
# ========================================================

# ----------------- STAGE 1: Client Build -----------------
FROM node:20-alpine AS client-builder

WORKDIR /app

# Copy package descriptors for caching
COPY package*.json ./
COPY client/package*.json ./client/

# Install client dependencies
RUN cd client && npm install

# Copy client source
COPY client ./client

# Build production bundle
RUN cd client && npm run build

# ----------------- STAGE 2: Production Server ------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy package descriptors
COPY package*.json ./
COPY server/package*.json ./server/

# Install production server dependencies
RUN cd server && npm install --omit=dev

# Copy server application
COPY server ./server

# Copy built frontend assets from stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Ensure data directory exists and has write permissions for non-root user
RUN mkdir -p /app/server/data && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "server/index.js"]
