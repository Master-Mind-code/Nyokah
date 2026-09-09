# syntax=docker/dockerfile:1

# --- Etape de construction --------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Ne conserve que les dependances de production pour l'image finale.
RUN npm prune --omit=dev

# --- Image d'execution ------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# L'application ne tourne pas en root.
RUN addgroup -S nyokah && adduser -S nyokah -G nyokah

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

USER nyokah
EXPOSE 4000

# Applique les migrations en attente avant de servir le trafic.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
