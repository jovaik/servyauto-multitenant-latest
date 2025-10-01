
# 🎨 Guía Visual para Instalar ServyAuto en Synology

## 📱 MÉTODO 1: Usando Container Manager (DSM Interface)

### Paso 1: Instalar Container Manager

1. Abre **DSM** (el panel web de tu Synology)
2. Ve a **Package Center** (icono de caja)
3. Busca **"Container Manager"**
4. Haz clic en **Instalar**
5. Espera a que termine (1-2 minutos)

---

### Paso 2: Instalar PostgreSQL

**Opción A - Desde Package Center** (Más fácil):

1. **Package Center** → Busca **"PostgreSQL 14"**
2. Clic en **Instalar**
3. Una vez instalado, abre la aplicación **PostgreSQL**
4. Haz clic en **"Configurar base de datos"**
5. Configurar:
   - **Usuario**: `servyauto`
   - **Contraseña**: `TuPasswordSeguro123` (anótala)
   - **Base de datos**: `servyauto_db`
6. Guardar

---

### Paso 3: Subir archivos de la aplicación

1. Abre **File Station**
2. Navega a **docker** (si no existe, créala)
3. Dentro de docker, crea carpeta **servyauto**
4. Sube el archivo **servyauto_manager_v89_completo.zip**
5. Clic derecho sobre el ZIP → **Extract** → **Extract here**
6. Espera a que termine

---

### Paso 4: Crear archivo .env

1. En **File Station**, navega a:
   ```
   /docker/servyauto/servyauto_manager_v89/app/
   ```

2. Busca el archivo `.env` o créalo:
   - Clic derecho en espacio vacío → **Create** → **Create text file**
   - Nombre: `.env`

3. Clic derecho en `.env` → **Edit**

4. Pega este contenido (ajustar valores):
   ```env
   DATABASE_URL="postgresql://servyauto:TuPasswordSeguro123@localhost:5432/servyauto_db?schema=public"
   NEXTAUTH_URL="http://tu-synology.local:3000"
   NEXTAUTH_SECRET="genera_uno_aleatorio_aqui"
   PORT=3000
   ```

5. **Guardar** y **Cerrar**

**Para generar `NEXTAUTH_SECRET`**:
- Necesitas SSH, o usa un generador online: https://generate-secret.vercel.app/32
- Copia el resultado y pégalo en `NEXTAUTH_SECRET`

---

### Paso 5: Usar Docker Compose en Container Manager

1. Abre **Container Manager** desde el menú de DSM

2. Ve a la pestaña **Project**

3. Haz clic en **Create**

4. Configurar proyecto:
   - **Project Name**: `servyauto`
   - **Path**: Selecciona `/docker/servyauto/servyauto_manager_v89`
   - **Source**: Selecciona **"Create docker-compose.yml"**

5. Pega el contenido del archivo `docker-compose.yml` que está en el proyecto

6. En la sección **Web portal settings**:
   - Habilitar web portal
   - Puerto: `3000`

7. Haz clic en **Done**

8. El proyecto se creará y comenzará a construir las imágenes (esto puede tomar 5-10 minutos)

---

### Paso 6: Inicializar base de datos

**Método A - Via Container Manager**:

1. En **Container Manager** → **Container**
2. Busca el contenedor **servyauto-app**
3. Selecciónalo → **Details** → **Terminal**
4. Crear nueva terminal → Ejecutar:
   ```bash
   yarn prisma db push
   ```
5. Espera a ver: `✅ Your database is now in sync with your schema`

**Método B - Via SSH** (si tienes acceso):

```bash
docker exec servyauto-app yarn prisma db push
```

---

### Paso 7: Verificar instalación

1. Abre tu navegador
2. Ve a una de estas URLs:
   - `http://tu-synology.local:3000`
   - `http://192.168.1.XXX:3000` (IP de tu Synology)
   - Desde DSM: **Container Manager** → **Container** → servyauto-app → **Details** → **Web Portal**

