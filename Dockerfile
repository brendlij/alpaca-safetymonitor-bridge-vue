# Multi-stage Docker build
# Stage 1: Build the Vue.js frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend for production
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./dist

# Copy server files
COPY server/ ./server/
COPY wrapper-server.cjs ./
COPY wrapper-logger.cjs ./

# Create data directories and set up user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S alpaca -u 1001 -G nodejs && \
    mkdir -p /app/data /app/server/data && \
    chown -R alpaca:nodejs /app

USER alpaca

# Environment variables with defaults
ENV NODE_ENV=production
ENV WEB_PORT=3000

# Expose ports (Alpaca ports are standard/configured in UI)
EXPOSE $WEB_PORT 11111 32227

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:' + process.env.WEB_PORT + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "wrapper-server.cjs"]