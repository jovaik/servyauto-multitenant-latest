# 📂 ServyAuto Manager — Estructura del Proyecto
> Generado: 11 de abril de 2026

## 🏗️ Visión General
App de gestión para cadena de lavaderos ServyAuto (Next.js 14 + Prisma + PostgreSQL).
Desplegada en: `app.servyauto.com`

---

## 📁 Estructura de Directorios

```
app/
├── app/                          # App Router (Next.js 14)
│   ├── layout.tsx                # Layout raíz (SessionProvider, ThemeProvider)
│   ├── page.tsx                  # Página raíz (redirige a /login o /dashboard)
│   ├── globals.css               # Estilos globales Tailwind
│   ├── login/                    # Página de login
│   ├── signup/                   # Página de registro
│   ├── reservas/                 # Página pública de reservas online
│   │   ├── page.tsx
│   │   └── reservas-public-page.tsx
│   │
│   ├── dashboard/                # 🔒 Panel principal (requiere auth)
│   │   ├── page.tsx              # Dashboard principal (stats/gráficos)
│   │   ├── dashboard-layout-client.tsx  # Layout con sidebar + navegación por rol
│   │   ├── agenda/               # Gestión de citas
│   │   │   ├── agenda-view.tsx          # Vista agenda diaria
│   │   │   ├── nueva-cita-dialog.tsx    # Crear cita (descuentos, servicios)
│   │   │   └── editar-cita-dialog.tsx   # Editar cita (métodos pago SumUp/TPV)
│   │   ├── clientes/             # CRUD clientes
│   │   ├── vehiculos/            # CRUD vehículos
│   │   ├── facturacion/          # Facturas y tickets
│   │   ├── gastos/               # Gestión de gastos
│   │   ├── cierres-caja/         # Cierres de caja diarios
│   │   ├── diario-caja/          # Diario de caja
│   │   ├── ingresos-adicionales/ # Parking y otros ingresos
│   │   ├── servicios/            # Catálogo de servicios
│   │   ├── servicios-taller/     # Servicios rápidos (baterías, frenos...)
│   │   ├── proveedores/          # Gestión de proveedores
│   │   ├── tickets/              # Tickets de parking
│   │   ├── reservas/             # Vista admin de reservas
│   │   ├── exportar-iva/         # Exportación IVA trimestral
│   │   ├── importador/           # Importador de datos (SUPER_ADMIN)
│   │   ├── usuarios/             # Gestión usuarios (SUPER_ADMIN)
│   │   ├── locales/              # Gestión locales (SUPER_ADMIN)
│   │   ├── configuracion/        # ⚙️ Configuración general
│   │   │   ├── configuracion-view.tsx   # Tabs: Empresa, Horarios, Precios, Boxes, TPV, Reportes, Notif, Sistema
│   │   │   └── page.tsx
│   │   └── configuracion-publica/  # Config página pública
│   │
│   └── api/                      # 🔌 API Routes
│       ├── auth/[...nextauth]/   # NextAuth endpoints
│       ├── citas/                # CRUD citas + ICS export
│       ├── clientes/             # CRUD clientes
│       ├── vehiculos/            # CRUD + búsqueda vehículos
│       ├── facturas/             # CRUD facturas + PDF + stats + email
│       ├── gastos/               # CRUD gastos + stats + OCR extracción
│       ├── cierres-caja/         # CRUD cierres
│       ├── ingresos-adicionales/ # CRUD ingresos extra
│       ├── servicios/            # CRUD servicios
│       ├── servicios-taller/     # CRUD servicios taller
│       ├── proveedores/          # CRUD proveedores
│       ├── reservas/             # Reservas públicas + admin
│       ├── locales/              # CRUD locales + /publicos
│       ├── usuarios/             # CRUD usuarios + /[id]/locales
│       ├── tickets/              # Tickets parking + stats
│       ├── dashboard/            # Stats + citas recientes
│       ├── configuracion/        # Config general
│       │   ├── route.ts                 # Config general (GET/POST)
│       │   ├── publica/route.ts         # Config página pública
│       │   ├── reportes/route.ts        # 📊 Config reportes email (GET público con token / POST admin)
│       │   └── twilio/route.ts          # Config Twilio
│       ├── sumup/                # 💳 Integración SumUp
│       │   ├── checkout/                # Crear/consultar checkout
│       │   ├── checkout/[id]/           # Estado/cancelar checkout
│       │   ├── readers/                 # Listar/emparejar readers
│       │   ├── readers/[id]/            # Desemparejar reader
│       │   ├── config/                  # Config SumUp
│       │   ├── payment-link/            # Generar link de pago
│       │   └── transactions/            # Transacciones
│       ├── document-detection/   # OCR detección documentos
│       ├── exportar-iva/         # Exportación IVA
│       ├── importar/             # Importador datos
│       ├── galeria-antes-despues/  # Galería
│       ├── portfolio/            # Portfolio
│       ├── upload/               # Upload archivos + imágenes
│       └── images/[key]/         # Proxy imágenes cloud
│
├── components/                   # 🧩 Componentes reutilizables
│   ├── ui/                       # Componentes base (shadcn/ui)
│   ├── layouts/                  # Layouts
│   ├── local-selector.tsx        # Selector de local (header) con retry
│   ├── cobrar-sumup-dialog.tsx   # Dialog cobro SumUp
│   ├── editar-factura-dialog.tsx # Editar factura (cambio cliente)
│   ├── enviar-deposito-dialog.tsx      # Enviar confirmación depósito
│   ├── enviar-notificacion-listo-dialog.tsx  # Notificación "listo"
│   ├── reportes-config.tsx       # 📊 Config reportes email (UI)
│   ├── sumup-config.tsx          # Config SumUp (UI)
│   ├── twilio-config.tsx         # Config Twilio (UI)
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
│
├── lib/                          # 📚 Utilidades y lógica compartida
│   ├── auth.ts                   # NextAuth config (JWT, 30 días)
│   ├── db.ts                     # Prisma client singleton
│   ├── types.ts                  # Enums: RolUsuario, EstadoCita, MetodoPago...
│   ├── utils.ts                  # Utilidades generales
│   ├── local-context.ts          # 🏪 Multi-local: getLocalContext, buildLocalFilter
│   ├── local-store.ts            # Zustand store para local seleccionado
│   ├── sumup.ts                  # 💳 SumUp API helpers (per-local keys)
│   ├── gscontrol-sync.ts         # Sync con gsControl (contabilidad)
│   ├── notifications.ts          # WhatsApp/SMS notificaciones
│   ├── email.ts                  # Email utilities
│   ├── pdf-generator.ts          # Generación PDF facturas
│   └── excel-generator.ts        # Generación Excel exportaciones
│
├── prisma/
│   └── schema.prisma             # 📋 Esquema DB (ver sección abajo)
│
├── scripts/                      # Scripts de utilidad
│   ├── seed.ts                   # Seed datos iniciales
│   └── *.js                      # Scripts migración/diagnóstico
│
├── hooks/
│   └── use-toast.ts
│
├── types/
│   └── next-auth.d.ts            # Tipos NextAuth extendidos
│
├── .env                          # Variables de entorno
├── STYLE_GUIDE.md
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js                # ⚠️ NO TOCAR
├── package.json → symlink
└── yarn.lock → symlink
```

