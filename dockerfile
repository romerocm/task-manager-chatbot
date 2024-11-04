# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Add necessary tools including PostgreSQL client
RUN apk add --no-cache tini postgresql-client

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (both production and development)
RUN npm install pg express dotenv vite-express canvas-confetti
RUN npm install

# Copy project files
COPY . .

# Create migrations directory and ensure it exists
RUN mkdir -p migrations

# Ensure the app directory and migrations are writable
RUN chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 3000

# Use tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

# Use the start script
CMD ["npm", "run", "dev"]
