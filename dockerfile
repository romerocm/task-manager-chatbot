# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Add tini
RUN apk add --no-cache tini

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install express dotenv vite-express

# Install all other project dependencies
RUN npm install

# Copy project files
COPY . .

# Ensure the app directory is writable
RUN chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 3000

# Use tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "run", "dev"]