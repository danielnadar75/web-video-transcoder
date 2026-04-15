export interface MediaStreamInfo {
  index: number
  codec_type: 'video' | 'audio' | 'subtitle'
  codec_name: string
  tags: {
    language?: string
    title?: string
  }
  channels?: number
  sample_rate?: string
  width?: number
  height?: number
  kept: boolean
}

export interface ProbeResult {
  streams: MediaStreamInfo[]
}

export type AppState =
  | { step: 'idle' }
  | { step: 'loading-ffmpeg' }
  | { step: 'probing'; fileName: string }
  | { step: 'selecting'; fileName: string; streams: MediaStreamInfo[] }
  | { step: 'processing'; fileName: string; progress: number }
  | { step: 'done'; fileName: string; outputUrl: string }
  | { step: 'error'; message: string }
