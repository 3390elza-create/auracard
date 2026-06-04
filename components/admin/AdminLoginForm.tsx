'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        setError('Invalid email or password.')
        return
      }
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <h1 className="mb-6 text-xl font-semibold text-white">Admin sign in</h1>

      <label htmlFor="email" className="mb-1 block text-sm text-white/70">Email</label>
      <input
        id="email" type="email" autoComplete="username" required
        value={email} onChange={e => setEmail(e.target.value)}
        className="mb-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30"
      />

      <label htmlFor="password" className="mb-1 block text-sm text-white/70">Password</label>
      <input
        id="password" type="password" autoComplete="current-password" required
        value={password} onChange={e => setPassword(e.target.value)}
        className="mb-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30"
      />

      {error && <p role="alert" className="mb-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit" disabled={submitting}
        className="w-full rounded-lg bg-gradient-to-r from-[#7C5CFF] via-[#4F8CFF] to-[#2DD4BF] px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
