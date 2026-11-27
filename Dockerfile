# Build multiestágio: dev (compose local), build (comum) e produção (Railway/VPS).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

# O compose local monta o código e roda API e Vite em modo de desenvolvimento.
FROM deps AS development
WORKDIR /app
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/domain/package.json ./packages/domain/
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
# Migrações versionadas rodam antes do servidor (entrypoint do CMD abaixo).
COPY apps/api/src/db/migrations ./apps/api/dist/db/migrations
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["sh", "-c", "node apps/api/dist/db/migrate-cli.js && node apps/api/dist/server.js"]