---

## 🗄️ Modelos de Base de Datos (Prisma)

| Modelo | Tabla PostgreSQL | Descripción |
|--------|-----------------|-------------|
| `User` | `User` | Usuarios del sistema |
| `Local` | `locales` | Locales/sucursales |
| `UserLocal` | `user_locales` | Asignación usuario↔local (M:N) |
| `Cliente` | `clientes` | Clientes |
| `Vehiculo` | `vehiculos` | Vehículos |
| `Servicio` | `servicios` | Catálogo de servicios |
| `Cita` | `citas` | Citas/turnos |
| `cita_servicios` | `cita_servicios` | Servicios por cita (M:N) |
| `Factura` | `facturas` | Facturas y tickets |
| `factura_items` | `factura_items` | Líneas de factura |
| `Gasto` | `gastos` | Gastos |
| `Proveedor` | `proveedores` | Proveedores |
| `CierreCaja` | `cierres_caja` | Cierres de caja |
| `IngresoAdicional` | `ingresos_adicionales` | Ingresos extra (parking) |
| `InventarioTickets` | `inventario_tickets` | Inventario tickets parking |
| `ServicioTaller` | `servicios_taller` | Servicios rápidos taller |
| `reservas` | `reservas` | Reservas online públicas |
| `Configuracion` | `configuraciones` | Configuración clave-valor |
| `SumUpConfig` | `sumup_config` | Config SumUp |
| `SumUpReader` | `sumup_readers` | Lectores SumUp |
| `SumUpTransaction` | `sumup_transactions` | Transacciones SumUp |
| `GaleriaAntesDespues` | `galeria_antes_despues` | Galería |
| `Portfolio` | `portfolio` | Portfolio |
| `TipoServicio` | `tipos_servicio` | Tipos de servicio |

