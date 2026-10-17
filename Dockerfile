# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
# Use plain npm install — it's more forgiving when lock file is slightly out of sync
# Or better: regenerate lock file locally first (see below)
RUN npm install

# Copy source code
COPY . .

# Build arguments for Vite env vars
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

# Make them available for Vite build
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

# Build the app
RUN npm run build

# Production stage
FROM cgr.dev/chainguard/nginx:latest

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080