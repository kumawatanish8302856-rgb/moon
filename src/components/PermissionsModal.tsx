import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';
import { permissionService, AppPermissionsStatus } from '@/services/permission.service';

interface PermissionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PermissionsModal({ visible, onClose }: PermissionsModalProps) {
  const { colors } = useAppTheme();

  const [status, setStatus] = useState<AppPermissionsStatus>({
    gallery: false,
    storage: false,
    clipboard: true,
    allGranted: false,
  });
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    const res = await permissionService.checkAllPermissions();
    setStatus(res);
  }, []);

  useEffect(() => {
    let active = true;
    if (visible) {
      permissionService.checkAllPermissions().then((res) => {
        if (active) {
          setStatus(res);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [visible]);

  const handleGrantGallery = async () => {
    setLoading(true);
    try {
      await permissionService.requestGalleryPermission();
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleGrantStorage = async () => {
    setLoading(true);
    try {
      await permissionService.requestStorageFolderAccess();
      await refreshStatus();
    } catch (error) {
      Alert.alert(
        'Storage Permission Error',
        error instanceof Error ? error.message : 'Could not access the WhatsApp Status folder.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAll = async () => {
    setLoading(true);
    try {
      await permissionService.requestAllPermissions();
      await refreshStatus();
    } catch (error) {
      Alert.alert(
        'Permission Error',
        error instanceof Error ? error.message : 'Could not grant app permissions.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>App Permissions</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              MOONFLOW needs permission to save media to your gallery and access WhatsApp status files.
            </Text>
          </View>

          {/* Permissions List */}
          <View style={styles.permissionList}>
            {/* 1. Gallery Permission */}
            <View
              style={[
                styles.itemCard,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}>
              <View style={[styles.itemIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="images" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>
                  Gallery & Photos
                </Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
                  Save videos and audio directly to your phone&apos;s camera roll
                </Text>
              </View>
              {status.gallery ? (
                <View style={[styles.grantedBadge, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={[styles.grantedText, { color: colors.success }]}>Allowed</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleGrantGallery}
                  disabled={loading}
                  style={[styles.grantBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.grantBtnText}>Grant</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 2. File Manager & Storage Access */}
            <View
              style={[
                styles.itemCard,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}>
              <View style={[styles.itemIcon, { backgroundColor: colors.whatsapp }]}>
                <Ionicons name="folder-open" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>
                  Storage & Status Folder
                </Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
                  {Platform.OS === 'android'
                    ? 'Access WhatsApp .Statuses directory to load and save statuses'
                    : 'Local app storage for downloaded media'}
                </Text>
              </View>
              {status.storage ? (
                <View style={[styles.grantedBadge, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={[styles.grantedText, { color: colors.success }]}>Allowed</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleGrantStorage}
                  disabled={loading}
                  style={[styles.grantBtn, { backgroundColor: colors.whatsapp }]}>
                  <Text style={styles.grantBtnText}>Link</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 3. Clipboard Access */}
            <View
              style={[
                styles.itemCard,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}>
              <View style={[styles.itemIcon, { backgroundColor: colors.youtube }]}>
                <Ionicons name="clipboard" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>
                  Clipboard Access
                </Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
                  1-tap paste button and automatic copied link detection
                </Text>
              </View>
              <View style={[styles.grantedBadge, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.grantedText, { color: colors.success }]}>Active</Text>
              </View>
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={styles.actions}>
            {!status.allGranted && (
              <TouchableOpacity
                onPress={handleGrantAll}
                disabled={loading}
                style={[styles.grantAllBtn, { backgroundColor: colors.primary }]}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.grantAllText}>Grant All Permissions</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>
                {status.allGranted ? 'Done' : 'Dismiss'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  permissionList: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextContainer: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  grantedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  grantBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  grantAllBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  grantAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
