import { DefaultSession } from 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      role: 'admin' | 'operator'
      username: string
      phone?: string
      photoCloudinaryId?: string
    }
  }

  interface User {
    username?: string
    role?: 'admin' | 'operator'
    phone?: string
    photoCloudinaryId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'admin' | 'operator'
    username?: string
    phone?: string
    photoCloudinaryId?: string
  }
}
