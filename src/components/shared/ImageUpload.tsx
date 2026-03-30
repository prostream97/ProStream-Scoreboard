'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

interface ImageUploadProps {
  /** Current Cloudinary public_id (or null/empty if none) */
  value: string | null
  /** Called with the new Cloudinary public_id after a successful upload */
  onChange: (publicId: string) => void
  folder: 'team-logos' | 'player-headshots'
  label?: string
  previewShape?: 'circle' | 'square'
  /** Crop aspect ratio. Defaults to 1 (square). */
  cropAspect?: number
  id?: string
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const MAX_DIMENSION = 1024
const JPEG_QUALITY = 0.85

function cloudinaryUrl(publicId: string, size = 200) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},f_webp/${publicId}`
}

async function resizeImage(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      const canvas = document.createElement('canvas')
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0)
      } else {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      }
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Resize failed'))),
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = reject
    img.src = url
  })
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      canvas.getContext('2d')!.drawImage(
        img,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height,
      )
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Crop failed'))),
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

export function ImageUpload({
  value,
  onChange,
  folder,
  label = 'Image',
  previewShape = 'circle',
  cropAspect = 1,
  id = 'image-upload',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    const objectUrl = URL.createObjectURL(file)
    setCropSrc(objectUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    e.target.value = ''
  }

  function cancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setFileName('')
  }

  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels) return
    setIsUploading(true)
    setError(null)
    try {
      const cropped = await getCroppedBlob(cropSrc, croppedAreaPixels)
      const resized = await resizeImage(cropped)

      const formData = new FormData()
      formData.append('file', resized, 'photo.jpg')
      formData.append('folder', folder)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json() as { publicId: string; url: string }
        onChange(data.publicId)
        setFileName('')
      } else {
        const data = await res.json()
        setError(data.error ?? 'Upload failed')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Upload failed — please try again')
    } finally {
      if (cropSrc) URL.revokeObjectURL(cropSrc)
      setCropSrc(null)
      setIsUploading(false)
    }
  }

  const shapeClass = previewShape === 'circle' ? 'rounded-full' : 'rounded-xl'
  const vpSize = 320

  return (
    <>
      <div>
        <p className="font-stats text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</p>
        <div className="flex items-center gap-4">
          {/* Preview */}
          <div className={`relative w-16 h-16 flex-shrink-0 ${shapeClass} overflow-hidden border border-gray-700 bg-gray-800`}>
            {value
              ? <img src={cloudinaryUrl(value, 128)} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-stats">
                  No image
                </div>
            }
            {isUploading && (
              <div className={`absolute inset-0 bg-black/60 flex items-center justify-center`}>
                <div className="w-6 h-6 rounded-full border-2 border-gray-600 border-t-primary animate-spin" />
              </div>
            )}
          </div>

          {/* File picker */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={id}
              className={`cursor-pointer px-3 py-1.5 bg-gray-700 text-gray-200 font-stats text-xs rounded-lg hover:bg-gray-600 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isUploading ? 'Uploading…' : value ? 'Change Image' : 'Upload Image'}
              <input
                type="file"
                id={id}
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
            {fileName && !isUploading && (
              <p className="font-stats text-[10px] text-gray-500 truncate max-w-[160px]">{fileName}</p>
            )}
            {error && (
              <p className="font-stats text-[10px] text-red-400">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Crop modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center gap-5">
          <p className="text-gray-300 font-stats text-sm">Drag to reposition · Scroll to zoom</p>

          <div
            className="relative overflow-hidden bg-black"
            style={{ width: vpSize, height: Math.round(vpSize / cropAspect), borderRadius: 12 }}
          >
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={cropAspect}
              cropShape={previewShape === 'circle' ? 'round' : 'rect'}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3" style={{ width: vpSize }}>
            <span className="font-stats text-xs text-gray-400 w-10">Zoom</span>
            <input
              type="range" min={1} max={3} step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="font-stats text-xs text-gray-500 w-8 text-right">{zoom.toFixed(1)}×</span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={cancelCrop}
              className="px-5 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 font-stats text-sm hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCropConfirm}
              className="px-5 py-2 rounded-lg bg-primary text-white font-stats font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Crop &amp; Upload
            </button>
          </div>
        </div>
      )}
    </>
  )
}
