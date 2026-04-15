import { useRef, useCallback, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { MediaStreamInfo } from '../types/media'

// const BASE_URL = '/ffmpeg-core'
const BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (ffmpegRef.current && loaded) return
    setLoading(true)

    const ffmpeg = new FFmpeg()
    ffmpegRef.current = ffmpeg

    await ffmpeg.load({
      coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    setLoaded(true)
    setLoading(false)
  }, [loaded])

  const probe = useCallback(async (file: File): Promise<MediaStreamInfo[]> => {
    const ffmpeg = ffmpegRef.current
    if (!ffmpeg) throw new Error('FFmpeg not loaded')

    const inputName = 'input' + getExtension(file.name)
    await ffmpeg.writeFile(inputName, await fetchFile(file))

    // Use ffprobe-like approach: run ffmpeg with no output to get stream info
    // FFmpeg.wasm doesn't have ffprobe, so we parse stderr from a quick run
    const logs: string[] = []
    const logHandler = ({ message }: { message: string }) => {
      logs.push(message)
    }
    ffmpeg.on('log', logHandler)

    try {
      // Run ffmpeg -i input to trigger stream info dump (will "fail" with no output)
      await ffmpeg.exec(['-i', inputName]).catch(() => {})
    } finally {
      ffmpeg.off('log', logHandler)
    }

    const fullLog = logs.join('\n')
    return parseStreams(fullLog)
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

function parseStreams(log: string): MediaStreamInfo[] {
  const streams: MediaStreamInfo[] = []

  // Match lines like: Stream #0:0(eng): Video: h264 ...
  // or: Stream #0:1(jpn): Audio: aac ...
  // or: Stream #0:2(eng): Subtitle: subrip ...
  const streamRegex =
    /Stream #0:(\d+)(?:\(([^)]*)\))?:\s*(Video|Audio|Subtitle):\s*(\S+)/gi
  let match: RegExpExecArray | null

  while ((match = streamRegex.exec(log)) !== null) {
    const index = parseInt(match[1], 10)
    const language = match[2] || 'und'
    const codecType = match[3].toLowerCase() as MediaStreamInfo['codec_type']
    const codecName = match[4].replace(/,/g, '')

    console.log(`Found stream: index=${index}, type=${codecType}, codec=${codecName}, lang=${language}`)

    // Try to extract title from metadata following the stream line
    const titleMatch = log
      .slice(match.index)
      .match(/title\s*:\s*(.+)/i);

    console.log(`title=${titleMatch?.[1]?.trim() || 'N/A'}`)

    streams.push({
      index,
      codec_type: codecType,
      codec_name: codecName,
      tags: {
        language,
        title: titleMatch?.[1]?.trim(),
      },
      kept: true, // default: keep all streams
    })
  }

  console.log('Parsed streams:', streams);

  return streams
}
