
# 🚀 Instalación ServyAuto Manager v8.9 en Synology NAS

## ✅ VENTAJAS DE USAR SYNOLOGY

✓ **Control Total**: Tu propio servidor, sin limitaciones  
✓ **Node.js Disponible**: Soporte nativo para aplicaciones Node.js  
✓ **Docker**: Opción de contenedores para fácil gestión  
✓ **PostgreSQL**: Base de datos incluida en Package Center  
✓ **Reverse Proxy**: Configuración web integrada  
✓ **SSL/HTTPS**: Certificados Let's Encrypt automáticos  
✓ **Sin Costos Mensuales**: Una vez configurado, funciona 24/7  

---

## 📋 REQUISITOS PREVIOS

### Hardware mínimo recomendado:
- **CPU**: 2 cores o más
- **RAM**: 4GB mínimo, 8GB recomendado
- **DSM**: Versión 7.0 o superior
- **Espacio**: 5GB disponibles

### Acceso necesario:
- Acceso administrativo al DSM
- Conocimiento básico de SSH (opcional pero recomendado)

---

## 🎯 MÉTODO 1: INSTALACIÓN CON DOCKER (RECOMENDADO)

### ✅ Ventajas del método Docker:
- Más fácil de gestionar
- Aislamiento de la aplicación
- Fácil actualización y rollback
- No interfiere con otros servicios

### 📦 Paso 1: Instalar Docker

1. Abre **DSM** → **Package Center**
2. Busca **"Container Manager"** (antes Docker)
3. Haz clic en **Instalar**
4. Espera a que termine la instalación

### 🗄️ Paso 2: Instalar PostgreSQL

Opción A - **PostgreSQL nativo de Synology**:

1. **Package Center** → Busca **"PostgreSQL 14"**
2. Instalar PostgreSQL 14
3. Una vez instalado, abre **PostgreSQL**
4. Crear usuario y base de datos:
   - Usuario: `servyauto`
   - Contraseña: `tu_password_seguro`
   - Base de datos: `servyauto_db`

Opción B - **PostgreSQL en Docker** (más flexible):

```bash
# Conectar por SSH a tu Synology
ssh admin@tu-synology.local

# Crear carpeta para datos de PostgreSQL
mkdir -p /volume1/docker/postgres

# Ejecutar PostgreSQL en Docker
docker run -d \
  --name postgres-servyauto \
  --restart always \
  -e POSTGRES_USER=servyauto \
  -e POSTGRES_PASSWORD=tu_password_seguro \
  -e POSTGRES_DB=servyauto_db \
  -v /volume1/docker/postgres:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:14-alpine
```

### 📂 Paso 3: Preparar archivos de la aplicación

**Opción A - Via File Station (Más fácil)**:

1. Abre **File Station** en DSM
2. Navega a `/volume1/docker/`
3. Crea carpeta `servyauto`
4. Sube el archivo `servyauto_manager_v89_completo.zip`
5. Extrae el ZIP (clic derecho → Extract)

**Opción B - Via SSH**:

```bash
# Conectar por SSH
ssh admin@tu-synology.local

# Crear directorio
mkdir -p /volume1/docker/servyauto

# Subir el ZIP desde tu PC con SCP:
# (ejecutar desde tu PC, no en Synology)
scp servyauto_manager_v89_completo.zip admin@tu-synology:/volume1/docker/servyauto/

# Volver a SSH de Synology
cd /volume1/docker/servyauto
unzip servyauto_manager_v89_completo.zip
```

### ⚙️ Paso 4: Configurar variables de entorno

```bash
# Conectar por SSH
ssh admin@tu-synology.local

# Ir al directorio de la app
cd /volume1/docker/servyauto/servyauto_manager_v89/app

# Crear archivo .env
nano .env
```

**Contenido del archivo `.env`**:

