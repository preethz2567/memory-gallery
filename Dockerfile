# ---- Stage 1: Build React frontend ----
# We use a full Node image here because we need Vite and all
# devDependencies to compile TypeScript and bundle the React app
FROM node:20-slim AS frontend-builder

WORKDIR /app/client

# Copy package files first — Docker caches this layer so npm install
# only reruns if package.json actually changes, not on every code change
COPY client/package*.json ./
RUN npm ci

# Copy the rest of the React source and build it
# Output goes to /app/client/dist
COPY client/ ./
RUN npm run build

# ---- Stage 2: Production Express server ----
# Start fresh with a minimal image — none of the build tools from Stage 1
# make it into this image, keeping it lean and secure
FROM node:20-slim AS production

WORKDIR /app

# Install only production dependencies (no jest, nodemon, eslint etc.)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the Express backend source
COPY src/ ./src/
COPY server.js ./

# Copy the compiled React app from Stage 1 into the location
# Express expects to find static files (client/dist)
COPY --from=frontend-builder /app/client/dist ./client/dist

# Document which port the app listens on
EXPOSE 4000

# NODE_ENV=production tells Express to serve the React static files
# and enables SSL for the DB connection
ENV NODE_ENV=production

# Run as non-root user — security best practice
# node:20-slim includes a built-in "node" user for exactly this purpose
USER node

CMD ["node", "server.js"]