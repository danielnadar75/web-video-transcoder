import { Loader2 } from 'lucide-react'
import { Progress } from '../../components/ui/Progress'

interface ProcessingCardProps {
  title: string
  description?: string
  progress?: number // 0–1; shows progress bar when provided
}

export function ProcessingCard({ title, description, progress }: ProcessingCardProps) {
  return (
    <div
      className="
        flex flex-col items-center justify-center gap-4
        w-full max-w-xl mx-auto aspect-[16/9]
        rounded-2xl border-2
        border-[var(--border)] bg-[var(--card)]
      "
    >
      <div className="rounded-full p-4 bg-[var(--accent)]/20 text-[var(--accent)]">
        <Loader2 size={40} className="animate-spin" />
      </div>
      <div className="text-center px-8 w-full">
        <p className="text-lg font-medium">{title}</p>
        {description && (
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{description}</p>
        )}
        {progress != null && (
          <div className="mt-3 w-full max-w-xs mx-auto">
            <Progress value={progress * 100} />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {Math.round(progress * 100)}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
