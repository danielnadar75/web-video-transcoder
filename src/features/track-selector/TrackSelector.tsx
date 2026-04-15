import { Music, Subtitles, Video } from 'lucide-react'
import { Switch } from '../../components/ui/Switch'
import type { MediaStreamInfo } from '../../types/media'

interface TrackSelectorProps {
  streams: MediaStreamInfo[]
  onToggle: (index: number) => void
}

function StreamIcon({ type }: { type: MediaStreamInfo['codec_type'] }) {
  switch (type) {
    case 'video':
      return <Video size={16} />
    case 'audio':
      return <Music size={16} />
    case 'subtitle':
      return <Subtitles size={16} />
  }
}

function TrackCard({
  stream,
  onToggle,
}: {
  stream: MediaStreamInfo
  onToggle: () => void
}) {
  return (
    <div
      className={`
        flex items-center justify-between gap-4 p-4 rounded-xl
        border border-[var(--border)] bg-[var(--card)]
        transition-opacity duration-200
        ${stream.kept ? 'opacity-100' : 'opacity-50'}
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 rounded-lg bg-[var(--muted)] p-2 text-[var(--muted-foreground)]">
          <StreamIcon type={stream.codec_type} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {stream.tags.title || `Stream #${stream.index}`}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {stream.tags.language?.toUpperCase() || 'UND'} &middot;{' '}
            {stream.codec_name}
          </p>
        </div>
      </div>
      <Switch checked={stream.kept} onCheckedChange={onToggle} />
    </div>
  )
}

export function TrackSelector({ streams, onToggle }: TrackSelectorProps) {
  const videoStreams = streams.filter((s) => s.codec_type === 'video')
  const audioStreams = streams.filter((s) => s.codec_type === 'audio')
  const subtitleStreams = streams.filter((s) => s.codec_type === 'subtitle')

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Video tracks (usually just one, shown but not togglable for safety) */}
      {videoStreams.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
            <Video size={14} />
            Video Tracks
          </h3>
          <div className="space-y-2">
            {videoStreams.map((s) => (
              <TrackCard key={s.index} stream={s} onToggle={() => onToggle(s.index)} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Audio column */}
        <section>
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
            <Music size={14} />
            Audio Tracks
          </h3>
          {audioStreams.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No audio tracks found</p>
          ) : (
            <div className="space-y-2">
              {audioStreams.map((s) => (
                <TrackCard key={s.index} stream={s} onToggle={() => onToggle(s.index)} />
              ))}
            </div>
          )}
        </section>

        {/* Subtitle column */}
        <section>
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3 flex items-center gap-2">
            <Subtitles size={14} />
            Subtitle Tracks
          </h3>
          {subtitleStreams.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No subtitle tracks found</p>
          ) : (
            <div className="space-y-2">
              {subtitleStreams.map((s) => (
                <TrackCard key={s.index} stream={s} onToggle={() => onToggle(s.index)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