---

## 👤 Roles de Usuario

| Rol | Acceso |
|-----|--------|
| `SUPER_ADMIN` | Todo — usuarios, locales, config, importador |
| `GRUPO_ADMIN` | Encargado de zona — ve solo sus locales asignados |
| `ADMIN` | Admin de local — config, facturación, gastos |
| `OPERADOR` | Operativo — agenda, citas, gastos básicos |
| `CLIENTE` | (Reservado) |

---

## 💳 SumUp — Claves por Local

- Cada local puede tener su propia `sumupApiKey` en la tabla `locales`
- Fallback a `.env` `SUMUP_API_KEY` si no hay clave local
- `lib/sumup.ts` → `getLocalSumUpKeys()` resuelve claves

---

## 📊 Reportes Automáticos por Email

Configurables desde: **Dashboard → Configuración → Reportes**
- API config: `/api/configuracion/reportes`
- Diario 23:00 | Semanal Lunes 08:00 | Mensual día 1 08:00 | Anual 1 Enero 10:00
- Destino configurable (múltiples emails separados por coma)

---

## 🔍 Búsqueda Rápida por Funcionalidad

| Necesitas... | Archivo(s) |
|---|---|
| Auth / Login | `lib/auth.ts`, `app/login/` |
| Multi-local | `lib/local-context.ts`, `lib/local-store.ts`, `components/local-selector.tsx` |
| Crear cita | `app/dashboard/agenda/nueva-cita-dialog.tsx`, `app/api/citas/route.ts` |
| Editar cita | `app/dashboard/agenda/editar-cita-dialog.tsx`, `app/api/citas/[id]/route.ts` |
| Descuentos | `app/api/citas/route.ts` (POST), `app/api/citas/[id]/route.ts` (PUT) |
| Facturación | `app/dashboard/facturacion/`, `app/api/facturas/` |
| Gastos | `app/dashboard/gastos/`, `app/api/gastos/` |
| SumUp pagos | `lib/sumup.ts`, `components/cobrar-sumup-dialog.tsx`, `app/api/sumup/` |
| Cierres caja | `app/dashboard/cierres-caja/`, `app/api/cierres-caja/` |
| Servicios taller | `app/dashboard/servicios-taller/`, `app/api/servicios-taller/` |
| Config reportes | `components/reportes-config.tsx`, `app/api/configuracion/reportes/` |
| Reservas online | `app/reservas/`, `app/api/reservas/` |
| GSControl sync | `lib/gscontrol-sync.ts` |
| Notificaciones | `lib/notifications.ts`, `components/enviar-*-dialog.tsx` |
| PDF facturas | `lib/pdf-generator.ts`, `app/api/facturas/[id]/pdf/` |
| Excel export | `lib/excel-generator.ts`, `app/api/exportar-iva/` |
| Schema DB | `prisma/schema.prisma` |
| Estilos | `app/globals.css`, `tailwind.config.ts`, `STYLE_GUIDE.md` |

---

## ⚙️ Variables de Entorno Clave (.env)

| Variable | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL (Abacus.AI hosted) |
| `NEXTAUTH_SECRET` | Auth secret |
| `SUMUP_API_KEY` | SumUp API key (central/fallback) |
| `SUMUP_AFFILIATE_KEY` | SumUp affiliate key |
| `GSCONTROL_API_KEY` | GSControl contabilidad |
| `ABACUSAI_API_KEY` | Abacus.AI API |
| `WEB_APP_ID` | ID app notificaciones |
| `NOTIF_ID_REPORTE_*` | IDs notificaciones reportes |
| `AWS_*` | Cloud storage (S3) |
| `TWILIO_*` | Twilio SMS/WhatsApp |

