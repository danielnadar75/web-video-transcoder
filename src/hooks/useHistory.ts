import { useCallback, useSyncExternalStore } from 'react'
import type { HistoryEntry } from '../types/media'

const STORAGE_KEY = 'streamshed_history'

function getSnapshot(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
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

export function useHistory() {
  const entries = useSyncExternalStore(subscribe, snapshot)

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const full: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    const current = getSnapshot()
    localStorage.setItem(STORAGE_KEY, JSON.stringify([full, ...current]))
    notify()
  }, [])

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    notify()
  }, [])

  return { entries, addEntry, clearHistory }
}
