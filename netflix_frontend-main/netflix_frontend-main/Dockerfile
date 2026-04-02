# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Dependencies
# Install all npm packages from package.json
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS deps

LABEL maintainer="DigitalWitch"
LABEL description="Netflix Frontend — movie-gold-v1 React app (deps stage)"

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json package-lock.json ./

# Install all dependencies (clean install from lock file)
RUN npm ci --silent

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build
# Compile the React app into static production files
# ─────────────────────────────────────────────────────────────────────────────
FROM node:18-alpine AS build

LABEL maintainer="DigitalWitch"
LABEL description="Netflix Frontend — movie-gold-v1 React app (build stage)"

WORKDIR /app

# Copy installed dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the full project source
COPY . .

# Accept backend URL as a build argument
# This injects REACT_APP_API_URL into the production bundle at build time
ARG REACT_APP_API_URL=http://localhost:8080/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the optimised production bundle → /app/build
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — Runtime
# Serve the static build with Nginx on port 3000
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

LABEL maintainer="DigitalWitch"
LABEL description="Netflix Frontend — movie-gold-v1 React app (runtime stage)"
LABEL version="0.1.0"

# Remove the default Nginx placeholder page
RUN rm -rf /usr/share/nginx/html/*

# Copy the React production build into Nginx's serve directory
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx config — listens on port 3000
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ✅ FIX: Expose 3000 to match nginx.conf (was incorrectly set to 80)
EXPOSE 3000

# Health check on the correct port
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
