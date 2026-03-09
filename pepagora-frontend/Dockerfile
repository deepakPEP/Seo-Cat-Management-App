FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN rm -f package-lock.json
RUN npm install

# Copy application source
COPY . .

# Build Next.js app
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Expose Next.js production port
EXPOSE 7000

# Start Next.js in production mode
CMD ["npm", "start"]

