import { useCallback, useState } from 'react'
import { Scissors, Download, RotateCcw } from 'lucide-react'
import { DropZone } from './features/dropzone/DropZone'
import { TrackSelector } from './features/track-selector/TrackSelector'
import { ProcessingCard } from './features/processing/ProcessingCard'
import { useFFmpeg } from './hooks/useFFmpeg'
import type { AppState, MediaStreamInfo } from './types/media'

export default function App() {
  const { load, loaded, loading, probe, remux } = useFFmpeg()
  const [state, setState] = useState<AppState>({ step: 'idle' })
  const [streams, setStreams] = useState<MediaStreamInfo[]>([])
  const [file, setFile] = useState<File | null>(null)

  const handleFile = useCallback(
    async (droppedFile: File) => {
      try {
        setFile(droppedFile)

        const fileExtension = droppedFile.name.includes('.')
          ? droppedFile.name.split('.').pop()?.toLowerCase() ?? ''
          : ''

        pendo.track("video_file_imported", {
          fileName: droppedFile.name,
          fileSize: droppedFile.size,
          fileType: droppedFile.type,
          fileExtension,
          importMethod: "drop_or_browse",
        })

        if (!loaded) {
          setState({ step: 'loading-ffmpeg' })
          await load()
        }

        setState({ step: 'probing', fileName: droppedFile.name })
        const parsed = await probe(droppedFile)

        if (parsed.length === 0) {
          setState({ step: 'error', message: 'No streams found in this file. Is it a valid video?' })
          return
        }

        const videoStreamCount = parsed.filter((s) => s.codec_type === 'video').length
        const audioStreamCount = parsed.filter((s) => s.codec_type === 'audio').length
        const subtitleStreamCount = parsed.filter((s) => s.codec_type === 'subtitle').length
        const detectedCodecs = [...new Set(parsed.map((s) => s.codec_name))].join(', ')
        const detectedLanguages = [...new Set(parsed.map((s) => s.tags.language).filter(Boolean))].join(', ')

        pendo.track("file_analysis_completed", {
          fileName: droppedFile.name,
          fileSize: droppedFile.size,
          totalStreamCount: parsed.length,
          videoStreamCount,
          audioStreamCount,
          subtitleStreamCount,
          detectedCodecs,
          detectedLanguages,
        })

        setStreams(parsed)
        setState({ step: 'selecting', fileName: droppedFile.name, streams: parsed })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to analyze file'
        pendo.track("processing_error", {
          errorMessage,
          errorStep: "file_analysis",
          fileName: droppedFile.name,
          fileSize: droppedFile.size,
          fileType: droppedFile.type,
        })
        setState({
          step: 'error',
          message: errorMessage,
        })
      }
    },
    [load, loaded, probe],
  )

  const handleToggle = useCallback((streamIndex: number) => {
    setStreams((prev) =>
      prev.map((s) => (s.index === streamIndex ? { ...s, kept: !s.kept } : s)),
    )
  }, [])

  const handleRemux = useCallback(async () => {
    if (!file) return

    const keptStreams = streams.filter((s) => s.kept)
    if (keptStreams.length === 0) return

    const removedStreams = streams.filter((s) => !s.kept)
    const removedStreamTypes = [...new Set(removedStreams.map((s) => s.codec_type))].join(', ')

    pendo.track("remux_started", {
      fileName: file.name,
      fileSize: file.size,
      totalStreamCount: streams.length,
      keptStreamCount: keptStreams.length,
      removedStreamCount: removedStreams.length,
      removedStreamTypes,
      keptVideoStreams: keptStreams.filter((s) => s.codec_type === 'video').length,
      keptAudioStreams: keptStreams.filter((s) => s.codec_type === 'audio').length,
      keptSubtitleStreams: keptStreams.filter((s) => s.codec_type === 'subtitle').length,
      removedVideoStreams: removedStreams.filter((s) => s.codec_type === 'video').length,
      removedAudioStreams: removedStreams.filter((s) => s.codec_type === 'audio').length,
      removedSubtitleStreams: removedStreams.filter((s) => s.codec_type === 'subtitle').length,
    })

    try {
      setState({ step: 'processing', fileName: file.name, progress: 0 })

      const url = await remux(file, keptStreams, (progress) => {
        setState((prev) =>
          prev.step === 'processing' ? { ...prev, progress } : prev,
        )
      })

      const fileExtension = file.name.includes('.')
        ? file.name.split('.').pop()?.toLowerCase() ?? ''
        : ''
      const outputFileName = file.name.replace(/(\.[^.]+)$/, '_cleaned$1')

      pendo.track("remux_completed", {
        fileName: file.name,
        fileSize: file.size,
        outputFileName,
        keptStreamCount: keptStreams.length,
        removedStreamCount: removedStreams.length,
        fileExtension,
      })

      setState({ step: 'done', fileName: file.name, outputUrl: url })

      // Auto-download
      const a = document.createElement('a')
      a.href = url
      a.download = outputFileName
      a.click()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Remux failed'
      pendo.track("processing_error", {
        errorMessage,
        errorStep: "remux",
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      })
      setState({
        step: 'error',
        message: errorMessage,
      })
    }
  }, [file, streams, remux])

  const handleReset = useCallback(() => {
    if (state.step === 'done' && 'outputUrl' in state) {
      URL.revokeObjectURL(state.outputUrl)
    }
    setState({ step: 'idle' })
    setStreams([])
    setFile(null)
  }, [state])

  const keptCount = streams.filter((s) => s.kept).length
  const removedCount = streams.length - keptCount

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Scissors size={24} className="text-[var(--accent)]" />
          <h1 className="text-xl font-bold tracking-tight">StreamShed</h1>
          <span className="text-xs text-[var(--muted-foreground)] ml-1">
            Clean up video tracks — entirely in your browser
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">
          {/* Idle: Drop Zone */}
          {state.step === 'idle' && (
            <DropZone onFile={handleFile} disabled={loading} />
          )}

          {/* Loading FFmpeg */}
          {state.step === 'loading-ffmpeg' && (
            <ProcessingCard
              title="Loading FFmpeg engine..."
              description="Downloading the processing engine — this only happens once"
            />
          )}

          {/* Probing */}
          {state.step === 'probing' && (
            <ProcessingCard
              title={`Analyzing ${state.fileName}...`}
              description="Reading stream metadata from your file"
            />
          )}

          {/* Selecting */}
          {state.step === 'selecting' && (
            <div className="flex flex-col gap-8">
              <div className="text-center">
                <p className="text-[var(--muted-foreground)] text-sm mb-1">
                  Editing
                </p>
                <p className="text-lg font-medium">{state.fileName}</p>
              </div>

              <TrackSelector streams={streams} onToggle={handleToggle} />

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemux}
                  disabled={keptCount === 0}
                  className="px-6 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  <Scissors size={16} />
                  Remux
                  {removedCount > 0 && (
                    <span className="text-xs opacity-75">
                      ({removedCount} track{removedCount !== 1 ? 's' : ''} removed)
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Processing */}
          {state.step === 'processing' && (
            <ProcessingCard
              title={`Remuxing ${state.fileName}...`}
              description="Copying selected streams into a new file"
              progress={state.progress}
            />
          )}

          {/* Done */}
          {state.step === 'done' && (
            <div className="flex flex-col items-center gap-6">
              <div className="rounded-full bg-green-500/10 p-4">
                <Download size={32} className="text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Done!</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Your cleaned file should be downloading automatically.
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href={state.outputUrl}
                  download={file?.name.replace(/(\.[^.]+)$/, '_cleaned$1')}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Download size={16} />
                  Download Again
                </a>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)] transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Process Another
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {state.step === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-red-500/10 p-4">
                <span className="text-red-500 text-2xl">!</span>
              </div>
              <p className="text-red-400 text-center">{state.message}</p>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-3 text-center text-xs text-[var(--muted-foreground)]">
        All processing happens locally in your browser. No data leaves your device.
      </footer>
    </div>
  )
}
