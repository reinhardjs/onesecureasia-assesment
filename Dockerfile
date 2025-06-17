# Use a lightweight base image with Node.js and Python
FROM node:18-alpine

# Install Python and required packages without additional repositories
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy backend dependencies and install quickly
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production --silent

# Copy Python requirements and install
COPY python-tests/requirements.txt ./python-tests/
RUN cd python-tests && pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY python-tests/ ./python-tests/

# Create a simple frontend placeholder
RUN mkdir -p frontend/build && \
    echo '<!DOCTYPE html><html><head><title>OneSecure Assessment</title></head><body><h1>OneSecure Domain Security Assessment</h1><p>Backend API available at <a href="/api-docs">/api-docs</a></p><p>Health check: <a href="/health">/health</a></p></body></html>' > frontend/build/index.html

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "backend/src/server.js"]