3. Deberías ver la **página de login** de ServyAuto Manager

**¡Si ves el login, FELICIDADES! 🎉**

---

## 🌐 MÉTODO 2: Configurar acceso desde Internet

### A. Configurar Reverse Proxy

1. **Control Panel** → **Login Portal** → Pestaña **Advanced**

2. Haz clic en **Reverse Proxy**

3. Haz clic en **Create**

4. Configurar:

   **General**:
   ```
   Reverse Proxy Name: ServyAuto
   ```

   **Source**:
   ```
   Protocol: HTTP (o HTTPS si ya tienes certificado)
   Hostname: servyauto.tudominio.com
   Port: 80 (o 443 para HTTPS)
   Enable HSTS: ✓ (solo si usas HTTPS)
   Enable HTTP/2: ✓
   ```

   **Destination**:
   ```
   Protocol: HTTP
   Hostname: localhost
   Port: 3000
   ```

5. Haz clic en **Save**

---

### B. Configurar certificado SSL (HTTPS)

1. **Control Panel** → **Security** → **Certificate**

2. Haz clic en **Add**

3. Selecciona **"Get a certificate from Let's Encrypt"**

4. Configurar:
   - **Domain name**: `servyauto.tudominio.com`
   - **Email**: tu-email@ejemplo.com
   - Marca **"Set as default certificate"**

5. Haz clic en **Apply**

6. Espera a que se genere (1-2 minutos)

---

### C. Configurar Port Forwarding en tu Router

**Pasos generales** (varía según router):

1. Accede a la configuración de tu router (normalmente `192.168.1.1`)

2. Busca sección **Port Forwarding** o **Virtual Server**

3. Crear nueva regla:
   ```
   Service Name: ServyAuto HTTPS
   External Port: 443
   Internal Port: 443
   Internal IP: [IP de tu Synology, ej: 192.168.1.100]
   Protocol: TCP
   Enable: ✓
   ```

4. Crear otra regla para HTTP (opcional):
   ```
   Service Name: ServyAuto HTTP
   External Port: 80
   Internal Port: 80
   Internal IP: [IP de tu Synology]
   Protocol: TCP
   Enable: ✓
   ```

5. Guardar cambios

---

### D. Configurar DynDNS (si no tienes IP fija)

1. **Control Panel** → **External Access** → **DDNS**

2. Haz clic en **Add**

3. Configurar:
   - **Service Provider**: Synology (gratis) o tu proveedor
   - **Hostname**: `tuservyauto.synology.me` (si usas Synology)
   - O configurar con tu dominio personalizado

4. **Test Connection** para verificar

5. **OK** para guardar

---

### E. Actualizar NEXTAUTH_URL

1. **File Station** → Editar `.env`:
   ```
   /docker/servyauto/servyauto_manager_v89/app/.env
   ```

2. Cambiar:
   ```env
   NEXTAUTH_URL="https://servyauto.tudominio.com"
   ```

3. Guardar

4. Reiniciar aplicación:
   - **Container Manager** → **Container**
   - Selecciona **servyauto-app**
   - Haz clic en **Stop** → esperar → **Start**

---

## 🔍 MONITOREO Y LOGS

### Ver logs de la aplicación:

**Via Container Manager**:
1. **Container Manager** → **Container**
2. Selecciona **servyauto-app**
3. Haz clic en **Details**
4. Pestaña **Log**
5. Activa **Auto-refresh** para ver en tiempo real

**Via SSH**:
```bash
docker logs -f servyauto-app
```

---

### Ver estado de recursos:

**Via Container Manager**:
1. **Container Manager** → **Container**
2. Selecciona **servyauto-app**
3. Haz clic en **Details**
4. Pestaña **Performance**
5. Verás gráficos de CPU, RAM, Red

---

## 📊 BACKUP Y RESTAURACIÓN

