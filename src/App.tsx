import { useCallback, useState } from 'react'
import { Scissors, Download, RotateCcw, Clock, HardDrive, FileVideo, History as HistoryIcon } from 'lucide-react'
import { DropZone } from './features/dropzone/DropZone'
import { TrackSelector } from './features/track-selector/TrackSelector'
import { ProcessingCard } from './features/processing/ProcessingCard'
import { History } from './features/history/History'
import { useFFmpeg, SUPPORTED_OUTPUT_FORMATS, getIncompatibleStreams } from './hooks/useFFmpeg'
import { useHistory } from './hooks/useHistory'
import type { AppState, MediaStreamInfo, ProbeData } from './types/media'

export default function App() {
  const { load, loaded, loading, probe, remux } = useFFmpeg()
  const [state, setState] = useState<AppState>({ step: 'idle' })
  const [streams, setStreams] = useState<MediaStreamInfo[]>([])
  const [probeData, setProbeData] = useState<ProbeData | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState('mkv')
  const [page, setPage] = useState<'main' | 'history'>('main')
  const { entries, addEntry, clearHistory } = useHistory()

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
        const result = await probe(droppedFile)

        if (result.streams.length === 0) {
          setState({ step: 'error', message: 'No streams found in this file. Is it a valid video?' })
          return
        }

        const videoStreamCount = result.streams.filter((s) => s.codec_type === 'video').length
        const audioStreamCount = result.streams.filter((s) => s.codec_type === 'audio').length
        const subtitleStreamCount = result.streams.filter((s) => s.codec_type === 'subtitle').length
        const detectedCodecs = [...new Set(result.streams.map((s) => s.codec_name))].join(', ')
        const detectedLanguages = [...new Set(result.streams.map((s) => s.tags.language).filter(Boolean))].join(', ')

        pendo.track("file_analysis_completed", {
          fileName: droppedFile.name,
          fileSize: droppedFile.size,
          totalStreamCount: result.streams.length,
          videoStreamCount,
          audioStreamCount,
          subtitleStreamCount,
          detectedCodecs,
          detectedLanguages,
        })

        setProbeData(result)
        setStreams(result.streams)
        setOutputFormat(SUPPORTED_OUTPUT_FORMATS.includes(result.containerFormat) ? result.containerFormat : 'mkv')
        setState({ step: 'selecting', fileName: droppedFile.name, streams: result.streams })
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

      const url = await remux(file, keptStreams, outputFormat, (progress) => {
        setState((prev) =>
          prev.step === 'processing' ? { ...prev, progress } : prev,
        )
      })

      setState({ step: 'done', fileName: file.name, outputUrl: url })

      addEntry({
        inputFileName: file.name,
        inputFileSize: file.size,
        inputFormat: probeData?.containerFormat || 'unknown',
        outputFormat,
        duration: probeData?.duration,
        totalStreams: streams.length,
        keptStreams: keptStreams.length,
        removedStreams: removedStreams.length,
      })

      const outputFileName = file.name.replace(/\.[^.]+$/, `_cleaned.${outputFormat}`)

      pendo.track("remux_completed", {
        fileName: file.name,
        fileSize: file.size,
        outputFileName,
        outputFormat,
        keptStreamCount: keptStreams.length,
        removedStreamCount: removedStreams.length,
      })

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
  }, [file, streams, outputFormat, remux])

  const handleReset = useCallback(() => {
    if (state.step === 'done' && 'outputUrl' in state) {
      URL.revokeObjectURL(state.outputUrl)
    }
    setState({ step: 'idle' })
    setStreams([])
    setProbeData(null)
    setOutputFormat('mkv')
    setFile(null)
  }, [state])

  const keptCount = streams.filter((s) => s.kept).length
  const removedCount = streams.length - keptCount
  const incompatible = getIncompatibleStreams(streams, outputFormat)

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => { setPage('main'); if (state.step === 'done' || state.step === 'error') handleReset(); }} className="flex items-center gap-3 cursor-pointer">
            <Scissors size={24} className="text-[var(--accent)]" />
            <h1 className="text-xl font-bold tracking-tight">StreamShed</h1>
          </button>
          <span className="text-xs text-[var(--muted-foreground)] ml-1 hidden sm:inline">
            Clean up video tracks — entirely in your browser
          </span>
          <div className="ml-auto">
            <button
              onClick={() => setPage(page === 'history' ? 'main' : 'history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                page === 'history'
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]'
              }`}
            >
              <HistoryIcon size={14} />
              History
              {entries.length > 0 && (
                <span className={`text-xs ${page === 'history' ? 'opacity-75' : 'text-[var(--muted-foreground)]'}`}>
                  ({entries.length})
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={`flex-1 flex ${page === 'history' ? 'items-start' : 'items-center'} justify-center px-6 py-12`}>
        {page === 'history' ? (
          <History entries={entries} onClear={clearHistory} />
        ) : (
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
              {/* File Info Bar */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <p className="text-sm font-medium truncate mb-2">{state.fileName}</p>
                <div className="flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]">
                  {probeData?.fileSize != null && (
                    <span className="flex items-center gap-1.5">
                      <HardDrive size={12} />
                      {formatFileSize(probeData.fileSize)}
                    </span>
                  )}
                  {probeData?.duration && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {formatDuration(probeData.duration)}
                    </span>
                  )}
                  {probeData?.containerFormat && (
                    <span className="flex items-center gap-1.5">
                      <FileVideo size={12} />
                      {probeData.containerFormat.toUpperCase()}
                    </span>
                  )}
                  <span>
                    {streams.length} stream{streams.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <TrackSelector streams={streams} onToggle={handleToggle} />

              {/* Output Format Selector */}
              <div className="flex items-center justify-center gap-3 text-sm">
                <label htmlFor="output-format" className="text-[var(--muted-foreground)]">
                  Output format:
                </label>
                <select
                  id="output-format"
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  {SUPPORTED_OUTPUT_FORMATS.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {incompatible.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                  <p className="font-medium mb-1">Incompatible streams for {outputFormat.toUpperCase()}:</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {incompatible.map((s) => (
                      <li key={s.index}>
                        Stream #{s.index} — {s.codec_name} ({s.codec_type})
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2 text-amber-400">
                    {outputFormat === 'mkv'
                      ? 'Turn off these streams using the toggles above — no supported format accepts them.'
                      : 'Turn off these streams using the toggles above, or switch to MKV for full compatibility.'}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemux}
                  disabled={keptCount === 0 || incompatible.length > 0}
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
                  download={file?.name.replace(/\.[^.]+$/, `_cleaned.${outputFormat}`)}
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
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-3 text-center text-xs text-[var(--muted-foreground)]">
        All processing happens locally in your browser. No data leaves your device.
      </footer>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`
  return `${bytes} B`
}

function formatDuration(hhmmss: string): string {
  const parts = hhmmss.split(':').map(Number)
  if (parts.length !== 3) return hhmmss
  const [h, m, s] = parts
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
