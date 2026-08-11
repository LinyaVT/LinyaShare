import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { clearAttempts, getBlockRemaining, getClientIp, recordFailure } from "./rate-limit"

class TooManyAttemptsError extends CredentialsSignin {
  constructor() {
    super()
    this.code = "TooManyAttempts"
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = (credentials.email as string).toLowerCase()
        const key = `${getClientIp(request)}|${email}`

        if (getBlockRemaining(key) > 0) {
          throw new TooManyAttemptsError()
        }

        let user = null
        try {
          user = await prisma.user.findUnique({
            where: { email },
          })
        } catch (error) {
          // Log the real error so it is distinguishable from wrong credentials.
          // NextAuth wraps any throw/return-null in authorize() as "CredentialsSignin".
          console.error("[auth][authorize] Unexpected error:", error)
          return null
        }

        if (!user) {
          recordFailure(key)
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) {
          recordFailure(key)
          return null
        }

        clearAttempts(key)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})