import { Trash2 } from 'lucide-react'
import type { HistoryEntry } from '../../types/media'

interface HistoryProps {
  entries: HistoryEntry[]
  onClear: () => void
}

export function History({ entries, onClear }: HistoryProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--muted-foreground)]">
        <p className="text-sm">No files processed yet.</p>
        <p className="text-xs mt-1">Your processing history will appear here.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--muted-foreground)]">
          {entries.length} file{entries.length !== 1 ? 's' : ''} processed
        </p>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--muted-foreground)] hover:text-red-400 border border-[var(--border)] hover:border-red-400/50 transition-colors cursor-pointer"
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--muted)] text-[var(--muted-foreground)] text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-semibold">File</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Size</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Duration</th>
              <th className="text-left px-4 py-3 font-semibold">Format</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Streams</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-t border-[var(--border)] hover:bg-[var(--card)] transition-colors"
              >
                <td className="px-4 py-3 max-w-[200px] truncate font-medium">
                  {entry.inputFileName}
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] hidden sm:table-cell">
                  {formatFileSize(entry.inputFileSize)}
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] hidden md:table-cell">
                  {entry.duration || '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[var(--muted-foreground)]">
                    {entry.inputFormat.toUpperCase()}
                  </span>
                  <span className="mx-1 text-[var(--muted-foreground)]">&rarr;</span>
                  <span>{entry.outputFormat.toUpperCase()}</span>
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] hidden sm:table-cell">
                  {entry.keptStreams}/{entry.totalStreams} kept
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs hidden md:table-cell">
                  {formatDate(entry.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`
  return `${bytes} B`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
