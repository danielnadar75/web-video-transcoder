import { useState } from 'react'
import { Send, Star, Trash2 } from 'lucide-react'
import type { FeedbackEntry } from '../../types/media'

interface FeedbackPageProps {
  entries: FeedbackEntry[]
  onSubmit: (entry: Omit<FeedbackEntry, 'id' | 'timestamp'>) => void
  onClear: () => void
}

const CATEGORIES = [
  { value: 'bug' as const, label: 'Bug Report' },
  { value: 'feature' as const, label: 'Feature Request' },
  { value: 'general' as const, label: 'General Feedback' },
]

export function FeedbackPage({ entries, onSubmit, onClear }: FeedbackPageProps) {
  const [category, setCategory] = useState<FeedbackEntry['category']>('general')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || rating === 0) return

    onSubmit({ category, message: message.trim(), rating })
    setMessage('')
    setRating(0)
    setCategory('general')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Feedback Form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 mb-8">
        <h2 className="text-lg font-semibold mb-1">Send Feedback</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          Help us improve StreamShed. Your feedback is stored locally.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Category */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--muted-foreground)]">Category</label>
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    category === cat.value
                      ? 'bg-[var(--accent)] text-white'
                      : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--muted-foreground)]">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="cursor-pointer p-0.5"
                >
                  <Star
                    size={22}
                    className={`transition-colors ${
                      star <= (hoveredStar || rating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-[var(--muted)]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="flex flex-col gap-2">
            <label htmlFor="feedback-message" className="text-sm text-[var(--muted-foreground)]">
              Message
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!message.trim() || rating === 0}
              className="px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              <Send size={14} />
              Submit
            </button>
            {submitted && (
              <span className="text-sm text-green-400">Thanks for your feedback!</span>
            )}
          </div>
        </form>
      </div>

      {/* Previous Feedback */}
      {entries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              {entries.length} feedback entr{entries.length !== 1 ? 'ies' : 'y'}
            </p>
            <button
              onClick={() => { if (window.confirm('Clear all feedback?')) onClear() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--muted-foreground)] hover:text-red-400 border border-[var(--border)] hover:border-red-400/50 transition-colors cursor-pointer"
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${categoryStyle(entry.category)}`}>
                    {CATEGORIES.find((c) => c.value === entry.category)?.label}
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        className={star <= entry.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--muted)]'}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)] ml-auto">
                    {formatDate(entry.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-[var(--foreground)]">{entry.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function categoryStyle(category: FeedbackEntry['category']): string {
  switch (category) {
    case 'bug':
      return 'bg-red-500/15 text-red-400'
    case 'feature':
      return 'bg-blue-500/15 text-blue-400'
    case 'general':
      return 'bg-[var(--muted)] text-[var(--muted-foreground)]'
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