```env
# Base de datos
DATABASE_URL="postgresql://servyauto:tu_password_seguro@localhost:5432/servyauto_db?schema=public"

# Si PostgreSQL está en Docker, usa:
# DATABASE_URL="postgresql://servyauto:tu_password_seguro@postgres-servyauto:5432/servyauto_db?schema=public"

# NextAuth
NEXTAUTH_URL="http://tu-synology.local:3000"
# O si tienes dominio/DynDNS:
# NEXTAUTH_URL="https://servyauto.tu-dominio.com"

# Generar con: openssl rand -base64 32
NEXTAUTH_SECRET="genera_un_secret_aleatorio_aqui"

# Puerto (opcional, por defecto 3000)
PORT=3000
```

**Para generar `NEXTAUTH_SECRET`**:
```bash
openssl rand -base64 32
```

Guarda el archivo:
- Presiona `Ctrl + X`
- Presiona `Y`
- Presiona `Enter`

### 🐳 Paso 5: Crear Dockerfile

```bash
cd /volume1/docker/servyauto/servyauto_manager_v89

# Crear Dockerfile
nano Dockerfile
```

**Contenido del Dockerfile**:

```dockerfile
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat openssl

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de package
COPY app/package.json app/yarn.lock ./

# Instalar dependencias
RUN yarn install --frozen-lockfile

# Copiar resto de archivos
COPY app/ ./

# Generar Prisma Client
RUN yarn prisma generate

# Compilar aplicación
RUN yarn build

# Exponer puerto
EXPOSE 3000

# Variable de entorno para producción
ENV NODE_ENV=production

# Comando de inicio
CMD ["yarn", "start"]
```

Guardar (`Ctrl + X`, `Y`, `Enter`)

### 🔨 Paso 6: Construir imagen Docker

```bash
cd /volume1/docker/servyauto/servyauto_manager_v89

# Construir imagen
docker build -t servyauto:latest .

# Esto tomará 5-10 minutos
# Verás el progreso de la construcción
```

### 🚀 Paso 7: Ejecutar contenedor

```bash
# Ejecutar aplicación
docker run -d \
  --name servyauto-app \
  --restart always \
  --network bridge \
  -p 3000:3000 \
  -v /volume1/docker/servyauto/servyauto_manager_v89/app/.env:/app/.env \
  --link postgres-servyauto:postgres \
  servyauto:latest

# Verificar que está corriendo
docker ps

# Ver logs
docker logs -f servyauto-app
```

### 🗄️ Paso 8: Inicializar base de datos

```bash
# Ejecutar migraciones dentro del contenedor
docker exec servyauto-app yarn prisma db push

# Deberías ver:
# ✅ Your database is now in sync with your schema
```

### ✅ Paso 9: Verificar instalación

1. Abre tu navegador
2. Ve a: `http://tu-synology.local:3000`
3. Deberías ver la página de login de ServyAuto Manager

**Si ves la página de login, ¡FELICIDADES! 🎉**

---

## 🌐 MÉTODO 2: INSTALACIÓN DIRECTA (Sin Docker)

Si prefieres NO usar Docker:

### 📦 Paso 1: Instalar Node.js

1. **Package Center** → Busca **"Node.js v18"**
2. Instalar Node.js
3. Verificar instalación desde SSH:

```bash
node --version  # Debe mostrar v18.x.x
```

### 🗄️ Paso 2: Instalar PostgreSQL

(Igual que en el Método 1 - Opción A)

### 📂 Paso 3: Subir archivos

```bash
# Por SSH
ssh admin@tu-synology.local

# Crear directorio
mkdir -p /volume1/web/servyauto

# Subir ZIP y extraer
cd /volume1/web/servyauto
# (sube el ZIP con FileStation o SCP)
unzip servyauto_manager_v89_completo.zip
```

### ⚙️ Paso 4: Configurar .env

```bash
cd /volume1/web/servyauto/servyauto_manager_v89/app

nano .env
```

