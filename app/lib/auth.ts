
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { headers } from "next/headers"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Leer el slug del tenant desde el header inyectado por el middleware
        const headersList = headers()
        const tenantSlug = headersList.get('x-tenant-slug') || 'default'

        // Buscar el tenant por slug
        const tenant = await prisma.tenant.findUnique({
          where: { slug: tenantSlug }
        })

        if (!tenant || !tenant.activo) {
          return null
        }

        // Buscar usuario dentro de ese tenant
        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email,
            tenantId: tenant.id
          }
        })

        // Si no encontramos por tenantId, intentar fallback para SUPER_ADMIN sin tenant
        const effectiveUser = user || await prisma.user.findFirst({
          where: {
            email: credentials.email,
            role: 'SUPER_ADMIN',
            tenantId: null
          }
        })

        if (!effectiveUser || !effectiveUser.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          effectiveUser.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: effectiveUser.id,
          email: effectiveUser.email,
          name: effectiveUser.name,
          role: effectiveUser.role,
          tenantId: effectiveUser.tenantId || tenant.id,
          tenantSlug: tenant.slug,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `servyauto.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.tenantId = (user as any).tenantId
        token.tenantSlug = (user as any).tenantSlug
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        if (token?.id) {
          (session.user as any).id = token.id
        }
        if (token?.role) {
          (session.user as any).role = token.role
        }
        if (token?.tenantId) {
          (session.user as any).tenantId = token.tenantId
        }
        if (token?.tenantSlug) {
          (session.user as any).tenantSlug = token.tenantSlug
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
