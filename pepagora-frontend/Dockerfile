# # Stage 1: Build the Next.js app
# FROM node:18-alpine AS builder

# # Set working directory
# WORKDIR /app

# # Install dependencies
# COPY package*.json ./
# RUN npm install

# # Copy all frontend files
# COPY . .

# # Build Next.js app
# # RUN npm run build

# # Stage 2: Run the production build
# FROM node:18-alpine

# WORKDIR /app

# # Copy only the necessary files from builder
# COPY --from=builder /app/package*.json ./
# COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/node_modules ./node_modules

# # Expose port 3000
# EXPOSE 3000

# # Start Next.js in production mode
# CMD ["npm", "run", "dev"]
# # # 

# # # Stage 1: Build the Next.js app
# # FROM node:18-alpine AS builder

# # WORKDIR /app

# # COPY package*.json ./
# # RUN npm install

# # COPY . .
# # RUN npm run build

# # # Stage 2: Run the production build
# # FROM node:18-alpine

# # WORKDIR /app

# # COPY --from=builder /app/package*.json ./
# # COPY --from=builder /app/node_modules ./node_modules
# # COPY --from=builder /app/.next ./.next
# # COPY --from=builder /app/public ./public
# # # COPY --from=builder /app/next.config.js ./next.config.js

# # EXPOSE 3000

# # CMD ["npm", "start"]


# ==========================================
# Stage 1: Base build with dependencies
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy full project (to include source code, tsconfig, next.config.ts, etc.)
COPY . .

# Expose dev port
EXPOSE 3000

# Start Next.js in development mode
CMD ["npm", "run", "dev"]
