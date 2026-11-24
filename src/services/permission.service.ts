import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Clipboard from 'expo-clipboard';
import { statusSaverService } from './status-saver.service';

export interface AppPermissionsStatus {
  gallery: boolean;
  storage: boolean;
  clipboard: boolean;
  allGranted: boolean;
}

class PermissionService {
  /**
   * Check status of all required permissions
   */
  async checkAllPermissions(): Promise<AppPermissionsStatus> {
    const gallery = await this.checkGalleryPermission();
    const storage = await this.checkStoragePermission();
    const clipboard = await this.checkClipboardPermission();

    return {
      gallery,
      storage,
      clipboard,
      allGranted: gallery && storage && clipboard,
    };
  }

  /**
   * Gallery (Media Library) permission check
   */
  async checkGalleryPermission(): Promise<boolean> {
    try {
      const res = await MediaLibrary.getPermissionsAsync(true);
      if (res.granted) return true;
      const resFull = await MediaLibrary.getPermissionsAsync();
      return resFull.granted;
    } catch {
      return false;
    }
  }

  /**
   * Request Gallery permission
   */
  async requestGalleryPermission(): Promise<boolean> {
    try {
      let res = await MediaLibrary.requestPermissionsAsync(true);
      if (!res.granted) {
        res = await MediaLibrary.requestPermissionsAsync();
      }
      return res.granted;
    } catch {
      return false;
    }
  }

  /**
   * File Manager & Storage Access check
   */
  async checkStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS sandboxed storage doesn't require SAF
    }

    try {
      return Boolean(await statusSaverService.getSavedFolderUri());
    } catch (error) {
      console.warn('Failed checking WhatsApp status folder access:', error);
      return false;
    }
  }

  /**
   * Request Android File Manager / Storage Access Framework (SAF) folder
   */
  async requestStorageFolderAccess(): Promise<{ granted: boolean; directoryUri?: string }> {
    if (Platform.OS !== 'android') {
      return { granted: true };
    }

    return statusSaverService.requestAndroidFolderAccess();
  }

  /**
   * Clipboard permission / readiness check
   */
  async checkClipboardPermission(): Promise<boolean> {
    try {
      await Clipboard.hasStringAsync();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Request all permissions sequentially
   */
  async requestAllPermissions(): Promise<AppPermissionsStatus> {
    await this.requestGalleryPermission();
    if (Platform.OS === 'android') {
      await this.requestStorageFolderAccess();
    }
    await this.checkClipboardPermission();

    return this.checkAllPermissions();
  }
}

export const permissionService = new PermissionService();
