import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';
import { MediaMetadata } from '@/types/media';
import { PlatformBadge } from './PlatformBadge';

interface MediaPreviewCardProps {
  media: MediaMetadata;
}

export function MediaPreviewCard({ media }: MediaPreviewCardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}>
      <View style={styles.thumbnailWrapper}>
        <Image source={{ uri: media.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.badgeOverlay}>
          <PlatformBadge platform={media.platform} size="small" />
        </View>
        {media.duration && (
          <View style={styles.durationOverlay}>
            <Ionicons name="time-outline" size={11} color="#FFFFFF" />
            <Text style={styles.durationText}>{media.duration}</Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {media.title}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.authorRow}>
            <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>
              {media.author}
            </Text>
          </View>
          {media.views && (
            <Text style={[styles.views, { color: colors.textSecondary }]}>• {media.views}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnailWrapper: {
    width: '100%',
    height: 180,
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  durationOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  details: {
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  author: {
    fontSize: 12,
    fontWeight: '500',
  },
  views: {
    fontSize: 12,
  },
});
