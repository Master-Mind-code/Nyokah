# syntax=docker/dockerfile:1

# --- Etape de construction --------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Prisma a besoin d'OpenSSL pour choisir le bon moteur sous Alpine.
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Ne conserve que les dependances de production pour l'image finale
# (le CLI prisma en fait partie : il applique les migrations au demarrage).
RUN npm prune --omit=dev

# --- Image d'execution ------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

# L'application ne tourne pas en root.
RUN addgroup -S nyokah && adduser -S nyokah -G nyokah

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

USER nyokah
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health > /dev/null || exit 1

# Applique les migrations en attente avant de servir le trafic.
# Le seed compile est disponible via : node dist/prisma/seed.js
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
