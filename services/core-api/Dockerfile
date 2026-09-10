FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching — dependencies change less
# frequently than source code, so this layer is cached across builds)
COPY package.json package-lock.json* ./
RUN npm install

# Copy application code
COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
