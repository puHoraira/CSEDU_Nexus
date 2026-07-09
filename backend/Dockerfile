FROM node:20-alpine

# Install Chromium and dependencies required for Puppeteer (used by html-pdf-node)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Tell Puppeteer to use system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev --production

# Copy additional files needed for runtime
COPY switch-env.js ./
COPY .env* ./

# Copy source
COPY src/ ./src/

EXPOSE 5000

CMD ["node", "src/server.js"]
