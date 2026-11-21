export type PlatformType = 'youtube' | 'instagram' | 'whatsapp' | 'other';

export type MediaFormatType = 'video' | 'audio';

export interface MediaFormat {
  id: string;
  label: string;
  type: MediaFormatType;
  quality: string;
  ext: 'mp4' | 'mp3' | 'm4a' | 'webm' | 'jpg' | 'png' | string;
  sizeEstimate?: string;
  downloadUrl?: string;
  native?: boolean;
}

export interface MediaMetadata {
  url: string;
  platform: PlatformType;
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  duration?: string;
  views?: string;
  formats: MediaFormat[];
}

export interface DownloadedMedia {
  id: string;
  title: string;
  platform: PlatformType;
  format: MediaFormat;
  localUri: string;
  fileSize: number;
  createdAt: number;
  thumbnail?: string;
  duration?: string;
  savedToGallery: boolean;
}

export interface WhatsAppStatusItem {
  id: string;
  uri: string;
  name: string;
  type: 'image' | 'video';
  size?: number;
  timestamp?: number;
  thumbnailUri?: string;
  isSaved?: boolean;
}

export interface DownloadProgressInfo {
  percent: number; // 0 - 100
  downloadedBytes: number;
  totalBytes: number;
  speed?: string;
  status: 'idle' | 'fetching' | 'downloading' | 'completed' | 'error';
  errorMessage?: string;
}
