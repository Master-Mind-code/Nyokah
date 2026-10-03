# syntax=docker/dockerfile:1
# Frontend Nyokah : build Vite puis service statique par nginx, qui relaie
# aussi /api vers le conteneur de l'API (meme domaine, pas de CORS).

# --- Etape de construction --------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts metadata.json ./
COPY src ./src
COPY assets ./assets
RUN npm run build

# --- Image d'execution ------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
