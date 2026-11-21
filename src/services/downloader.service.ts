import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { DownloadedMedia, MediaFormat, MediaMetadata, PlatformType } from '@/types/media';
import { storageService } from './storage.service';

export interface UrlValidationResult {
  valid: boolean;
  platform: PlatformType;
  id?: string;
  cleanUrl: string;
  errorMessage?: string;
}

export interface ProgressCallback {
  (progress: { percent: number; downloadedBytes: number; totalBytes: number; speed?: string }): void;
}

/**
 * Automatically resolves the backend server URL:
 * - On Web: uses the current window hostname on port 8000 (e.g. http://localhost:8000)
 * - In Expo development (physical devices): extracts the Metro server host IP dynamically from Constants
 * - Fallback: 10.0.2.2 for Android Emulator, localhost for iOS simulator
 */
export function resolveDefaultBackendUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // 0. On Web: always connect to the local/serving host on port 8000
  // (unless an explicit production https URL is provided in EXPO_PUBLIC_API_URL)
  if (Platform.OS === 'web') {
    if (envUrl && envUrl.startsWith('https://')) {
      return envUrl.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:8000`;
    }
    return 'http://localhost:8000';
  }

  // 1. In native Expo development (physical devices over LAN):
  // Constants.expoConfig?.hostUri dynamically provides the Metro server host IP (e.g. "192.168.20.147:8081").
  // This automatically keeps in sync with Wi-Fi IP changes without requiring manual .env edits.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000`;
    }
  }

  // 2. Explicit environment variable (e.g. deployed cloud backend or manual LAN override)
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // 3. Android emulator uses 10.0.2.2, iOS simulator uses localhost
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}

class DownloaderService {
  private backendUrl: string = resolveDefaultBackendUrl();

  // In-memory cache for /info prefetching (stores parsed metadata)
  private infoCache = new Map<string, MediaMetadata>();

  // In-flight promises to prevent duplicate simultaneous fetches
  private prefetchPromises = new Map<string, Promise<MediaMetadata | null>>();

  setBackendUrl(url: string) {
    this.backendUrl = url.replace(/\/+$/, '');
  }

  getBackendUrl(): string {
    return this.backendUrl;
  }

