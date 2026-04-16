import { useRef, useCallback, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { MediaStreamInfo, ProbeData } from '../types/media'

// const BASE_URL = '/ffmpeg-core'
const BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (ffmpegRef.current && loaded) return
    setLoading(true)

    const startTime = performance.now()
    const ffmpeg = new FFmpeg()
    ffmpegRef.current = ffmpeg

    await ffmpeg.load({
      coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    const loadTimeMs = Math.round(performance.now() - startTime)

    if (typeof pendo !== 'undefined') {
      pendo.track('ffmpeg_wasm_loaded', {
        loadTimeMs,
      })
    }

    setLoaded(true)
    setLoading(false)
  }, [loaded])

  const probe = useCallback(async (file: File): Promise<ProbeData> => {
    const ffmpeg = ffmpegRef.current
    if (!ffmpeg) throw new Error('FFmpeg not loaded')

    const inputName = 'input' + getExtension(file.name)
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    const logs: string[] = []
    const logHandler = ({ message }: { message: string }) => {
      logs.push(message)
    }
    ffmpeg.on('log', logHandler)

    try {
      await ffmpeg.exec(['-i', inputName]).catch(() => {})
    } finally {
      ffmpeg.off('log', logHandler)
    }

    const fullLog = logs.join('\n')
    const ext = getExtension(file.name).replace('.', '')
    return {
      streams: parseStreams(fullLog),
      duration: parseDuration(fullLog),
      fileSize: file.size,
      containerFormat: ext || 'mkv',
    }
  }, [])

  const remux = useCallback(
    async (
      file: File,
      keptStreams: MediaStreamInfo[],
      onProgress: (ratio: number) => void,
    ): Promise<string> => {
      const ffmpeg = ffmpegRef.current
      if (!ffmpeg) throw new Error('FFmpeg not loaded')

      const inputName = 'input' + getExtension(file.name)
      const outputName = 'output' + getExtension(file.name)

      // File may already be written from probe, write again to be safe
      await ffmpeg.writeFile(inputName, await fetchFile(file))

      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.max(0, Math.min(1, progress)))
      })

      // Build map args: -map 0:streamIndex for each kept stream
      const mapArgs = keptStreams.flatMap((s) => ['-map', `0:${s.index}`])

      await ffmpeg.exec(['-i', inputName, ...mapArgs, '-c', 'copy', outputName])

      const data = await ffmpeg.readFile(outputName)
      const blob = new Blob([data as BlobPart], { type: 'video/x-matroska' })
      const url = URL.createObjectURL(blob)

      // Cleanup
      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)

      return url
    },
    [],
  )

  return { load, loaded, loading, probe, remux }
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot) : '.mkv'
}

function parseDuration(log: string): string | undefined {
  // Duration: 01:23:45.67, start: ...
  const m = log.match(/Duration:\s*([\d:.]+)/)
  if (!m) return undefined
  // Strip fractional seconds: "01:23:45.67" -> "01:23:45"
  return m[1].replace(/\.\d+$/, '')
}

function parseStreams(log: string): MediaStreamInfo[] {
  const streams: MediaStreamInfo[] = []

  // Capture the full line after the codec type for detail parsing
  const streamRegex =
    /Stream #0:(\d+)(?:\(([^)]*)\))?:\s*(Video|Audio|Subtitle):\s*(.+)/gi
  let match: RegExpExecArray | null

  while ((match = streamRegex.exec(log)) !== null) {
    const index = parseInt(match[1], 10)
    const language = match[2] || 'und'
    const codecType = match[3].toLowerCase() as MediaStreamInfo['codec_type']
    const detail = match[4] // full remainder of the line
    const codecName = detail.split(/[\s,(]/)[0] // first token before space, comma, or paren

    // Try to extract title from metadata block following this stream line
    // Look between this stream line and the next "Stream #" line
    const afterStream = log.slice(match.index + match[0].length)
    const nextStreamIdx = afterStream.search(/Stream #0:/)
    const metadataBlock = nextStreamIdx >= 0 ? afterStream.slice(0, nextStreamIdx) : afterStream
    const titleMatch = metadataBlock.match(/title\s*:\s*(.+)/i)

    const info: MediaStreamInfo = {
      index,
      codec_type: codecType,
      codec_name: codecName,
      tags: {
        language,
        title: titleMatch?.[1]?.trim(),
      },
      kept: true,
    }

    // Parse type-specific details from the remainder of the stream line
    if (codecType === 'video') {
      parseVideoDetails(detail, info)
    } else if (codecType === 'audio') {
      parseAudioDetails(detail, info)
    }

    // Bitrate (shared across types): "1234 kb/s"
    const bitrateMatch = detail.match(/(\d+)\s*kb\/s/)
    if (bitrateMatch) {
      info.bitrate = parseInt(bitrateMatch[1], 10)
    }

    streams.push(info)
  }

  return streams
}

function parseVideoDetails(detail: string, info: MediaStreamInfo) {
  // Profile in parens after codec: "h264 (High)"
  const profileMatch = detail.match(/^\S+\s+\(([^)]+)\)/)
  if (profileMatch) {
    info.profile = profileMatch[1]
  }

  // Resolution: "1920x1080" or "1280x720"
  const resMatch = detail.match(/(\d{2,5})x(\d{2,5})/)
  if (resMatch) {
    info.width = parseInt(resMatch[1], 10)
    info.height = parseInt(resMatch[2], 10)
  }

  // Frame rate: "23.98 fps" or "30 fps" or "29.97 tbr"
  const fpsMatch = detail.match(/([\d.]+)\s*(?:fps|tbr)/)
  if (fpsMatch) {
    info.frameRate = fpsMatch[1]
  }
}

function parseAudioDetails(detail: string, info: MediaStreamInfo) {
  // Sample rate: "48000 Hz" or "44100 Hz"
  const srMatch = detail.match(/(\d+)\s*Hz/)
  if (srMatch) {
    info.sampleRate = parseInt(srMatch[1], 10)
  }

  // Channel layout: look for known patterns
  // FFmpeg outputs: "stereo", "mono", "5.1", "5.1(side)", "7.1", etc.
  const channelMatch = detail.match(/\b(mono|stereo|[1-9]\.[01](?:\([^)]*\))?)\b/i)
  if (channelMatch) {
    info.channels = channelMatch[1]
  }
}
