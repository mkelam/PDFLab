# PDFLab Backend - Production Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Copy views folder to dist (TypeScript doesn't copy .ejs files)
RUN mkdir -p /app/dist/views && cp -r /app/src/views/* /app/dist/views/

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Create storage directories with proper permissions
RUN mkdir -p /app/storage/uploads /app/storage/outputs && \
    chmod -R 755 /app/storage

# Expose port
EXPOSE 3006

# Copy health check script
COPY healthcheck.js ./

# Health check configuration
# interval: Check every 30s
# timeout: Each check times out after 3s
# start-period: Wait 40s after container starts before checking
# retries: Mark unhealthy after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Start production server
CMD ["npm", "start"]
