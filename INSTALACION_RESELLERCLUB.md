
# 🚀 Instalación ServyAuto Manager v8.9 en ResellerClub

## ⚠️ IMPORTANTE: Limitaciones de ResellerClub

**ResellerClub** es un hosting compartido tradicional que **NO SOPORTA APLICACIONES NODE.JS** de forma nativa.

ServyAuto Manager v8.9 es una aplicación **Next.js** que requiere:
- Node.js v18 o superior
- PostgreSQL
- Acceso SSH para ejecutar comandos
- PM2 o similar para mantener la aplicación corriendo

---

## 📊 Opciones Disponibles:

### ✅ **OPCIÓN 1: Hosting Node.js Recomendado**

Para desplegar ServyAuto Manager necesitas un hosting con soporte Node.js. Te recomiendo:

#### **Hostings compatibles en España:**

1. **Hostinger** (Recomendado) 💚
   - Plan VPS desde 4,99€/mes
   - Node.js preinstalado
   - SSH incluido
   - Panel cPanel
   - 🔗 https://www.hostinger.es

2. **Webempresa**
   - Hosting Cloud desde 9,95€/mes
   - Soporte Node.js
   - SSH incluido
   - 🔗 https://www.webempresa.com

3. **Raiola Networks**
   - VPS Gestionado desde 9,95€/mes
   - Node.js disponible
   - Soporte en español
   - 🔗 https://raiolanetworks.es

4. **Vercel** (Gratis para desarrollo) ⭐
   - Especializado en Next.js
   - Despliegue automático desde Git
   - SSL gratis
   - 🔗 https://vercel.com

5. **Netlify** (Alternativa gratuita)
   - Bueno para aplicaciones estáticas
   - Limitaciones en backend
   - 🔗 https://netlify.com

---

### 🔧 **OPCIÓN 2: Migrar de ResellerClub**

Si decides cambiar de hosting, estos son los pasos:

#### **Paso 1: Contratar nuevo hosting con Node.js**

Elige uno de los hostings recomendados arriba.

#### **Paso 2: Acceder por SSH**

```bash
ssh usuario@tu-servidor.com
```

#### **Paso 3: Subir la aplicación**

Opción A - Usando SCP desde tu PC:
```bash
scp servyauto_manager_v89_completo.zip usuario@tu-servidor.com:/home/usuario/
```

Opción B - Usando el File Manager del hosting y luego descomprimir por SSH:
```bash
cd /home/usuario
unzip servyauto_manager_v89_completo.zip
```

#### **Paso 4: Configurar la aplicación**

```bash
cd servyauto_manager_v89/app

# Crear archivo .env con tus datos
nano .env
```

Contenido del archivo `.env`:
```env
DATABASE_URL="postgresql://usuario:password@host:5432/nombre_db?schema=public"
NEXTAUTH_URL="https://tudominio.com"
NEXTAUTH_SECRET="genera-un-secret-aleatorio-aqui"
```

Para generar `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

#### **Paso 5: Instalar dependencias**

```bash
# Verificar versión de Node.js (debe ser 18+)
node --version

# Instalar yarn globalmente si no lo tienes
npm install -g yarn

# Instalar dependencias
yarn install

# Generar Prisma Client
yarn prisma generate

# Aplicar migraciones de base de datos
yarn prisma db push
```

#### **Paso 6: Compilar la aplicación**

```bash
yarn build
```

#### **Paso 7: Iniciar en producción**

```bash
# Iniciar con PM2 (recomendado)
npm install -g pm2
pm2 start npm --name "servyauto" -- start
pm2 save
pm2 startup
```

O si prefieres sin PM2:
```bash
yarn start
```

---

### 🌐 **OPCIÓN 3: Despliegue en Vercel (Más Fácil)**

**Vercel** es el hosting oficial de Next.js y es **GRATIS** para proyectos pequeños/medianos.

#### **Ventajas de Vercel:**
✅ Despliegue en 5 minutos  
✅ SSL automático  
✅ No necesitas configurar servidor  
✅ Actualizaciones automáticas desde Git  
✅ CDN global incluido  

#### **Pasos para desplegar en Vercel:**

**1. Crear cuenta en Vercel**
- Ve a https://vercel.com
- Regístrate con tu email o GitHub

**2. Preparar tu base de datos PostgreSQL**

Opciones:
- **Supabase** (Gratis): https://supabase.com
- **Neon** (Gratis): https://neon.tech
- **Railway** (Gratis limitado): https://railway.app

**3. Subir tu código a GitHub**

Desde tu PC (si tienes Git instalado):
```bash
cd servyauto_manager_v89
git init
git add .
git commit -m "ServyAuto Manager v8.9"
git remote add origin https://github.com/tu-usuario/servyauto.git
git push -u origin main
```

O crea un repositorio nuevo en GitHub y sube los archivos manualmente.

**4. Conectar con Vercel**
- En Vercel, haz clic en "Add New Project"
- Conecta tu repositorio de GitHub
- Selecciona el framework "Next.js"
- Agrega las variables de entorno:
  ```
  DATABASE_URL=tu_url_de_postgresql
  NEXTAUTH_URL=https://tu-dominio.vercel.app
  NEXTAUTH_SECRET=genera_uno_aleatorio
  ```
- Haz clic en "Deploy"

**5. ¡Listo!**
Tu aplicación estará disponible en: `https://tu-proyecto.vercel.app`

---

### ⚙️ **OPCIÓN 4: Usar ResellerClub solo para el dominio**

Si ya pagaste ResellerClub, puedes:

1. **Mantener tu dominio en ResellerClub**
2. **Desplegar la aplicación en Vercel/Hostinger**
3. **Configurar un redirect o DNS**

#### Configuración DNS en ResellerClub:

En el panel de ResellerClub:
1. Ve a **DNS Management** de tu dominio
2. Crea un registro `CNAME`:
   - **Tipo**: CNAME
   - **Host**: www (o @)
   - **Apunta a**: `cname.vercel-dns.com` (si usas Vercel)
3. Guarda los cambios

Luego en Vercel:
1. Ve a tu proyecto → Settings → Domains
2. Agrega tu dominio personalizado
3. Vercel te dará instrucciones específicas

---

## 🆘 ¿Qué hacer ahora?

### **Si quieres seguir con ResellerClub:**
- Contacta a soporte de ResellerClub y pregunta si tienen soporte para Node.js
- Es probable que te digan que NO (es hosting PHP)

### **Si quieres migrar (RECOMENDADO):**
1. Contrata Hostinger VPS (4,99€/mes)
2. Sigue las instrucciones de "OPCIÓN 2" arriba
3. Transfiere tu dominio o apunta los DNS

### **Si quieres la opción más rápida y gratis:**
1. Usa Vercel + Supabase (ambos gratis)
2. Sigue las instrucciones de "OPCIÓN 3" arriba
3. Configura tu dominio de ResellerClub para apuntar a Vercel

---

## 📞 ¿Necesitas ayuda?

Dime cuál opción prefieres y te ayudo con los pasos específicos:

- **A)** Quiero migrar a otro hosting con SSH
- **B)** Quiero usar Vercel (gratis)
- **C)** Quiero verificar si ResellerClub tiene soporte Node.js
- **D)** Otra opción

---

## 📚 Recursos Útiles:

- **Documentación Next.js Deployment**: https://nextjs.org/docs/deployment
- **Vercel Deploy Guide**: https://vercel.com/docs
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/usage/quick-start/
- **PostgreSQL en la nube**: https://supabase.com

---

**Última actualización**: 1 de Octubre 2025  
**Versión**: ServyAuto Manager v8.9
