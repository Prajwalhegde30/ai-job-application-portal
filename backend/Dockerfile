# ==========================================
# STAGE 1: Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build it
COPY . .
RUN npm run build

# ==========================================
# STAGE 2: Runner Stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets
COPY --from=builder /app/dist ./dist

# Copy DB migration scripts and static SQL schemas for database setup
COPY --from=builder /app/src/db/migrations ./dist/src/db/migrations
COPY --from=builder /app/src/db/schema.sql ./dist/src/db/schema.sql
COPY --from=builder /app/src/db/seed.sql ./dist/src/db/seed.sql
COPY --from=builder /app/src/db/indexes.sql ./dist/src/db/indexes.sql

# Expose port
EXPOSE 8080

# Command to run server
CMD ["node", "dist/server.js"]
