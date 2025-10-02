
# 🚀 Desplegar ServyAuto Manager en Railway

## ✅ PASO 1: Registrarse en Railway (GRATIS)

1. Ve a: https://railway.app/
2. Haz clic en **"Start a New Project"** o **"Login"**
3. Regístrate con tu cuenta de GitHub o Google

---

## ✅ PASO 2: Desplegar la aplicación (1 CLIC)

### Opción A: Deploy desde GitHub (Recomendado)

1. **Sube este proyecto a tu GitHub:**
   - Ve a https://github.com/new
   - Nombre del repositorio: `servyauto-manager`
   - Haz público o privado
   - NO inicialices con README
   - Crea el repositorio

2. **Sube los archivos:**
   ```bash
   cd /ruta/a/servyauto_manager_v89/app
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/servyauto-manager.git
   git push -u origin main
   ```

3. **En Railway:**
   - Clic en **"New Project"**
   - Selecciona **"Deploy from GitHub repo"**
   - Autoriza Railway a acceder a GitHub
   - Selecciona el repositorio `servyauto-manager`
   - Railway detectará automáticamente que es Next.js

4. **Agrega PostgreSQL:**
   - En tu proyecto de Railway, clic en **"New"**
   - Selecciona **"Database"** → **"Add PostgreSQL"**
   - Railway creará automáticamente la base de datos

5. **Conecta la base de datos:**
   - Railway automáticamente creará la variable `DATABASE_URL`
   - Ve a **Variables** y agrega:
     ```
     NEXTAUTH_SECRET=HxJ5RGQrpKShk1FXDtfy6716Grv99806qrypf6S3wZM=
     NEXTAUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}
     ```

6. **¡LISTO!**
   - Railway desplegará automáticamente
   - Cuando termine, clic en **"View Logs"** para ver el progreso
   - Copia el dominio público (ej: `servyauto-production.up.railway.app`)
   - ¡Tu aplicación está funcionando!

---

### Opción B: Deploy directo (Sin GitHub)

Si no quieres usar GitHub:

1. Instala Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Inicializa el proyecto:
   ```bash
   cd /ruta/a/servyauto_manager_v89/app
   railway init
   ```

4. Agrega PostgreSQL:
   ```bash
   railway add --database postgres
   ```

5. Deploy:
   ```bash
   railway up
   ```

6. Agrega variables de entorno:
   ```bash
   railway variables set NEXTAUTH_SECRET=HxJ5RGQrpKShk1FXDtfy6716Grv99806qrypf6S3wZM=
   ```

---

## 🎯 DESPUÉS DEL DEPLOY

1. **Actualiza NEXTAUTH_URL:**
   - Ve a tu proyecto en Railway
   - Copia el dominio público
   - Ve a **Variables**
   - Actualiza `NEXTAUTH_URL` con tu dominio real

2. **Accede a tu aplicación:**
   - Abre el dominio público en tu navegador
   - ¡Listo!

---

## 💰 PRECIOS DE RAILWAY

- **Plan Developer (GRATIS):**
  - $5 USD de crédito gratis al mes
  - Suficiente para pruebas y desarrollo
  
- **Plan Team ($20/mes):**
  - Si necesitas más recursos

---

## 🆘 SI ALGO FALLA

1. **Revisa los logs:**
   - En Railway → Tu proyecto → **Deployments** → Clic en el deployment → **View Logs**

2. **Verifica las variables de entorno:**
   - Deben estar: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

3. **Problemas con Prisma:**
   - Railway ejecuta automáticamente las migraciones
   - Si falla, verifica los logs de build

---

## 📞 SOPORTE

- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app/
