import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { normalizeUsername } from '@/lib/auth/utils'

function isLegacyEnvAdminToken(token: {
  sub?: string
  email?: string | null
  username?: string
}) {
  const envUsername = normalizeUsername(process.env.OPERATOR_USERNAME)

  if (token.sub === 'env-super-admin') return true
  if (token.sub === '1' && token.email === 'operator@prostream.local') return true
  if (token.username && token.username === envUsername) return true

  return false
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Operator Login',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = normalizeUsername(credentials?.username as string)
        const password = credentials?.password as string

        if (!username || !password) return null

        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1)

        if (dbUser) {
          const passwordValid = await bcrypt.compare(password, dbUser.passwordHash)

          if (!passwordValid) return null

          return {
            id: String(dbUser.id),
            name: dbUser.displayName,
            email: `${dbUser.username}@prostream.local`,
            username: dbUser.username,
            role: dbUser.role,
            phone: dbUser.phone ?? undefined,
            photoCloudinaryId: dbUser.photoCloudinaryId ?? undefined,
          }
        }

        const envUsername = normalizeUsername(process.env.OPERATOR_USERNAME)
        if (username !== envUsername) return null

        const storedPassword = process.env.OPERATOR_PASSWORD ?? ''
        const isBcryptHash = storedPassword.startsWith('$2')

        let passwordValid: boolean
        if (isBcryptHash) {
          passwordValid = await bcrypt.compare(password, storedPassword)
        } else {
          // Legacy plaintext comparison — update OPERATOR_PASSWORD to a bcrypt hash for production
          // Generate hash: node -e "require('bcryptjs').hash('yourpassword', 12).then(console.log)"
          if (process.env.NODE_ENV !== 'test') {
            console.warn('[AUTH] OPERATOR_PASSWORD is plaintext. Run the hash command above and update your env.')
          }
          passwordValid = password === storedPassword
        }

        if (passwordValid) {
          return {
            id: 'env-super-admin',
            name: process.env.OPERATOR_DISPLAY_NAME ?? process.env.OPERATOR_USERNAME ?? 'Super Admin',
            email: `${envUsername || 'admin'}@prostream.local`,
            username: envUsername,
            role: 'admin',
          }
        }
        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: 'admin' | 'operator' }).role
        token.username = (user as { username?: string }).username
        token.phone = (user as { phone?: string }).phone
        token.photoCloudinaryId = (user as { photoCloudinaryId?: string }).photoCloudinaryId
        token.sub = user.id
      }

      if (isLegacyEnvAdminToken({
        sub: token.sub,
        email: token.email,
        username: typeof token.username === 'string' ? token.username : undefined,
      })) {
        token.role = 'admin'
        token.username = normalizeUsername(process.env.OPERATOR_USERNAME)
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ''
        session.user.role = (token.role as 'admin' | 'operator') ?? 'operator'
        session.user.username = (token.username as string | undefined) ?? ''
        session.user.phone = token.phone
        session.user.photoCloudinaryId = token.photoCloudinaryId
      }
      return session
    },
  },
})
