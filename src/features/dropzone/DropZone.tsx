import { useCallback, useState, type DragEvent } from 'react'
import { Upload, FileVideo } from 'lucide-react'

interface DropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

const ACCEPTED = new Set([
  'video/mp4',
  'video/x-matroska',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
])

function isAccepted(file: File) {
  if (ACCEPTED.has(file.type)) return true
  // Fallback: check extension for mkv (browsers often don't set MIME)
  return /\.(mkv|mp4|webm|mov|avi|mpg|mpeg|ts)$/i.test(file.name)
}

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file && isAccepted(file)) {
        onFile(file)
      }
    },
    [onFile, disabled],
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    if (disabled) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mkv,.mp4,.webm,.mov,.avi,.mpg,.mpeg,.ts'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) onFile(file)
    }
    input.click()
  }, [onFile, disabled])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`
        flex flex-col items-center justify-center gap-4
        w-full max-w-xl mx-auto aspect-[16/9]
        rounded-2xl border-2 _border-dashed
        cursor-pointer transition-all duration-200
        ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.02]'
            : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]'
        }
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div
        className={`
          rounded-full p-4 transition-colors
          ${dragging ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}
        `}
      >
        {dragging ? <FileVideo size={40} /> : <Upload size={40} />}
      </div>
      <div className="text-center">
        <p className="text-lg font-medium">
          {dragging ? 'Drop your video here' : 'Drop a video file or click to browse'}
        </p>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Supports MKV, MP4, WebM, MOV, and more
        </p>
      </div>
    </div>
  )
}
