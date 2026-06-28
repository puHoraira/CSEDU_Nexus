FROM node:20-alpine

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
