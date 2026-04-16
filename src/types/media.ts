export interface MediaStreamInfo {
  index: number
  codec_type: 'video' | 'audio' | 'subtitle'
  codec_name: string
  tags: {
    language?: string
    title?: string
  }
  // Video
  width?: number
  height?: number
  frameRate?: string
  profile?: string
  // Audio
  channels?: string
  sampleRate?: number
  // Shared
  bitrate?: number // kbps
  kept: boolean
}

export interface ProbeData {
  streams: MediaStreamInfo[]
  duration?: string          // e.g. "01:23:45"
  fileSize: number           // bytes
  containerFormat: string    // e.g. "mp4", "mkv"
}

export interface HistoryEntry {
  id: string
  timestamp: number
  inputFileName: string
  inputFileSize: number
  inputFormat: string
  outputFormat: string
  duration?: string
  totalStreams: number
  keptStreams: number
  removedStreams: number
}

export type AppState =
  | { step: 'idle' }
  | { step: 'loading-ffmpeg' }
  | { step: 'probing'; fileName: string }
  | { step: 'selecting'; fileName: string; streams: MediaStreamInfo[] }
  | { step: 'processing'; fileName: string; progress: number }
  | { step: 'done'; fileName: string; outputUrl: string }
  | { step: 'error'; message: string }
