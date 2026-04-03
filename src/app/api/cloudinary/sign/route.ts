import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { paramsToSign } = await req.json() as { paramsToSign: Record<string, string> }

  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!apiSecret) {
    return NextResponse.json({ error: 'Server misconfigured: missing Cloudinary secret' }, { status: 500 })
  }

  // Build the string to sign: sort params alphabetically, join as key=value pairs
  const stringToSign = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&')

  const signature = crypto
    .createHash('sha256')
    .update(stringToSign + apiSecret)
    .digest('hex')

  return NextResponse.json({ signature })
}
