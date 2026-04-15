interface ProgressProps {
  value: number // 0–100
}

export function Progress({ value }: ProgressProps) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--muted)]">
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
