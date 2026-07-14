
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Session } from 'next-auth'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  Car, 
  Calendar, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  BarChart3,
  Clock,
  UserCheck,
  CreditCard,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Download,
  Archive,
  Upload,
  Globe,
  Wrench,
  BookOpen,
  Building2,
  Store,
  ParkingCircle,
  ScrollText
} from 'lucide-react'
import { RolUsuario } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LocalSelector } from '@/components/local-selector'
import { installFetchInterceptor } from '@/lib/local-store'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  session: Session
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
  roles?: RolUsuario[]
}

interface NavSection {
  name: string
  icon: React.ComponentType<any>
  roles?: RolUsuario[]
  items: NavItem[]
}

// Items de navegación simples (sin submenú) - OPERADOR y GRUPO_ADMIN tienen acceso a lo operativo
const simpleNavigation: NavItem[] = [
  { name: 'Agenda', href: '/dashboard/agenda', icon: Calendar, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR] },
  { name: 'Reservas', href: '/dashboard/reservas', icon: Clock, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR] },
  { name: 'Clientes', href: '/dashboard/clientes', icon: Users, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR] },
  { name: 'Vehículos', href: '/dashboard/vehiculos', icon: Car, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR] },
]

// Sección GESTIÓN (con submenú desplegable) - GRUPO_ADMIN ve gestión pero no configuración
const gestionSection: NavSection = {
  name: 'Gestión',
  icon: BarChart3,
  roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR],
  items: [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR] },
    { name: 'Diario de Caja', href: '/dashboard/diario-caja', icon: BookOpen, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR] },
    { name: 'Facturación', href: '/dashboard/facturacion', icon: CreditCard, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN] },
    { name: 'Gastos', href: '/dashboard/gastos', icon: TrendingDown, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR] },
    { name: 'Ingresos Extra', href: '/dashboard/ingresos-adicionales', icon: ParkingCircle, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN] },
    { name: 'Proveedores', href: '/dashboard/proveedores', icon: Building2, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN] },
  ]
}

// Items adicionales después de Gestión
// GRUPO_ADMIN = encargado de zona, ve operativa pero NO configuración/usuarios/locales
const additionalNavigation: NavItem[] = [
  { name: 'Servicios Taller', href: '/dashboard/servicios-taller', icon: Wrench, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR] },
  { name: 'Cierres de Caja', href: '/dashboard/cierres-caja', icon: Archive, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR] },
  { name: 'Tickets Parking', href: '/dashboard/tickets', icon: Download, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN, RolUsuario.OPERADOR] },
  { name: 'Importador', href: '/dashboard/importador', icon: Upload, roles: [RolUsuario.SUPER_ADMIN] },
  { name: 'Exportar IVA', href: '/dashboard/exportar-iva', icon: Download, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN] },
  { name: 'Usuarios', href: '/dashboard/usuarios', icon: UserCheck, roles: [RolUsuario.SUPER_ADMIN] },
  { name: 'Locales', href: '/dashboard/locales', icon: Store, roles: [RolUsuario.SUPER_ADMIN] },
  { name: 'Configuración', href: '/dashboard/configuracion', icon: Settings, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN] },
  { name: 'Reportes', href: '/dashboard/reportes', icon: FileText, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.GRUPO_ADMIN, RolUsuario.ADMIN] },
  { name: 'Registro Actividad', href: '/dashboard/actividad', icon: ScrollText, roles: [RolUsuario.SUPER_ADMIN] },
  { name: 'Página Pública', href: '/dashboard/configuracion-publica', icon: Globe, roles: [RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN] },
]

// Combinar todo para búsqueda de nombres
const allNavItems: NavItem[] = [
  ...simpleNavigation,
  ...gestionSection.items,
  ...additionalNavigation,
]

const getRoleLabel = (role: string): string => {
  const roleLabels: { [key: string]: string } = {
    [RolUsuario.SUPER_ADMIN]: 'Super Admin',
    [RolUsuario.GRUPO_ADMIN]: 'Encargado de Zona',
    [RolUsuario.ADMIN]: 'Admin',
    [RolUsuario.OPERADOR]: 'Operador',
    [RolUsuario.CLIENTE]: 'Cliente',
  }
  return roleLabels[role] || role
}

