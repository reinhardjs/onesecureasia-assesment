# Multi-stage build for frontend
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ ./
RUN npm run build

# Backend with Python support
FROM node:18-alpine

# Install Python and required system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    python3-dev \
    build-base \
    postgresql-client

WORKDIR /app

# Copy backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy Python requirements and install
COPY python-tests/requirements.txt ./python-tests/
RUN cd python-tests && pip3 install -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY python-tests/ ./python-tests/
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "backend/src/server.js"]