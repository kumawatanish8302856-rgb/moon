import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { DownloadedMedia } from '@/types/media';

interface MediaPlayerModalProps {
  item: DownloadedMedia | null;
  visible: boolean;
  onClose: () => void;
}

function PlayerContent({ item }: { item: DownloadedMedia }) {
  const isVideo = item.format.type === 'video';
  const player = useVideoPlayer(item.localUri, (p) => {
    p.play();
  });

  return (
    <View style={styles.playerContainer}>
      {isVideo ? (
        <VideoView
          style={styles.video}
          player={player}
          nativeControls
          contentFit="contain"
        />
      ) : (
        <View style={styles.audioWrapper}>
          <View style={styles.audioCircle}>
            <Ionicons name="musical-notes" size={60} color="#6366F1" />
          </View>
          <Text style={styles.audioTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.audioSubtitle}>{item.format.label}</Text>
          <VideoView style={styles.audioMiniController} player={player} />
        </View>
      )}
    </View>
  );
}

export function MediaPlayerModal({ item, visible, onClose }: MediaPlayerModalProps) {
  if (!item) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="slide">
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.titleArea}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.headerSubtitle}>
              {item.format.label} • {item.platform.toUpperCase()}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <PlayerContent item={item} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#131B2E',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  playerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  audioWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    width: '100%',
  },
  audioCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  audioTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  audioSubtitle: {
    color: '#818CF8',
    fontSize: 14,
    fontWeight: '600',
  },
  audioMiniController: {
    width: '100%',
    height: 60,
    marginTop: 16,
  },
});
