# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build
RUN npx prisma generate

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production && \
    npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["npm", "start"]
