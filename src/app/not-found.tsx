import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center space-y-4">
        <h1 className="font-display text-8xl text-primary tracking-wider">404</h1>
        <p className="font-stats text-xl text-gray-400">Page not found</p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-2 bg-primary text-white font-stats rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  )
}