### Crear backup manual:

**Via File Station**:
1. Navega a `/docker/servyauto/`
2. Clic derecho en `servyauto_manager_v89` → **Compress**
3. Nombre: `servyauto_backup_2025_10_01.zip`
4. Descarga el ZIP a tu PC

**Via Container Manager** (solo base de datos):
1. **Container Manager** → **Container**
2. Selecciona **postgres-servyauto**
3. **Details** → **Terminal** → Crear
4. Ejecutar:
   ```bash
   pg_dump -U servyauto servyauto_db > /tmp/backup.sql
   ```
5. Copia el archivo desde `/tmp/backup.sql`

---

### Configurar backup automático:

1. **Control Panel** → **Task Scheduler**

2. **Create** → **Scheduled Task** → **User-defined script**

3. **General**:
   - Task: `Backup ServyAuto DB`
   - User: `root`
   - Enabled: ✓

4. **Schedule**:
   - Selecciona **Daily**
   - Time: `02:00` (2 AM)

5. **Task Settings** → **Run command**:
   ```bash
   docker exec postgres-servyauto pg_dump -U servyauto servyauto_db | gzip > /volume1/docker/servyauto/backups/db_$(date +\%Y\%m\%d).sql.gz
   ```

6. **OK** para guardar

---

## ❌ SOLUCIÓN RÁPIDA DE PROBLEMAS

### ⚠️ No puedo acceder a `http://synology:3000`

**Verificar**:
1. Container Manager → Container → Ver si **servyauto-app** está en estado **Running**
2. Si está **Stopped**, haz clic en **Start**
3. Verifica logs para ver errores

---

### ⚠️ Error: "Cannot connect to database"

**Solución**:
1. Verifica que **postgres-servyauto** esté corriendo
2. Container Manager → Container → postgres-servyauto
3. Si está detenido, iniciarlo
4. Verificar credenciales en `.env`

---

### ⚠️ Error: "Module not found"

**Solución**:
1. Container Manager → Container → servyauto-app
2. Details → Terminal → Crear
3. Ejecutar:
   ```bash
   yarn install
   yarn prisma generate
   ```
4. Reiniciar contenedor

---

### ⚠️ La aplicación se detiene sola

**Solución**:
1. Ver logs para identificar error
2. Verificar que hay suficiente RAM disponible
3. **Container Manager** → **Settings** → Aumentar límite de memoria si es necesario
4. Verificar que PostgreSQL está corriendo

---

## 📞 RECURSOS ÚTILES

### URLs importantes:

- **DSM**: `http://tu-synology.local:5000`
- **Container Manager**: DSM → Container Manager
- **ServyAuto Manager**: `http://tu-synology.local:3000`

### Documentación:

- **Synology DSM**: https://www.synology.com/en-global/support/documentation
- **Container Manager**: Menú DSM → Help
- **Docker Compose**: https://docs.docker.com/compose/

---

## ✅ CHECKLIST FINAL

Marca cada paso cuando lo completes:

- [ ] Container Manager instalado
- [ ] PostgreSQL instalado y configurado
- [ ] Archivos subidos y extraídos
- [ ] Archivo `.env` creado y configurado
- [ ] Proyecto Docker Compose creado
- [ ] Contenedores corriendo (app y postgres)
- [ ] Base de datos inicializada
- [ ] Aplicación accesible localmente
- [ ] (Opcional) Reverse proxy configurado
- [ ] (Opcional) SSL configurado
- [ ] (Opcional) DynDNS configurado
- [ ] (Opcional) Backup automático configurado

---

**¡Todo listo!** 🎉

Tu ServyAuto Manager está corriendo en tu Synology.

**¿Necesitas ayuda?** Dime en qué paso estás y te asisto.

---

**Última actualización**: 1 de Octubre 2025  
**Versión**: ServyAuto Manager v8.9  
**Compatible con**: Synology DSM 7.0+
