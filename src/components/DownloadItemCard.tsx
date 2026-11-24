import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';
import { DownloadedMedia } from '@/types/media';
import { downloaderService } from '@/services/downloader.service';
import { storageService } from '@/services/storage.service';
import { PlatformBadge } from './PlatformBadge';

interface DownloadItemCardProps {
  item: DownloadedMedia;
  onPlay: (item: DownloadedMedia) => void;
  onDeleted: () => void;
}

export function DownloadItemCard({ item, onPlay, onDeleted }: DownloadItemCardProps) {
  const { colors } = useAppTheme();

  const [savingGallery, setSavingGallery] = useState(false);
  const [isSaved, setIsSaved] = useState(item.savedToGallery);

  const handleSaveToGallery = async () => {
    setSavingGallery(true);
    try {
      const ok = await downloaderService.saveToGallery(item.localUri);
      if (ok) {
        setIsSaved(true);
        await storageService.markSavedToGallery(item.id);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else {
        Alert.alert(
          'Gallery Permission',
          'Could not save to gallery. Please grant Storage/Photos permission in your phone settings.'
        );
      }
    } finally {
      setSavingGallery(false);
    }
  };

  const handleShare = async () => {
    await downloaderService.shareMedia(
      item.localUri,
      item.format.type === 'video' ? 'video/mp4' : 'audio/mp3'
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Download',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await storageService.deleteDownload(item.id);
            onDeleted();
          },
        },
      ]
    );
  };

  const formattedSize = (item.fileSize / (1024 * 1024)).toFixed(1) + ' MB';
  const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}>
      <TouchableOpacity
        onPress={() => onPlay(item)}
        activeOpacity={0.8}
        style={styles.mainContent}>
        {/* Thumbnail or Icon */}
        <View style={styles.thumbnailWrapper}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.iconPlaceholder,
                { backgroundColor: colors.backgroundElement },
              ]}>
              <Ionicons
                name={item.format.type === 'video' ? 'videocam' : 'musical-notes'}
                size={24}
                color={colors.primary}
              />
            </View>
          )}
          <View style={styles.playOverlay}>
            <Ionicons name="play" size={14} color="#FFFFFF" />
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            <PlatformBadge platform={item.platform} size="small" />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.format.label} • {formattedSize}
            </Text>
          </View>

          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            Downloaded on {dateStr}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Action Row */}
      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={() => onPlay(item)} style={styles.actionButton}>
          <Ionicons name="play-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Play</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
          <Ionicons name="share-social-outline" size={17} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSaveToGallery}
          disabled={isSaved || savingGallery}
          style={styles.actionButton}>
          {savingGallery ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons
                name={isSaved ? 'checkmark-circle' : 'images-outline'}
                size={17}
                color={isSaved ? colors.success : colors.textSecondary}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: isSaved ? colors.success : colors.textSecondary },
                ]}>
                {isSaved ? 'In Gallery' : 'Gallery'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={17} color={colors.error} />
          <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mainContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  thumbnailWrapper: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
