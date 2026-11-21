import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { WhatsAppStatusItem } from '@/types/media';
import { statusSaverService } from '@/services/status-saver.service';

interface StatusPreviewModalProps {
  item: WhatsAppStatusItem | null;
  visible: boolean;
  onClose: () => void;
  onSavedSuccess?: () => void;
}

function VideoPlayerWrapper({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      style={styles.mediaContent}
      player={player}
      nativeControls
      contentFit="contain"
    />
  );
}

export function StatusPreviewModal({
  item,
  visible,
  onClose,
  onSavedSuccess,
}: StatusPreviewModalProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!item) return null;

  const handleSaveToGallery = async () => {
    setSaving(true);
    try {
      // Save locally first to ensure persisted record
      const localFile = await statusSaverService.saveStatusLocally(item);
      // Then save directly to device gallery
      const ok = await statusSaverService.saveToGallery(localFile);
      if (ok) {
        setSaved(true);
        onSavedSuccess?.();
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else {
        Alert.alert(
          'Gallery Permission',
          'Could not save status to gallery. Please grant Storage/Photos permission in your phone settings.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const local = await statusSaverService.saveStatusLocally(item);
      await statusSaverService.shareStatus(
        local,
        item.type === 'video' ? 'video/mp4' : 'image/jpeg'
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.roundButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>
          <TouchableOpacity onPress={handleShare} disabled={sharing} style={styles.roundButton}>
            {sharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Center Media View */}
        <View style={styles.mediaContainer}>
          {item.type === 'video' ? (
            <VideoPlayerWrapper uri={item.uri} />
          ) : (
            <Image source={{ uri: item.uri }} style={styles.mediaContent} resizeMode="contain" />
          )}
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            onPress={handleSaveToGallery}
            disabled={saving || saved}
            style={[styles.saveButton, saved && styles.savedButton]}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={saved ? 'checkmark-circle' : 'download-outline'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.saveButtonText}>
                  {saved ? 'Saved to Gallery' : 'Save to Gallery'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContent: {
    width: '100%',
    height: '100%',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  saveButton: {
    backgroundColor: '#25D366',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  savedButton: {
    backgroundColor: '#10B981',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
