# Use Node.js with Debian instead of Alpine to avoid repository issues
FROM node:18-slim

# Use mirror for Debian repositories if needed
RUN echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4 \
    && echo 'deb http://deb.debian.org/debian bookworm main' > /etc/apt/sources.list \
    && echo 'deb http://security.debian.org/debian-security bookworm-security main' >> /etc/apt/sources.list \
    && echo 'deb http://deb.debian.org/debian bookworm-updates main' >> /etc/apt/sources.list

# Install Python and required packages with more retries and a fallback mechanism
RUN for i in $(seq 1 5); do \
        apt-get update && \
        apt-get install -y python3 python3-pip python3-venv --no-install-recommends && \
        apt-get clean && \
        rm -rf /var/lib/apt/lists/* && \
        break || \
        sleep 5; \
    done

WORKDIR /app

# Copy backend dependencies and install quickly
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production --silent

# Copy Python requirements and install in a virtual environment
COPY python-tests/requirements.txt ./python-tests/
RUN python3 -m venv /app/venv && \
    . /app/venv/bin/activate && \
    pip3 install --upgrade pip && \
    pip3 install --no-cache-dir -r python-tests/requirements.txt && \
    deactivate

# Add venv to PATH so we can use the Python packages
ENV PATH="/app/venv/bin:$PATH"

# Copy application code
COPY backend/ ./backend/
COPY python-tests/ ./python-tests/

# Create a simple frontend placeholder
RUN mkdir -p frontend/build && \
    echo '<!DOCTYPE html><html><head><title>OneSecure Assessment</title></head><body><h1>OneSecure Domain Security Assessment</h1><p>Backend API available at <a href="/api-docs">/api-docs</a></p><p>Health check: <a href="/health">/health</a></p></body></html>' > frontend/build/index.html

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m -s /bin/bash nextjs

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "backend/src/server.js"]
