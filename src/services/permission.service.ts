import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';

export interface AppPermissionsStatus {
  gallery: boolean;
  storage: boolean;
  clipboard: boolean;
  allGranted: boolean;
}

const PERMISSIONS_FILE = (FileSystem.documentDirectory ?? '') + 'permissions_state.json';

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
      await this.saveState();
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
      // Check if we previously saved a granted SAF folder
      const info = await FileSystem.getInfoAsync(PERMISSIONS_FILE);
      if (info.exists) {
        const text = await FileSystem.readAsStringAsync(PERMISSIONS_FILE);
        const data = JSON.parse(text);
        if (data.storageGranted) return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  /**
   * Request Android File Manager / Storage Access Framework (SAF) folder
   */
  async requestStorageFolderAccess(): Promise<{ granted: boolean; directoryUri?: string }> {
    if (Platform.OS !== 'android') {
      return { granted: true };
    }

    try {
      const SAF = FileSystem.StorageAccessFramework;
      if (!SAF) return { granted: false };

      const initialUri = SAF.getUriForDirectoryInRoot(
        'Android/media/com.whatsapp/WhatsApp/Media/.Statuses'
      );
      const res = await SAF.requestDirectoryPermissionsAsync(initialUri);

      if (res.granted) {
        await this.saveState({ storageGranted: true, folderUri: res.directoryUri });
        return { granted: true, directoryUri: res.directoryUri };
      }
      return { granted: false };
    } catch (e) {
      console.warn('Storage permission error:', e);
      return { granted: false };
    }
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

  private async saveState(patch: Record<string, any> = {}) {
    if (Platform.OS === 'web') return;
    try {
      if (!FileSystem.documentDirectory) return;
      let current: Record<string, any> = {};
      const info = await FileSystem.getInfoAsync(PERMISSIONS_FILE);
      if (info.exists) {
        const text = await FileSystem.readAsStringAsync(PERMISSIONS_FILE);
        current = JSON.parse(text);
      }
      const updated = { ...current, ...patch, updatedAt: Date.now() };
      await FileSystem.writeAsStringAsync(PERMISSIONS_FILE, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}

export const permissionService = new PermissionService();
