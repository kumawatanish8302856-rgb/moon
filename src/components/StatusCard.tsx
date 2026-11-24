import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';
import { WhatsAppStatusItem } from '@/types/media';

interface StatusCardProps {
  item: WhatsAppStatusItem;
  onPress: () => void;
  onQuickSave: () => void;
}

export function StatusCard({ item, onPress, onQuickSave }: StatusCardProps) {
  const { colors } = useAppTheme();

  const imageSource = item.thumbnailUri || item.uri;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={{ uri: imageSource }} style={styles.thumbnail} resizeMode="cover" />

      {/* Video Indicator */}
      {item.type === 'video' && (
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={12} color="#FFFFFF" />
          <Text style={styles.videoBadgeText}>Video</Text>
        </View>
      )}

      {/* Quick Save floating button */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation?.();
          onQuickSave();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.quickSaveButton, { backgroundColor: colors.whatsapp }]}>
        <Ionicons name="arrow-down" size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    aspectRatio: 9 / 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  videoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  quickSaveButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});
