import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Operator Login',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username as string
        const password = credentials?.password as string

        if (username !== process.env.OPERATOR_USERNAME) return null

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
            id: '1',
            name: 'Operator',
            email: 'operator@prostream.local',
            role: 'operator',
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
        token.role = (user as { role?: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
})
