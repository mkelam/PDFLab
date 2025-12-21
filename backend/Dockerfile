FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev deps for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules and Python for PDF tracker
RUN apk add --no-cache python3 py3-pip make g++ && \
    pip3 install --break-system-packages praw>=7.7.0

# Copy package files
COPY package*.json ./

# Install production dependencies with native compilation
# Use --ignore-scripts to skip husky, then rebuild bcrypt
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild bcrypt && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy PDF tracker scripts
COPY scripts/pdf-tracker ./scripts/pdf-tracker

# Create necessary directories for volume mount points
RUN mkdir -p storage/uploads storage/outputs logs scripts/pdf-tracker

# Expose port
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/server.js"]
