# Stage 1: Build the application
# Using Node 20 Alpine for high density and small image size
FROM node:20-alpine AS build-stage

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy source code and build the production bundle
COPY . .
RUN npm run build

# Stage 2: Serve the production bundle with Nginx
# Using stable Alpine-based Nginx for efficiency
FROM nginx:stable-alpine AS production-stage

# Copy custom nginx configuration for SPA routing support
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from build-stage to Nginx web root
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
