import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'streamshed_user'

export interface User {
  email: string
  name: string
}

const USERS: Record<string, { password: string; name: string }> = {
  'daniel@streamshed.app': { password: 'demo123', name: 'Daniel' },
  'jane@streamshed.app': { password: 'demo123', name: 'Jane' },
  'demo@streamshed.app': { password: 'demo', name: 'Demo User' },
}

function getSnapshot(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

let cached = getSnapshot()
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function snapshot() {
  return cached
}

function notify() {
  cached = getSnapshot()
  listeners.forEach((cb) => cb())
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, snapshot)

  const login = useCallback((email: string, password: string): string | null => {
    const entry = USERS[email.toLowerCase()]
    if (!entry || entry.password !== password) {
      return 'Invalid email or password'
    }
    const user: User = { email: email.toLowerCase(), name: entry.name }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    notify()
    return null
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    notify()
  }, [])

  return { user, login, logout }
}
