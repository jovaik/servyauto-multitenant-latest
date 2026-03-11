# ServyAuto Manager

Sistema de gestión integral para talleres de lavado de vehículos. Incluye gestión de citas, clientes, vehículos, facturación, gastos, y soporte multi-local.

## 🚀 Requisitos Previos

- **Node.js** >= 18.x
- **PostgreSQL** >= 14
- **Yarn** (recomendado) o npm

## 📦 Instalación

### 1. Clonar e instalar dependencias

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd servyauto-manager

# Instalar dependencias
yarn install
# o con npm:
npm ci
```

### 2. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores
nano .env
```

**Variables obligatorias:**
- `DATABASE_URL` - URL de conexión a PostgreSQL
- `NEXTAUTH_SECRET` - Secreto para autenticación (mínimo 32 caracteres)
- `NEXTAUTH_URL` - URL base de tu aplicación

### 3. Configurar la base de datos

```bash
# Generar cliente Prisma
yarn prisma generate

# Ejecutar migraciones
yarn prisma migrate deploy

# (Opcional) Sembrar datos iniciales
yarn prisma db seed
```

### 4. Compilar y ejecutar

```bash
# Modo desarrollo
yarn dev

# Compilar para producción
yarn build

# Ejecutar en producción
yarn start
```

## 🔧 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `yarn dev` | Inicia servidor de desarrollo en http://localhost:3000 |
| `yarn build` | Compila la aplicación para producción |
| `yarn start` | Inicia servidor de producción |
| `yarn lint` | Ejecuta el linter |
| `yarn test` | Ejecuta tests (TypeScript check) |
| `yarn build:ci` | Instalación limpia + build (para CI/CD) |
| `yarn prisma generate` | Regenera el cliente Prisma |
| `yarn prisma migrate deploy` | Aplica migraciones pendientes |
| `yarn prisma db seed` | Siembra datos iniciales |

## 📁 Estructura del Proyecto

```
├── app/                    # Rutas y páginas (Next.js App Router)
│   ├── api/               # API Routes
│   ├── dashboard/         # Páginas del panel de administración
│   ├── login/             # Página de inicio de sesión
│   └── reservas/          # Página pública de reservas
├── components/            # Componentes React reutilizables
├── lib/                   # Utilidades y configuraciones
│   ├── auth.ts           # Configuración de NextAuth
│   ├── db.ts             # Cliente Prisma
│   ├── local-context.ts  # Lógica multi-local
│   └── types.ts          # Tipos TypeScript
├── prisma/
│   └── schema.prisma     # Esquema de base de datos
├── public/               # Archivos estáticos
├── scripts/              # Scripts de utilidad
└── hooks/                # Custom React hooks
```

## 🏢 Sistema Multi-Local

El sistema soporta múltiples locales/sucursales con diferentes niveles de acceso:

- **SUPER_ADMIN**: Acceso total a todos los locales
- **GRUPO_ADMIN**: Acceso a locales asignados (encargado de zona)
- **ADMIN**: Acceso a su local asignado
- **OPERADOR**: Acceso limitado a su local

## 🔐 Primer Usuario Admin

Después de la instalación, crea el primer usuario admin:

```bash
# Acceder a la consola de Prisma
yarn prisma studio

# O crear mediante script
node scripts/create-admin.js
```

## 🐳 Docker (Opcional)

```bash
# Construir imagen
docker build -t servyauto-manager .

# Ejecutar contenedor
docker run -p 3000:3000 --env-file .env servyauto-manager
```

## 📝 Licencia

Propietario. Todos los derechos reservados.

## 🆘 Soporte

Para soporte técnico, contactar al equipo de desarrollo.
