import { useState } from 'react'
import { Scissors, LogIn } from 'lucide-react'

interface LoginPageProps {
  onLogin: (email: string, password: string) => string | null
}

const SAMPLE_ACCOUNTS = [
  { email: 'daniel@streamshed.app', password: 'demo123', label: 'Daniel' },
  { email: 'jane@streamshed.app', password: 'demo123', label: 'Jane' },
  { email: 'demo@streamshed.app', password: 'demo', label: 'Demo User' },
]

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = onLogin(email, password)
    if (err) setError(err)
  }

  const handleQuickLogin = (account: typeof SAMPLE_ACCOUNTS[0]) => {
    const err = onLogin(account.email, account.password)
    if (err) setError(err)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="rounded-full bg-[var(--accent)]/10 p-3">
            <Scissors size={28} className="text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">StreamShed</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Sign in to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-xs text-[var(--muted-foreground)] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              placeholder="you@example.com"
              required
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs text-[var(--muted-foreground)] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              placeholder="Enter password"
              required
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn size={16} />
            Sign In
          </button>
        </form>

        <div className="mt-8">
          <p className="text-xs text-[var(--muted-foreground)] text-center mb-3">Quick login</p>
          <div className="flex flex-col gap-2">
            {SAMPLE_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                onClick={() => handleQuickLogin(account)}
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm hover:border-[var(--muted-foreground)] transition-colors cursor-pointer text-left flex items-center justify-between"
              >
                <span className="font-medium">{account.label}</span>
                <span className="text-xs text-[var(--muted-foreground)]">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