  /**
   * Checks whether the backend server is reachable, with automatic localhost fallback on web
   */
  async checkBackendHealth(): Promise<{ ok: boolean; url: string; error?: string }> {
    const tryPing = async (targetUrl: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(`${targetUrl}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          return { ok: true, url: targetUrl };
        }
        return { ok: false, url: targetUrl, error: `HTTP ${res.status}` };
      } catch (e: any) {
        clearTimeout(timeoutId);
        return { ok: false, url: targetUrl, error: e?.message || 'Connection failed' };
      }
    };

    // 1. Try current configured backendUrl
    let result = await tryPing(this.backendUrl);
    if (result.ok) {
      return result;
    }

    // 2. On web, if configured URL failed (e.g. stale IP from .env), test localhost fallback
    if (Platform.OS === 'web') {
      const fallbackUrl = 'http://localhost:8000';
      if (this.backendUrl !== fallbackUrl) {
        const fallbackResult = await tryPing(fallbackUrl);
        if (fallbackResult.ok) {
          this.backendUrl = fallbackUrl;
          return fallbackResult;
        }
      }
    }

    return result;
  }

  /**
   * Validates and identifies the platform from the user's input URL.
   * Robustly extracts URLs from shared messages, handles missing protocols,
   * YouTube variants (watch, shorts, live, embed, youtu.be, music),
   * and Instagram variants (reel, reels, share/reel, share/p, p, tv).
   */
  validateUrl(input: string): UrlValidationResult {
    if (!input || typeof input !== 'string') {
      return { valid: false, platform: 'other', cleanUrl: '', errorMessage: 'Please enter a URL' };
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return { valid: false, platform: 'other', cleanUrl: '', errorMessage: 'Please enter a URL' };
    }

    // 1. Extract URL if user pasted text containing a link (e.g. from share sheet)
    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const match = trimmed.match(urlRegex);
    let rawUrl = match ? match[1] : trimmed;

    // Remove common trailing punctuation that might get attached from text
    rawUrl = rawUrl.replace(/[.,;:!?)>]+$/, '');

    // Add https:// if user pasted domain without protocol
    if (!/^https?:\/\//i.test(rawUrl)) {
      if (/^(www\.)?(youtube\.com|youtu\.be|instagram\.com|instagr\.am|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.watch)/i.test(rawUrl)) {
        rawUrl = 'https://' + rawUrl;
      }
    }

    // 2. YouTube Detection & ID Extraction
    const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:shorts\/|live\/|embed\/|v\/|watch\?(?:.*&)?v=))([a-zA-Z0-9_-]{11})/i;
    const ytMatch = rawUrl.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
      return {
        valid: true,
        platform: 'youtube',
        id: ytMatch[1],
        cleanUrl: `https://www.youtube.com/watch?v=${ytMatch[1]}`,
      };
    }

    // 3. Instagram Detection & Shortcode Extraction
    const instaRegex = /(?:instagram\.com|instagr\.am)\/(?:share\/)?(?:reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i;
    const instaMatch = rawUrl.match(instaRegex);
    if (instaMatch && instaMatch[1]) {
      return {
        valid: true,
        platform: 'instagram',
        id: instaMatch[1],
        cleanUrl: `https://www.instagram.com/reel/${instaMatch[1]}/`,
      };
    }

    // Generic Instagram URL
    if (/instagram\.com|instagr\.am/i.test(rawUrl) && /^https?:\/\//i.test(rawUrl)) {
      return {
        valid: true,
        platform: 'instagram',
        cleanUrl: rawUrl,
      };
    }

    // 4. Other valid URLs (TikTok, Twitter/X, Facebook, etc.)
    if (/^https?:\/\//i.test(rawUrl)) {
      let platform: PlatformType = 'other';
      if (/tiktok\.com/i.test(rawUrl)) platform = 'other';
      else if (/twitter\.com|x\.com/i.test(rawUrl)) platform = 'other';
      else if (/facebook\.com|fb\.watch/i.test(rawUrl)) platform = 'other';

      return {
        valid: true,
        platform,
        cleanUrl: rawUrl,
      };
    }

    return {
      valid: false,
      platform: 'other',
      cleanUrl: trimmed,
      errorMessage: 'Invalid link. Please paste a valid YouTube or Instagram link.',
    };
  }

  /**
   * PRIORITY 1: Prefetch /info automatically as soon as a valid link is pasted or detected.
   * Returns a promise that resolves safely without throwing unhandled rejections if offline.
   */
  prefetchMediaInfo(rawUrl: string): Promise<MediaMetadata | null> {
    const validation = this.validateUrl(rawUrl);
    if (!validation.valid) return Promise.resolve(null);

    const key = validation.cleanUrl;

    if (this.infoCache.has(key)) {
      return Promise.resolve(this.infoCache.get(key)!);
    }

    if (this.prefetchPromises.has(key)) {
      return this.prefetchPromises.get(key)!;
    }

    const promise = this.fetchMediaInfo(validation)
      .then((data) => {
        this.infoCache.set(key, data);
        return data;
      })
      .catch((err) => {
        // Prefetch is silent background optimization - fail quietly without throwing unhandled rejection
        console.warn('Background prefetch failed:', err?.message || err);
        return null;
      })
      .finally(() => {
        this.prefetchPromises.delete(key);
      });

    this.prefetchPromises.set(key, promise);
    return promise;
  }

  /**
   * Fetches media metadata from FastAPI backend
   */
  async fetchMediaInfo(validation: UrlValidationResult): Promise<MediaMetadata> {
    if (!validation.valid) {
      throw new Error(validation.errorMessage || 'Invalid URL');
    }

    const key = validation.cleanUrl;
    if (this.infoCache.has(key)) {
      return this.infoCache.get(key)!;
    }

    // If prefetch is already in flight for this key, await it
    if (this.prefetchPromises.has(key)) {
      try {
        const prefetched = await this.prefetchPromises.get(key);
        if (prefetched) {
          return prefetched;
        }
      } catch {
        // Fall through to direct fetch
      }
    }

    const serverUrl = `${this.backendUrl}/info?url=${encodeURIComponent(validation.cleanUrl)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(serverUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData.detail) errorMsg = errData.detail;
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const mappedFormats: MediaFormat[] = (data.formats || []).map((f: any) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        quality: f.quality,
        ext: f.ext,
        sizeEstimate: f.size_estimate || undefined,
        native: f.native !== undefined ? f.native : true,
        downloadUrl: `${this.backendUrl}/download?url=${encodeURIComponent(validation.cleanUrl)}&format_id=${f.id}&convert_mp3=${f.ext === 'mp3'}`,
      }));

      const result: MediaMetadata = {
        url: data.url,
        platform: data.platform as PlatformType,
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail,
        author: data.author,
        duration: data.duration,
        views: data.views,
        formats: mappedFormats,
      };

      this.infoCache.set(key, result);
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out while fetching media info from backend.');
      }
      if (
        err.message &&
        (err.message.includes('Network request failed') ||
          err.message.includes('Failed to fetch') ||
          err.message.includes('Cannot connect'))
      ) {
        throw new Error(
          `Cannot reach MOONFLOW backend at ${this.backendUrl}. Please ensure the FastAPI server is running.`
        );
      }
      throw err;
    }
  }

  /**
   * Universal Download: Works seamlessly on both Native (Android/iOS) and Web
   */
  async startDownload(
    media: MediaMetadata,
    format: MediaFormat,
    onProgress: ProgressCallback
  ): Promise<DownloadedMedia> {
    const cleanName = media.title
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .trim()
      .slice(0, 32);
    const cleanQuality = (format.quality || 'media').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const timestamp = Date.now();
    const fileName = `${media.platform}_${cleanName}_${cleanQuality}_${timestamp}.${format.ext}`.replace(/_+/g, '_');

    const sourceUrl =
      format.downloadUrl ||
      `${this.backendUrl}/download?url=${encodeURIComponent(media.url)}&format_id=${format.id}&convert_mp3=${format.ext === 'mp3'}`;

    // Handle Web environment
    if (Platform.OS === 'web') {
      return this.startWebDownload(media, format, sourceUrl, fileName, timestamp, onProgress);
    }

    // Estimate bytes from format metadata if available
    let estimatedBytes = 0;
    if (format.sizeEstimate) {
      const numMatch = format.sizeEstimate.match(/([\d\.]+)/);
      if (numMatch) {
        const mb = parseFloat(numMatch[1]);
        if (!isNaN(mb) && mb > 0) {
          estimatedBytes = Math.round(mb * 1024 * 1024);
        }
      }
    }

    // Native Android & iOS (using FileSystem.createDownloadResumable with downloadAsync fallback)
    const destinationUri = `${FileSystem.documentDirectory}${fileName}`;

    let localUri = destinationUri;

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        sourceUrl,
        destinationUri,
        {},
        (downloadProgress) => {
          let total = downloadProgress.totalBytesExpectedToWrite;
          const current = downloadProgress.totalBytesWritten;
          if (total <= 0 && estimatedBytes > 0) {
            total = estimatedBytes;
          }
          const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 50;
          onProgress({
            percent,
            downloadedBytes: current,
            totalBytes: total > 0 ? total : current,
          });
        }
      );

      try {
        const result = await downloadResumable.downloadAsync();
        localUri = result?.uri || destinationUri;
      } catch (resumableErr) {
        console.warn('createDownloadResumable threw, trying direct FileSystem.downloadAsync fallback:', resumableErr);
        const directResult = await FileSystem.downloadAsync(sourceUrl, destinationUri);
        localUri = directResult?.uri || destinationUri;
      }

      const info = await FileSystem.getInfoAsync(localUri);
      const fileSize = info.exists && 'size' in info ? info.size : 1024 * 1024 * 10;

      // Automatically save to Gallery on native mobile when download completes
      let savedToGallery = false;
      try {
        savedToGallery = await this.saveToGallery(localUri);
      } catch (saveErr) {
        console.warn('Auto save to gallery error:', saveErr);
      }

      const record: DownloadedMedia = {
        id: `dl_${timestamp}`,
        title: media.title,
        platform: media.platform,
        format,
        localUri,
        fileSize,
        createdAt: timestamp,
        thumbnail: media.thumbnail,
        duration: media.duration,
        savedToGallery,
      };

      await storageService.saveDownload(record);
      return record;
    } catch (err) {
      console.error('Download error:', err);
      throw err;
    }
  }

  /**
   * Browser-safe Web download implementation
   */
  private async startWebDownload(
    media: MediaMetadata,
    format: MediaFormat,
    sourceUrl: string,
    fileName: string,
    timestamp: number,
    onProgress: ProgressCallback
  ): Promise<DownloadedMedia> {
    const isVideo = format.type === 'video';
    const mimeType = isVideo ? 'video/mp4' : 'audio/mp3';

    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        let errorDetail = '';
        try {
          const errJson = await response.json();
          errorDetail = errJson.detail || '';
        } catch {
          errorDetail = await response.text().catch(() => '');
        }
        throw new Error(errorDetail || `Download failed: Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No stream body received from backend server');
      }

      let estimatedBytes = 0;
      if (format.sizeEstimate) {
        const numMatch = format.sizeEstimate.match(/([\d\.]+)/);
        if (numMatch) {
          const mb = parseFloat(numMatch[1]);
          if (!isNaN(mb) && mb > 0) {
            estimatedBytes = Math.round(mb * 1024 * 1024);
          }
        }
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : estimatedBytes;
      let loaded = 0;

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          const percent = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 50;
          onProgress({
            percent,
            downloadedBytes: loaded,
            totalBytes: total > 0 ? total : loaded,
          });
        }
      }

