
# Dockerfile para ServyAuto Manager v8.9
# Optimizado para Synology NAS

FROM node:18-alpine

# Información de la imagen
LABEL maintainer="ServyAuto"
LABEL version="8.9"
LABEL description="ServyAuto Manager - Sistema de gestión de taller"

# Instalar dependencias del sistema
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    curl

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY app/package.json app/yarn.lock ./

# Instalar dependencias de producción
RUN yarn install --frozen-lockfile --production=false

# Copiar código fuente
COPY app/ ./

# Generar Prisma Client
RUN yarn prisma generate

# Compilar aplicación Next.js
RUN yarn build

# Limpiar cache y dependencias de desarrollo
RUN yarn cache clean

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Cambiar propietario de archivos
RUN chown -R nextjs:nodejs /app

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["yarn", "start"]
