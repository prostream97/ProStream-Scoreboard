'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Camera, Lock, User, Phone } from 'lucide-react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import {
  AppButton,
  AppPage,
  PageHeader,
  SurfaceCard,
  appInputClass,
  appLabelClass,
} from '@/components/shared/AppPrimitives'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

export default function ProfilePage() {
  const { data: session, update, status } = useSession()
  const router = useRouter()

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    phone: '',
    photoCloudinaryId: '',
  })
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
    if (session && !initialized) {
      setForm({
        displayName: session.user.name ?? '',
        username: session.user.username ?? '',
        phone: (session.user as { phone?: string }).phone ?? '',
        photoCloudinaryId: (session.user as { photoCloudinaryId?: string }).photoCloudinaryId ?? '',
      })
      setInitialized(true)
    }
  }, [session, initialized])

  if (status === 'unauthenticated') {
    router.replace('/login')
    return null
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName,
          username: form.username,
          phone: form.phone,
          photoCloudinaryId: form.photoCloudinaryId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setProfileError(data.error ?? 'Failed to update profile')
        return
      }
      await update()
      router.refresh()
      setProfileSuccess('Profile updated successfully')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPasswordError(data.error ?? 'Failed to change password')
        return
      }
      setPasswordSuccess('Password changed successfully')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } finally {
      setSavingPassword(false)
    }
  }

  const photoUrl = form.photoCloudinaryId && CLOUD_NAME
    ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_120,h_120,f_webp/${form.photoCloudinaryId}`
    : null

  return (
    <AppPage className="max-w-2xl">
      <PageHeader
        title="My Profile"
        description="Update your display name, username, photo, and contact details."
      />

      {/* Profile info form */}
      <form onSubmit={handleSaveProfile} className="space-y-5">
        <SurfaceCard className="space-y-5">
          <div className="flex items-center gap-2 pb-1">
            <User className="h-4 w-4 text-[#10994c]" />
            <p className="app-kicker !text-slate-600">Profile details</p>
          </div>

          {/* Photo */}
          <div className="flex items-center gap-5">
            <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border border-[#dfe6df] bg-[#f3f7f2]">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-2xl font-bold text-slate-400">
                    {(form.displayName || form.username || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <Camera className="h-3.5 w-3.5 text-slate-400" />
                <p className={appLabelClass}>Profile Photo</p>
              </div>
              <ImageUpload
                value={form.photoCloudinaryId || null}
                onChange={(publicId) => setForm((f) => ({ ...f, photoCloudinaryId: publicId }))}
                folder="user-profiles"
                previewShape="circle"
              />
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className={appLabelClass}>Display Name</label>
            <input
              className={appInputClass}
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="Your name"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className={appLabelClass}>Username</label>
            <input
              className={appInputClass}
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="username"
              required
              minLength={3}
            />
          </div>

          {/* WhatsApp */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <label className={appLabelClass}>WhatsApp Number</label>
            </div>
            <input
              className={appInputClass}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+94 77 123 4567"
              type="tel"
            />
          </div>

          {profileError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{profileError}</p>
          ) : null}
          {profileSuccess ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{profileSuccess}</p>
          ) : null}

          <AppButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </AppButton>
        </SurfaceCard>
      </form>

      {/* Password change form */}
      <form onSubmit={handleChangePassword} className="space-y-5 mt-5">
        <SurfaceCard className="space-y-5">
          <div className="flex items-center gap-2 pb-1">
            <Lock className="h-4 w-4 text-[#10994c]" />
            <p className="app-kicker !text-slate-600">Change Password</p>
          </div>

          <div>
            <label className={appLabelClass}>Current Password</label>
            <input
              className={appInputClass}
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
              placeholder="Enter current password"
              required
            />
          </div>

          <div>
            <label className={appLabelClass}>New Password</label>
            <input
              className={appInputClass}
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className={appLabelClass}>Confirm New Password</label>
            <input
              className={appInputClass}
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="Repeat new password"
              required
            />
          </div>

          {passwordError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{passwordError}</p>
          ) : null}
          {passwordSuccess ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{passwordSuccess}</p>
          ) : null}

          <AppButton type="submit" disabled={savingPassword}>
            {savingPassword ? 'Changing…' : 'Change Password'}
          </AppButton>
        </SurfaceCard>
      </form>
    </AppPage>
  )
}
