'use client'

import { useRef } from 'react'

type Props = {
  label: string
  preset: 'team-logo' | 'player-headshot'
  onUploaded: (publicId: string, url: string) => void
  className?: string
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!

export function CloudinaryUpload({ label, preset, onUploaded, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Get a signed timestamp
    const timestamp = Math.round(Date.now() / 1000)
    const paramsToSign: Record<string, string> = {
      timestamp: String(timestamp),
      upload_preset: preset,
    }

    const sigRes = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paramsToSign }),
    })
    if (!sigRes.ok) return
    const { signature } = await sigRes.json() as { signature: string }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', preset)
    formData.append('timestamp', String(timestamp))
    formData.append('signature', signature)
    formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ?? '')

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData },
    )
    if (!uploadRes.ok) return
    const data = await uploadRes.json() as { public_id: string; secure_url: string }
    onUploaded(data.public_id, data.secure_url)

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <label className={`cursor-pointer ${className ?? ''}`}>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} />
      <span className="px-3 py-1.5 bg-gray-700 text-gray-300 font-stats text-xs rounded-lg hover:bg-gray-600 transition-colors">
        {label}
      </span>
    </label>
  )
}