(Mismo contenido que en Método 1 - Paso 4)

### 📦 Paso 5: Instalar dependencias

```bash
cd /volume1/web/servyauto/servyauto_manager_v89/app

# Instalar yarn globalmente
sudo npm install -g yarn

# Instalar dependencias del proyecto
yarn install

# Generar Prisma Client
yarn prisma generate

# Inicializar base de datos
yarn prisma db push

# Compilar aplicación
yarn build
```

### 🚀 Paso 6: Crear servicio de inicio automático

```bash
# Crear script de inicio
nano /volume1/web/servyauto/start.sh
```

**Contenido**:
```bash
#!/bin/bash
cd /volume1/web/servyauto/servyauto_manager_v89/app
export PATH=/usr/local/bin:$PATH
yarn start
```

Dar permisos:
```bash
chmod +x /volume1/web/servyauto/start.sh
```

### ⚙️ Paso 7: Configurar tarea programada en DSM

1. Abre **Control Panel** → **Task Scheduler**
2. **Create** → **Triggered Task** → **User-defined script**
3. Configurar:
   - **General**:
     - Task: `ServyAuto Manager`
     - User: `root`
     - Enabled: ✓
   - **Task Settings**:
     - Run command: `/volume1/web/servyauto/start.sh`
   - **Schedule**: Boot-up
4. Guardar

### 🚀 Paso 8: Iniciar la tarea

1. Selecciona la tarea creada
2. Clic en **Run**
3. Espera 30 segundos
4. Abre `http://tu-synology.local:3000`

---

## 🌐 CONFIGURAR ACCESO DESDE INTERNET

### Paso 1: Configurar Reverse Proxy en Synology

1. **Control Panel** → **Login Portal** → **Advanced** → **Reverse Proxy**
2. Haz clic en **Create**
3. Configurar:

**General**:
```
Reverse Proxy Name: ServyAuto
```

**Source**:
```
Protocol: HTTPS
Hostname: servyauto.tudominio.com
Port: 443
Enable HSTS: ✓
```

**Destination**:
```
Protocol: HTTP
Hostname: localhost
Port: 3000
```

4. Haz clic en **Save**

### Paso 2: Configurar certificado SSL

1. **Control Panel** → **Security** → **Certificate**
2. **Add** → **Add a new certificate**
3. Selecciona **"Get a certificate from Let's Encrypt"**
4. Configurar:
   - Domain name: `servyauto.tudominio.com`
   - Email: tu email
5. **Apply**

### Paso 3: Configurar router

En tu router, configura **Port Forwarding**:

```
Servicio: HTTPS ServyAuto
Puerto externo: 443
Puerto interno: 443
IP destino: IP de tu Synology (ej: 192.168.1.100)
Protocolo: TCP
```

### Paso 4: Configurar DynDNS (si no tienes IP fija)

Synology tiene servicios DynDNS gratuitos:

1. **Control Panel** → **External Access** → **DDNS**
2. **Add** → Selecciona proveedor (ej: Synology)
3. Configurar:
   - Hostname: `tuservyauto.synology.me`
   - (O usa tu propio dominio)

### Paso 5: Actualizar NEXTAUTH_URL

```bash
# Editar .env
nano /volume1/web/servyauto/servyauto_manager_v89/app/.env

# Cambiar:
NEXTAUTH_URL="https://servyauto.tudominio.com"
```

Reiniciar aplicación:
```bash
# Si usas Docker:
docker restart servyauto-app

# Si usas método directo:
# Desde Task Scheduler, detener y reiniciar la tarea
```

---

## 🔄 COMANDOS ÚTILES

### Docker:

```bash
# Ver logs en tiempo real
docker logs -f servyauto-app

# Reiniciar aplicación
docker restart servyauto-app

# Detener aplicación
docker stop servyauto-app

# Iniciar aplicación
docker start servyauto-app

# Acceder al shell del contenedor
docker exec -it servyauto-app sh

# Ver estado de contenedores
docker ps -a

# Eliminar contenedor (no elimina datos)
docker rm -f servyauto-app

# Reconstruir imagen después de cambios
cd /volume1/docker/servyauto/servyauto_manager_v89
docker build -t servyauto:latest .
docker rm -f servyauto-app
# Luego ejecutar docker run de nuevo
```

### PostgreSQL:

```bash
# Acceder a PostgreSQL
docker exec -it postgres-servyauto psql -U servyauto -d servyauto_db

# Backup de base de datos
docker exec postgres-servyauto pg_dump -U servyauto servyauto_db > backup.sql

# Restaurar base de datos
cat backup.sql | docker exec -i postgres-servyauto psql -U servyauto -d servyauto_db
```

---

## ❌ SOLUCIÓN DE PROBLEMAS

### Problema: No puedo conectarme a `http://synology.local:3000`

**Solución**:
```bash
# Verificar que el contenedor está corriendo
docker ps

# Si no aparece, ver logs:
docker logs servyauto-app

# Ver puertos abiertos
netstat -tuln | grep 3000
```

### Problema: Error de conexión a base de datos

**Solución**:
```bash
# Verificar PostgreSQL
docker ps | grep postgres

# Ver logs de PostgreSQL
docker logs postgres-servyauto

# Probar conexión manual
docker exec -it postgres-servyauto psql -U servyauto -d servyauto_db -c "SELECT 1;"
```

### Problema: "Cannot find module @prisma/client"

**Solución**:
```bash
# Regenerar Prisma Client
docker exec servyauto-app yarn prisma generate

# Reiniciar
docker restart servyauto-app
```

### Problema: La aplicación se detiene sola

**Solución**:
- Verificar logs: `docker logs servyauto-app`
- Asegurarse de que PostgreSQL está corriendo
- Verificar archivo `.env`
- Aumentar RAM asignada a Docker en **Package Center** → **Container Manager** → **Settings**

---

## 📊 MONITOREO Y MANTENIMIENTO

### Ver recursos usados:

```bash
# CPU y RAM del contenedor
docker stats servyauto-app

# Espacio en disco
df -h
```

### Actualizar la aplicación:

```bash
# Método 1: Reconstruir imagen
cd /volume1/docker/servyauto/servyauto_manager_v89
docker build -t servyauto:latest .
docker restart servyauto-app

# Método 2: Actualizar código sin rebuild
docker exec servyauto-app yarn install
docker exec servyauto-app yarn prisma generate
docker exec servyauto-app yarn build
docker restart servyauto-app
```

### Backup automático:

Crear script en `/volume1/docker/servyauto/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/volume1/docker/servyauto/backups"
mkdir -p $BACKUP_DIR

# Backup de base de datos
docker exec postgres-servyauto pg_dump -U servyauto servyauto_db > $BACKUP_DIR/db_$DATE.sql

# Comprimir backups antiguos (más de 7 días)
find $BACKUP_DIR -name "*.sql" -mtime +7 -exec gzip {} \;

# Eliminar backups muy antiguos (más de 30 días)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

Configurar en **Task Scheduler** para ejecutar diariamente.

---

## 🎉 ¡LISTO!

Tu ServyAuto Manager v8.9 está corriendo en tu Synology NAS.

**URLs de acceso**:
- Local: `http://tu-synology.local:3000`
- Con reverse proxy: `https://servyauto.tudominio.com`

**Próximos pasos**:
1. Configurar usuarios y permisos
2. Configurar backups automáticos
3. Monitorear logs regularmente
4. Mantener DSM y Container Manager actualizados

---

**¿Necesitas ayuda?** Dime en qué paso estás y te ayudo.

---

**Última actualización**: 1 de Octubre 2025  
**Versión**: ServyAuto Manager v8.9  
**Compatible con**: Synology DSM 7.0+