export function DashboardLayoutClient({ children, session }: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [gestionOpen, setGestionOpen] = useState(true) // Sección Gestión abierta por defecto
  const pathname = usePathname()
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Instalar interceptor de fetch para enviar x-selected-local-id automáticamente
  useEffect(() => {
    installFetchInterceptor();
  }, []);
  
  // Obtener rol del usuario
  const userRole = (session?.user as any)?.role as RolUsuario || RolUsuario.OPERADOR
  
  // Filtrar navegación simple según rol
  const filteredSimpleNav = simpleNavigation.filter(item => {
    if (!item.roles || item.roles.length === 0) return true
    return item.roles.includes(userRole)
  })

  // Verificar si el usuario puede ver la sección Gestión
  const canSeeGestion = !gestionSection.roles || gestionSection.roles.includes(userRole)

  // Filtrar navegación adicional según rol
  const filteredAdditionalNav = additionalNavigation.filter(item => {
    if (!item.roles || item.roles.length === 0) return true
    return item.roles.includes(userRole)
  })

  // Verificar si estamos en una página de Gestión para mantenerla abierta
  const isInGestionSection = gestionSection.items.some(item => pathname === item.href)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  const handleProfileClick = () => {
    const role = (session?.user as any)?.role
    alert(`Perfil de ${session?.user?.name}\nEmail: ${session?.user?.email}\nRol: ${getRoleLabel(role)}`)
    setUserMenuOpen(false)
  }

  // Cerrar sidebar solo en móvil al hacer clic en un link
  const handleNavClick = () => {
    // Solo cerrar en móvil (< 1024px)
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black opacity-25" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between h-28 px-2 border-b bg-white">
          <div className="flex items-center justify-center w-full">
            <div className="relative h-24 w-[250px] flex-shrink-0">
              <Image
                src="/servyauto-logo.jpg"
                alt="ServyAuto Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden absolute right-2 top-4"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {/* Items simples de navegación */}
          {filteredSimpleNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 group
                  ${isActive 
                    ? 'bg-red-50 text-red-600 border-r-2 border-red-600' 
                    : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                  }
                `}
                onClick={handleNavClick}
              >
                <Icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${isActive ? 'text-red-600' : 'text-gray-400 group-hover:text-red-600'}`} />
                {item.name}
              </Link>
            )
          })}

          {/* Sección GESTIÓN desplegable */}
          {canSeeGestion && (
            <div className="pt-2">
              <button
                onClick={() => setGestionOpen(!gestionOpen)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                  ${isInGestionSection 
                    ? 'bg-orange-50 text-orange-600' 
                    : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                  }
                `}
              >
                <div className="flex items-center">
                  <BarChart3 className={`mr-3 h-5 w-5 ${isInGestionSection ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span>{gestionSection.name}</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${gestionOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Subitems de Gestión - filtrados por rol */}
              {gestionOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-orange-200 pl-2">
                  {gestionSection.items
                    .filter(item => !item.roles || item.roles.includes(userRole))
                    .map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`
                          flex items-center px-3 py-2 rounded-lg text-sm transition-colors duration-200 group
                          ${isActive 
                            ? 'bg-orange-100 text-orange-700 font-medium' 
                            : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                          }
                        `}
                        onClick={handleNavClick}
                      >
                        <Icon className={`mr-3 h-4 w-4 ${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-orange-600'}`} />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Items adicionales de navegación */}
          <div className="pt-2 space-y-1">
            {filteredAdditionalNav.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 group
                    ${isActive 
                      ? 'bg-red-50 text-red-600 border-r-2 border-red-600' 
                      : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                    }
                  `}
                  onClick={handleNavClick}
                >
                  <Icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${isActive ? 'text-red-600' : 'text-gray-400 group-hover:text-red-600'}`} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="px-4 py-3 text-center border-t">
          <div className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
            <span className="font-medium">Powered by</span>
            <span className="font-bold text-red-600">D&D4U</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            (Development and designed for you)
          </div>
        </div>

        <div className="border-t px-4 py-4 relative" ref={userMenuRef}>
          <Button 
            variant="ghost" 
            className="w-full justify-start h-auto p-2 hover:bg-gray-100"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className="flex items-center space-x-3 w-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback>
                  {session?.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500">
                  {session?.user?.email}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </div>
          </Button>
          
          {/* Custom dropdown menu */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
              <button
                onClick={handleProfileClick}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Settings className="mr-2 h-4 w-4" />
                Mi perfil
              </button>
              <hr className="my-1 border-gray-200" />
              <button
                onClick={() => {
                  handleSignOut()
                  setUserMenuOpen(false)
                }}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <div className="bg-white shadow-sm border-b flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 lg:px-6 py-2 lg:h-16 flex-shrink-0">
          {/* Primera fila: Menu hamburguesa + Logo + Usuario */}
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center space-x-2 lg:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center space-x-2 lg:space-x-6">
                <div className="relative h-12 w-32 lg:h-20 lg:w-80 flex-shrink-0">
                  <Image
                    src="/servyauto-logo.jpg"
                    alt="ServyAuto Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="hidden lg:block h-14 w-px bg-gray-300"></div>
                <h2 className="hidden lg:block text-xl font-semibold text-gray-900">
                  {allNavItems.find(item => item.href === pathname)?.name || 'ServyAuto Manager'}
                </h2>
              </div>
            </div>

            {/* Usuario - visible en desktop */}
            <div className="hidden lg:flex items-center space-x-4">
              <LocalSelector userRole={(session?.user as any)?.role} />
              <div className="text-sm text-gray-600">
                <span className="font-medium">{session?.user?.name}</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {(session?.user as any)?.role || 'Admin'}
                </span>
              </div>
            </div>

            {/* Usuario compacto - visible en móvil */}
            <div className="lg:hidden text-sm text-gray-600 flex items-center">
              <span className="font-medium truncate max-w-[100px]">{session?.user?.name}</span>
              <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                {(session?.user as any)?.role || 'Admin'}
              </span>
            </div>
          </div>

          {/* Segunda fila: Selector de local - SIEMPRE VISIBLE EN MÓVIL para GRUPO_ADMIN */}
          <div className="lg:hidden mt-2 pb-1">
            <LocalSelector userRole={(session?.user as any)?.role} />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
