FROM node:lts-slim

WORKDIR /app

# Copy package.json and package-lock.json if present
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy app code
COPY app/ ./app

# Healthcheck: check if the bot process is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD pgrep -f "index.js" || exit 1

# Start the discord.js bot directly
CMD ["node", "app/index.js"]
