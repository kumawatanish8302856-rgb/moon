import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { WhatsAppStatusItem } from '@/types/media';
import { storageService } from './storage.service';

class StatusSaverService {
  /**
   * Android 11+ SAF directory URI for WhatsApp Statuses
   */
  async requestAndroidFolderAccess(): Promise<{ granted: boolean; directoryUri?: string }> {
    if (Platform.OS !== 'android') {
      return { granted: false };
    }

    try {
      const SAF = FileSystem.StorageAccessFramework;
      if (!SAF) {
        return { granted: false };
      }

      const initialUri = SAF.getUriForDirectoryInRoot(
        'Android/media/com.whatsapp/WhatsApp/Media/.Statuses'
      );

      const permission = await SAF.requestDirectoryPermissionsAsync(initialUri);
      return {
        granted: permission.granted,
        directoryUri: permission.granted ? permission.directoryUri : undefined,
      };
    } catch (e) {
      console.warn('Error requesting SAF permissions:', e);
      return { granted: false };
    }
  }

  /**
   * Scans a SAF directory for WhatsApp status media files (.jpg, .mp4)
   */
  async loadFromDirectory(directoryUri: string): Promise<WhatsAppStatusItem[]> {
    if (Platform.OS !== 'android') {
      return [];
    }

    try {
      const SAF = FileSystem.StorageAccessFramework;
      if (!SAF) return [];

      const fileUris = await SAF.readDirectoryAsync(directoryUri);
      const items: WhatsAppStatusItem[] = [];

      for (const uri of fileUris) {
        const decoded = decodeURIComponent(uri);
        const isVideo = decoded.endsWith('.mp4') || decoded.endsWith('.3gp');
        const isImage =
          decoded.endsWith('.jpg') ||
          decoded.endsWith('.jpeg') ||
          decoded.endsWith('.png') ||
          decoded.endsWith('.webp');

        if (isVideo || isImage) {
          const parts = decoded.split('/');
          const filename = parts[parts.length - 1] || `status_${Date.now()}`;

          items.push({
            id: uri,
            name: filename,
            uri,
            type: isVideo ? 'video' : 'image',
            timestamp: Date.now(),
            isSaved: false,
          });
        }
      }

      return items;
    } catch (e) {
      console.warn('Failed reading WhatsApp status directory:', e);
      return [];
    }
  }

  /**
   * Copies file to app storage and registers in downloads library
   */
  async saveStatusLocally(item: WhatsAppStatusItem): Promise<string> {
    const ext = item.type === 'video' ? 'mp4' : 'jpg';
    const filename = `whatsapp_status_${Date.now()}.${ext}`;

    if (Platform.OS === 'web') {
      return item.uri;
    }

    const destination = `${FileSystem.documentDirectory}${filename}`;

    try {
      if (item.uri.startsWith('content://')) {
        await FileSystem.copyAsync({
          from: item.uri,
          to: destination,
        });
      } else {
        await FileSystem.copyAsync({
          from: item.uri,
          to: destination,
        });
      }

      const fileInfo = await FileSystem.getInfoAsync(destination);
      const size = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : item.size || 0;

      let savedToGallery = false;
      try {
        savedToGallery = await this.saveToGallery(destination);
      } catch (galleryErr) {
        console.warn('Auto save status to gallery error:', galleryErr);
      }

      await storageService.saveDownload({
        id: `wa_${Date.now()}`,
        title: item.name || 'WhatsApp Status',
        platform: 'whatsapp',
        format: {
          id: `status-${ext}`,
          label: item.type === 'video' ? 'Status Video' : 'Status Photo',
          type: item.type === 'video' ? 'video' : 'audio',
          quality: 'Original',
          ext,
          sizeEstimate: size ? `${(size / (1024 * 1024)).toFixed(1)} MB` : undefined,
        },
        localUri: destination,
        fileSize: size,
        createdAt: Date.now(),
        thumbnail: item.thumbnailUri || (item.type === 'image' ? item.uri : undefined),
        duration: item.type === 'video' ? '00:30' : undefined,
        savedToGallery,
      });

      return destination;
    } catch (err) {
      console.error('Error saving status locally:', err);
      throw err;
    }
  }

  /**
   * Saves status directly to user's photo gallery
   */
  async saveToGallery(localUriOrRemote: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = localUriOrRemote;
        a.download = `status_${Date.now()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return true;
    }

    try {
      let perm = await MediaLibrary.getPermissionsAsync(true);
      if (!perm.granted) {
        perm = await MediaLibrary.requestPermissionsAsync(true);
      }
      if (!perm.granted) {
        perm = await MediaLibrary.requestPermissionsAsync();
      }

      if (!perm.granted) {
        console.warn('Storage/Gallery permission was not granted.');
        return false;
      }

      let fileToSave = localUriOrRemote;

      if (localUriOrRemote.startsWith('http')) {
        const tempUri = `${FileSystem.cacheDirectory}temp_save_${Date.now()}.jpg`;
        const res = await FileSystem.downloadAsync(localUriOrRemote, tempUri);
        fileToSave = res.uri;
      }

      const formattedUri = fileToSave.startsWith('file://') ? fileToSave : `file://${fileToSave}`;
      const asset = await MediaLibrary.createAssetAsync(formattedUri);

      try {
        let album = await MediaLibrary.getAlbumAsync('MOONFLOW');
        if (album === null) {
          await MediaLibrary.createAlbumAsync('MOONFLOW', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      } catch (albumErr) {
        console.log('Saved status to primary gallery (album optional):', albumErr);
      }

      return true;
    } catch (e) {
      console.warn('Failed saving status to gallery:', e);
      return false;
    }
  }

  /**
   * Reposts or shares status with friends
   */
  async shareStatus(localUri: string, mimeType: string = 'image/jpeg'): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: 'WhatsApp Status',
            url: localUri,
          });
          return true;
        } catch {
          // ignore
        }
      }
      if (typeof window !== 'undefined') {
        window.open(localUri, '_blank');
      }
      return true;
    }

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) return false;
      await Sharing.shareAsync(localUri, { mimeType, dialogTitle: 'Share Status' });
      return true;
    } catch (e) {
      console.warn('Failed to share status:', e);
      return false;
    }
  }
}

export const statusSaverService = new StatusSaverService();
