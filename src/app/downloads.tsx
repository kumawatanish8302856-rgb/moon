import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Header } from '@/components/Header';
import { DownloadItemCard } from '@/components/DownloadItemCard';
import { MediaPlayerModal } from '@/components/MediaPlayerModal';
import { storageService } from '@/services/storage.service';
import { DownloadedMedia, PlatformType } from '@/types/media';

type FilterTab = 'all' | PlatformType | 'audio';

export default function DownloadsScreen() {
  const { colors } = useAppTheme();

  const [downloads, setDownloads] = useState<DownloadedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [playingItem, setPlayingItem] = useState<DownloadedMedia | null>(null);

  const fetchDownloads = useCallback(async (isPull = false) => {
    if (isPull) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const items = await storageService.getDownloads();
      setDownloads(items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload downloads whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDownloads();
    }, [fetchDownloads])
  );

  const handleClearAll = () => {
    if (downloads.length === 0) return;

    Alert.alert(
      'Clear All Downloads',
      'This will delete all saved media files from device storage. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await storageService.clearAllDownloads();
            fetchDownloads();
          },
        },
      ]
    );
  };

  const totalBytes = downloads.reduce((acc, item) => acc + (item.fileSize || 0), 0);
  const totalFormattedSize = (totalBytes / (1024 * 1024)).toFixed(1) + ' MB';

  const filteredItems = downloads.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'audio') return item.format.type === 'audio';
    return item.platform === filter;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Downloads Library"
        subtitle={`${downloads.length} saved files • ${totalFormattedSize}`}
        icon="folder-outline"
        rightAction={
          downloads.length > 0 ? (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
              <Ionicons name="trash-bin-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <View style={styles.container}>
        {/* Storage Summary Banner */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="pie-chart-outline" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Device Storage</Text>
              <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
                {downloads.length} items using {totalFormattedSize}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/' as any)}
            style={[styles.addMediaButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addMediaButtonText}>Download</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterScroll}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === 'all' ? colors.primary : colors.backgroundElement,
              },
            ]}>
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'all' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              All ({downloads.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('youtube')}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === 'youtube' ? colors.youtube : colors.backgroundElement,
              },
            ]}>
            <Ionicons
              name="logo-youtube"
              size={13}
              color={filter === 'youtube' ? '#FFFFFF' : colors.youtube}
            />
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'youtube' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              YouTube
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('instagram')}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === 'instagram' ? colors.instagram : colors.backgroundElement,
              },
            ]}>
            <Ionicons
              name="logo-instagram"
              size={13}
              color={filter === 'instagram' ? '#FFFFFF' : colors.instagram}
            />
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'instagram' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              Instagram
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('whatsapp')}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === 'whatsapp' ? colors.whatsapp : colors.backgroundElement,
              },
            ]}>
            <Ionicons
              name="logo-whatsapp"
              size={13}
              color={filter === 'whatsapp' ? '#FFFFFF' : colors.whatsapp}
            />
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'whatsapp' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              WhatsApp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('audio')}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === 'audio' ? colors.primary : colors.backgroundElement,
              },
            ]}>
            <Ionicons
              name="musical-notes"
              size={13}
              color={filter === 'audio' ? '#FFFFFF' : colors.primary}
            />
            <Text
              style={[
                styles.filterPillText,
                { color: filter === 'audio' ? '#FFFFFF' : colors.textSecondary },
              ]}>
              MP3 Audio
            </Text>
          </TouchableOpacity>
        </View>

        {/* Downloads List */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading downloads...
            </Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.centerBox}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="folder-open-outline" size={44} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Media Saved Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Paste a YouTube or Instagram link in the Downloader, or save a WhatsApp status.
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/' as any)}
              style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>Start Downloading</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchDownloads(true)}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <DownloadItemCard
                item={item}
                onPlay={(media) => setPlayingItem(media)}
                onDeleted={fetchDownloads}
              />
            )}
          />
        )}
      </View>

      {/* Built-in Media Player Modal */}
      <MediaPlayerModal
        item={playingItem}
        visible={!!playingItem}
        onClose={() => setPlayingItem(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
  },
  clearButton: {
    padding: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  summarySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addMediaButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 30,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
