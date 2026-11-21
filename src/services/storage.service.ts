import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { DownloadedMedia } from '@/types/media';

const STORAGE_FILE = (FileSystem.documentDirectory ?? '') + 'downloads_index.json';
const WEB_STORAGE_KEY = 'moonflow_downloads_list';
const LEGACY_WEB_STORAGE_KEY = 'moonhub_downloads_list';

class StorageService {
  private cache: DownloadedMedia[] | null = null;

  async getDownloads(): Promise<DownloadedMedia[]> {
    if (this.cache) {
      return [...this.cache];
    }

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const item = window.localStorage.getItem(WEB_STORAGE_KEY) || window.localStorage.getItem(LEGACY_WEB_STORAGE_KEY);
          if (item) {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) {
              this.cache = parsed;
              return [...parsed];
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load web storage:', err);
      }
      this.cache = [];
      return [];
    }

    try {
      if (!FileSystem.documentDirectory) {
        return [];
      }

      const fileInfo = await FileSystem.getInfoAsync(STORAGE_FILE);
      if (!fileInfo.exists) {
        this.cache = [];
        return [];
      }

      const content = await FileSystem.readAsStringAsync(STORAGE_FILE);
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        this.cache = parsed;
        return [...parsed];
      }
      return [];
    } catch (e) {
      console.warn('Failed to load downloads storage file:', e);
      return [];
    }
  }

  async saveDownload(item: DownloadedMedia): Promise<void> {
    const list = await this.getDownloads();
    // Prepend new item
    const updated = [item, ...list.filter((x) => x.id !== item.id)];
    this.cache = updated;
    await this.persist(updated);
  }

  async deleteDownload(id: string): Promise<void> {
    const list = await this.getDownloads();
    const target = list.find((x) => x.id === id);

    // Try to remove local file from disk if it exists on native
    if (target?.localUri && Platform.OS !== 'web') {
      try {
        const info = await FileSystem.getInfoAsync(target.localUri);
        if (info.exists) {
          await FileSystem.deleteAsync(target.localUri, { idempotent: true });
        }
      } catch (err) {
        console.warn('Could not delete file from disk:', err);
      }
    }

    const updated = list.filter((x) => x.id !== id);
    this.cache = updated;
    await this.persist(updated);
  }

  async markSavedToGallery(id: string): Promise<void> {
    const list = await this.getDownloads();
    const updated = list.map((item) =>
      item.id === id ? { ...item, savedToGallery: true } : item
    );
    this.cache = updated;
    await this.persist(updated);
  }

  async clearAllDownloads(): Promise<void> {
    const list = await this.getDownloads();
    if (Platform.OS !== 'web') {
      for (const item of list) {
        if (item.localUri) {
          try {
            await FileSystem.deleteAsync(item.localUri, { idempotent: true });
          } catch {
            // ignore cleanup errors
          }
        }
      }
    }
    this.cache = [];
    await this.persist([]);
  }

  private async persist(list: DownloadedMedia[]): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(list));
        }
      } catch (e) {
        console.error('Failed to write downloads to web localStorage:', e);
      }
      return;
    }

    try {
      if (!FileSystem.documentDirectory) return;
      await FileSystem.writeAsStringAsync(STORAGE_FILE, JSON.stringify(list, null, 2));
    } catch (e) {
      console.error('Failed to write downloads to storage:', e);
    }
  }
}

export const storageService = new StorageService();
