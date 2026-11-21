import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { DownloadedMedia, DownloadProgressInfo } from '@/types/media';
import { downloaderService } from '@/services/downloader.service';
import { storageService } from '@/services/storage.service';

interface DownloadProgressModalProps {
  visible: boolean;
  progress: DownloadProgressInfo;
  completedItem: DownloadedMedia | null;
  onClose: () => void;
  onViewDownloads: () => void;
}

export function DownloadProgressModal({
  visible,
  progress,
  completedItem,
  onClose,
  onViewDownloads,
}: DownloadProgressModalProps) {
  const { colors } = useAppTheme();

  const [savingToGallery, setSavingToGallery] = useState(false);
  const [manuallySaved, setManuallySaved] = useState(false);

  const gallerySaved = Boolean(completedItem?.savedToGallery || manuallySaved);

  const handleSaveToGallery = async () => {
    if (!completedItem) return;
    setSavingToGallery(true);
    try {
      const ok = await downloaderService.saveToGallery(completedItem.localUri);
      if (ok) {
        setManuallySaved(true);
        await storageService.markSavedToGallery(completedItem.id);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else {
        Alert.alert(
          'Gallery Permission',
          'Could not save to gallery. Please allow storage or media access in your phone settings.'
        );
      }
    } finally {
      setSavingToGallery(false);
    }
  };

  const handleShare = async () => {
    if (!completedItem) return;
    await downloaderService.shareMedia(
      completedItem.localUri,
      completedItem.format.type === 'video' ? 'video/mp4' : 'audio/mp3'
    );
  };

  const isCompleted = progress.status === 'completed';
  const isError = progress.status === 'error';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header Icon */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isCompleted
                  ? colors.success + '20'
                  : isError
                  ? colors.error + '20'
                  : colors.primary + '20',
              },
            ]}>
            <Ionicons
              name={
                isCompleted
                  ? 'checkmark-circle'
                  : isError
                  ? 'alert-circle'
                  : 'cloud-download-outline'
              }
              size={36}
              color={isCompleted ? colors.success : isError ? colors.error : colors.primary}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isCompleted
              ? 'Download Complete!'
              : isError
              ? 'Download Failed'
              : 'Downloading Media...'}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {isCompleted && completedItem
              ? completedItem.title
              : isError
              ? progress.errorMessage || 'An error occurred during download.'
              : 'Saving file to device storage. Please wait a moment.'}
          </Text>

          {/* Progress Bar (when downloading) */}
          {!isCompleted && !isError && (
            <View style={styles.progressContainer}>
              <View style={styles.statsRow}>
                <View style={styles.amountBox}>
                  <Text style={[styles.downloadAmountNumber, { color: colors.primary }]}>
                    {(progress.downloadedBytes / (1024 * 1024)).toFixed(1)} MB
                  </Text>
                  {progress.totalBytes > 0 && (
                    <Text style={[styles.downloadTotalText, { color: colors.textSecondary }]}>
                      {' '}of {(progress.totalBytes / (1024 * 1024)).toFixed(1)} MB
                    </Text>
                  )}
                </View>

                <View style={[styles.percentBadge, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[styles.percentText, { color: colors.primary }]}>
                    {progress.percent}%
                  </Text>
                </View>
              </View>

              <View style={[styles.progressBarBg, { backgroundColor: colors.backgroundElement }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(5, progress.percent))}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Actions when completed */}
          {isCompleted && completedItem && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleSaveToGallery}
                disabled={gallerySaved || savingToGallery}
                style={[
                  styles.primaryActionButton,
                  {
                    backgroundColor: gallerySaved ? colors.success : colors.primary,
                  },
                ]}>
                {savingToGallery ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={gallerySaved ? 'checkmark-circle' : 'images-outline'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.primaryActionText}>
                      {gallerySaved ? 'Saved to Gallery!' : 'Save to Gallery'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity
                  onPress={handleShare}
                  style={[styles.secondaryButton, { backgroundColor: colors.backgroundElement }]}>
                  <Ionicons name="share-social-outline" size={16} color={colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onViewDownloads();
                  }}
                  style={[styles.secondaryButton, { backgroundColor: colors.backgroundElement }]}>
                  <Ionicons name="folder-open-outline" size={16} color={colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>View File</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Close Button */}
          {(isCompleted || isError) && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  progressContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 10,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  downloadAmountNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  downloadTotalText: {
    fontSize: 13,
    fontWeight: '600',
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtons: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  primaryActionButton: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 13,
  },
  closeButton: {
    marginTop: 14,
    padding: 6,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
