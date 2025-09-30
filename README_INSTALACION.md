
# 📋 Guía de Instalación ServyAuto Manager v8.9

## Requisitos del Servidor
- Node.js 18 o superior
- npm o yarn
- Acceso SSH al hosting
- Puerto 3000 disponible

## 🚀 Instalación Paso a Paso

### 1. Subir archivos al hosting
Sube toda la carpeta del proyecto a tu directorio del hosting (ej: `/home/usuario/public_html/servyauto/`)

### 2. Conectar por SSH
```bash
ssh usuario@tu-servidor.com
cd /ruta/donde/subiste/el/proyecto
```

### 3. Dar permisos al script de instalación
```bash
chmod +x install.sh
```

### 4. Ejecutar instalación automática
```bash
./install.sh
```

### 5. Iniciar la aplicación
```bash
cd app
npm run start
```

## 🔧 Instalación Manual (alternativa)

Si prefieres hacer la instalación paso a paso:

```bash
# 1. Ir al directorio de la app
cd app

# 2. Instalar dependencias
npm install

# 3. Generar cliente Prisma
npx prisma generate

# 4. Aplicar migraciones de BD
npx prisma db push

# 5. Compilar aplicación
npm run build

# 6. Iniciar aplicación
npm run start
```

## 🌐 Configuración de Dominio

### Para usar con dominio sin puerto
Configura un proxy reverso en tu servidor web (Apache/Nginx):

**Nginx:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Apache (.htaccess):**
```apache
RewriteEngine On
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

## 🔄 Reiniciar la Aplicación

Para reiniciar después de cambios:
```bash
cd app
npm run build
npm run start
```

## 📝 Variables de Entorno

Las siguientes variables ya están configuradas en tu `.env`:
- DATABASE_URL (Base de datos PostgreSQL)
- NEXTAUTH_SECRET (Autenticación)
- AWS_* (Almacenamiento en nube)

## 🆘 Solución de Problemas

### Si npm install falla:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Si la aplicación no inicia:
```bash
# Verificar logs
npm run dev

# Verificar puerto
netstat -tulpn | grep :3000
```

### Si hay errores de Prisma:
```bash
npx prisma generate
npx prisma db push --force-reset
```

## 📞 Contacto
Para soporte técnico, contacta con tu proveedor de hosting o revisa los logs de la aplicación.
