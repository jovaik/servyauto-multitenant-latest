
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { logActivity } from "@/lib/activity-logger"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días en segundos
  },
  cookies: {
    sessionToken: {
      name: `servyauto.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 días
      },
    },
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        // Log de login
        logActivity({
          action: 'LOGIN',
          entity: 'USUARIO',
          entityId: user.id,
          description: `Inicio de sesión: ${user.name || user.email}`,
          userId: user.id,
          userName: user.name || undefined,
          userEmail: user.email || undefined,
        }).catch(() => {})
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
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
