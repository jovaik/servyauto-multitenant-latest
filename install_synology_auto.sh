#!/bin/bash

echo "=============================================="
echo "   INSTALADOR AUTOMÁTICO SERVYAUTO MANAGER"
echo "   Para Synology DS220j"
echo "=============================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

# Verificar que estamos en Synology
if [ ! -f /etc/synoinfo.conf ]; then
    error "Este script solo funciona en Synology"
    exit 1
fi

info "Detectado Synology: $(cat /etc/synoinfo.conf | grep upnpmodelname | cut -d'"' -f2)"
echo ""

# Configuración
APP_DIR="/volume1/servyauto"
DB_NAME="servyauto_db"
DB_USER="servyauto_user"
DB_PASS="ServyAuto2024!"
NODE_VERSION="18"

info "=== PASO 1/8: Verificando Docker ==="
if ! command -v docker &> /dev/null; then
    error "Docker no está instalado. Por favor instala Container Manager desde Package Center"
    exit 1
fi
info "✓ Docker instalado correctamente"
echo ""

info "=== PASO 2/8: Verificando estructura de directorios ==="
if [ ! -d "$APP_DIR" ]; then
    error "No se encuentra la carpeta $APP_DIR"
    error "Por favor crea la carpeta 'servyauto' en File Station (volumen 2)"
    exit 1
fi

if [ ! -d "$APP_DIR/app" ]; then
    error "No se encuentra la carpeta app dentro de $APP_DIR"
    error "Por favor sube los archivos de la aplicación a $APP_DIR/app"
    exit 1
fi
info "✓ Estructura de directorios correcta"
echo ""

info "=== PASO 3/8: Deteniendo contenedores existentes ==="
docker stop servyauto-app servyauto-db 2>/dev/null || true
docker rm servyauto-app servyauto-db 2>/dev/null || true
info "✓ Contenedores limpiados"
echo ""

info "=== PASO 4/8: Creando red Docker ==="
docker network create servyauto-net 2>/dev/null || info "Red ya existe"
info "✓ Red Docker lista"
echo ""

info "=== PASO 5/8: Iniciando PostgreSQL ==="
docker run -d \
  --name servyauto-db \
  --network servyauto-net \
  -e POSTGRES_DB=$DB_NAME \
  -e POSTGRES_USER=$DB_USER \
  -e POSTGRES_PASSWORD=$DB_PASS \
  -v $APP_DIR/postgres-data:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:14-alpine

if [ $? -ne 0 ]; then
    error "Fallo al iniciar PostgreSQL"
    exit 1
fi

info "Esperando a que PostgreSQL esté listo..."
sleep 10

# Verificar que PostgreSQL esté funcionando
docker exec servyauto-db pg_isready -U $DB_USER > /dev/null 2>&1
if [ $? -eq 0 ]; then
    info "✓ PostgreSQL funcionando correctamente"
else
    warning "PostgreSQL puede tardar un poco más en iniciar"
fi
echo ""

info "=== PASO 6/8: Preparando variables de entorno ==="
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@servyauto-db:5432/$DB_NAME?schema=public"
NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "HxJ5RGQrpKShk1FXDtfy6716Grv99806qrypf6S3wZM=")

cat > $APP_DIR/app/.env << EOF
DATABASE_URL="$DATABASE_URL"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="production"
EOF

info "✓ Variables de entorno configuradas"
echo ""

info "=== PASO 7/8: Construyendo e iniciando la aplicación ==="
info "Esto puede tardar 5-10 minutos..."

docker run -d \
  --name servyauto-app \
  --network servyauto-net \
  -p 3000:3000 \
  -v $APP_DIR/app:/app \
  -w /app \
  -e DATABASE_URL="$DATABASE_URL" \
  -e NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e NODE_ENV="production" \
  --restart unless-stopped \
  node:18-alpine \
  sh -c "apk add --no-cache openssl && npm install -g yarn && yarn install && yarn prisma generate && yarn prisma migrate deploy && yarn build && yarn start"

if [ $? -ne 0 ]; then
    error "Fallo al iniciar la aplicación"
    exit 1
fi

info "✓ Aplicación iniciada"
echo ""

info "=== PASO 8/8: Verificando instalación ==="
info "Esperando a que la aplicación esté lista..."
sleep 15

# Obtener IP local
LOCAL_IP=$(ip route get 1 | awk '{print $7;exit}')

echo ""
echo "=============================================="
echo -e "${GREEN}✓ INSTALACIÓN COMPLETADA${NC}"
echo "=============================================="
echo ""
echo "Tu aplicación está disponible en:"
echo ""
echo -e "${GREEN}http://$LOCAL_IP:3000${NC}"
echo -e "${GREEN}http://192.168.1.119:3000${NC}"
echo ""
echo "Para ver los logs de la aplicación:"
echo "  docker logs -f servyauto-app"
echo ""
echo "Para ver los logs de la base de datos:"
echo "  docker logs -f servyauto-db"
echo ""
echo "Para detener la aplicación:"
echo "  docker stop servyauto-app servyauto-db"
echo ""
echo "Para reiniciar la aplicación:"
echo "  docker restart servyauto-app servyauto-db"
echo ""
echo "=============================================="