      const blob = new Blob(chunks as any[], { type: mimeType });
      const downloadedUri = URL.createObjectURL(blob);
      const fileSize = loaded || blob.size;

      // Auto trigger direct browser file download
      if (typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = downloadedUri;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      const record: DownloadedMedia = {
        id: `dl_${timestamp}`,
        title: media.title,
        platform: media.platform,
        format,
        localUri: downloadedUri,
        fileSize,
        createdAt: timestamp,
        thumbnail: media.thumbnail,
        duration: media.duration,
        savedToGallery: true,
      };

      await storageService.saveDownload(record);
      return record;
    } catch (err: any) {
      console.warn('Web streaming download interrupted, falling back to direct browser download:', err?.message || err);

      // Graceful fallback: trigger native browser download directly via backend stream URL
      if (typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = sourceUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        const record: DownloadedMedia = {
          id: `dl_${timestamp}`,
          title: media.title,
          platform: media.platform,
          format,
          localUri: sourceUrl,
          fileSize: 0,
          createdAt: timestamp,
          thumbnail: media.thumbnail,
          duration: media.duration,
          savedToGallery: true,
        };

        await storageService.saveDownload(record);
        return record;
      }

      throw new Error(err?.message || 'Download failed. Please check backend connection.');
    }
  }

  async saveToGallery(localUri: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      try {
        if (typeof document !== 'undefined') {
          const a = document.createElement('a');
          a.href = localUri;
          a.download = `media_${Date.now()}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return true;
      } catch {
        return true;
      }
    }

    try {
      // 1. Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        console.warn('Cannot save to gallery: file does not exist at', localUri);
        return false;
      }

      // 2. Request permissions (try writeOnly first for modern Android compliance)
      let perm = await MediaLibrary.getPermissionsAsync(true);
      if (!perm.granted) {
        perm = await MediaLibrary.requestPermissionsAsync(true);
      }
      if (!perm.granted) {
        // Fallback to general permission request
        perm = await MediaLibrary.requestPermissionsAsync();
      }

      if (!perm.granted) {
        console.warn('Storage/Gallery permission was not granted.');
        return false;
      }

      // 3. Ensure valid file:// protocol format
      const formattedUri = localUri.startsWith('file://') ? localUri : `file://${localUri}`;

      // 4. Create asset in device media storage
      const asset = await MediaLibrary.createAssetAsync(formattedUri);

      // 5. Organize into dedicated 'MOONFLOW' album in Gallery
      try {
        let album = await MediaLibrary.getAlbumAsync('MOONFLOW');
        if (album === null) {
          await MediaLibrary.createAlbumAsync('MOONFLOW', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      } catch (albumError) {
        // Scoped storage on some Android versions may restrict custom album creation,
        // but createAssetAsync has already successfully saved it to DCIM/Gallery
        console.log('Saved to main gallery (album optional):', albumError);
      }

      return true;
    } catch (e) {
      console.warn('Failed to save to gallery:', e);
      return false;
    }
  }

  async shareMedia(localUri: string, mimeType?: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: 'Shared Media',
            url: localUri,
          });
          return true;
        } catch {
          // ignore share cancel
        }
      }
      if (typeof window !== 'undefined') {
        window.open(localUri, '_blank');
      }
      return true;
    }

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        return false;
      }
      await Sharing.shareAsync(localUri, {
        mimeType: mimeType || 'video/mp4',
        dialogTitle: 'Share with friends',
      });
      return true;
    } catch (e) {
      console.warn('Failed to share:', e);
      return false;
    }
  }
}

export const downloaderService = new DownloaderService();
