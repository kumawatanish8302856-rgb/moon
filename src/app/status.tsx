import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Header } from '@/components/Header';
import { StatusCard } from '@/components/StatusCard';
import { StatusPreviewModal } from '@/components/StatusPreviewModal';
import { statusSaverService } from '@/services/status-saver.service';
import { WhatsAppStatusItem } from '@/types/media';

type FilterType = 'all' | 'image' | 'video';

export default function StatusSaverScreen() {
  const { colors } = useAppTheme();

  const [filter, setFilter] = useState<FilterType>('all');
  const [statuses, setStatuses] = useState<WhatsAppStatusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [folderConnected, setFolderConnected] = useState(false);
  const [folderUri, setFolderUri] = useState<string | null>(null);

  // Selected for preview
  const [selectedItem, setSelectedItem] = useState<WhatsAppStatusItem | null>(null);

  const loadStatuses = useCallback(async (uri: string | null, isPullRefresh = false) => {
    if (!uri || Platform.OS !== 'android') {
      setStatuses([]);
      return;
    }

    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const items = await statusSaverService.loadFromDirectory(uri);
      setStatuses(items);
      setFolderConnected(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not read WhatsApp status directory.';
      console.warn('Failed reading saved WhatsApp status folder:', error);
      setStatuses([]);
      setFolderConnected(false);
      setFolderUri(null);
      try {
        await statusSaverService.clearSavedFolderUri();
      } catch (clearError) {
        console.warn('Failed to clear unavailable WhatsApp status folder:', clearError);
      }
      Alert.alert('Folder Access Lost', `${message} Please select the WhatsApp Status folder again.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    if (Platform.OS === 'android') {
      statusSaverService
        .getSavedFolderUri()
        .then((uri) => {
          if (active && uri) {
            setFolderUri(uri);
            void loadStatuses(uri);
          }
        })
        .catch((error) => {
          console.warn('Failed restoring WhatsApp status folder:', error);
        });
    }

    return () => {
      active = false;
    };
  }, [loadStatuses]);

  const handleRequestAndroidFolder = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'Android Device Required',
        'Direct WhatsApp Status directory access is native to Android devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const res = await statusSaverService.requestAndroidFolderAccess();
      if (res.granted && res.directoryUri) {
        setFolderUri(res.directoryUri);
        await loadStatuses(res.directoryUri);
      } else {
        Alert.alert('Permission Needed', 'Please select and grant access to the WhatsApp status directory.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open folder picker.';
      Alert.alert('Folder Access Error', message);
    }
  };

  const handleQuickSave = async (item: WhatsAppStatusItem) => {
    try {
      const localFile = await statusSaverService.saveStatusLocally(item);
      const ok = await statusSaverService.saveToGallery(localFile);
      if (ok) {
        Alert.alert('Saved to Gallery! 🎉', `"${item.name}" has been saved directly to your phone Gallery (MOONFLOW album).`);
      } else {
        Alert.alert('Saved Locally', 'Saved to your MOONFLOW Downloads folder.');
      }
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save status.');
    }
  };

  const filteredStatuses = statuses.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Status Saver"
        subtitle="Save WhatsApp Photos & Videos"
        icon="logo-whatsapp"
        rightAction={
          <TouchableOpacity
            onPress={() => loadStatuses(folderUri, true)}
            style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="refresh" size={18} color={colors.whatsapp} />
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        {/* Android SAF Banner */}
        <View style={[styles.permissionBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.bannerLeft}>
            <View style={[styles.waIconBox, { backgroundColor: colors.whatsapp + '20' }]}>
              <Ionicons name="logo-whatsapp" size={24} color={colors.whatsapp} />
            </View>
            <View style={styles.bannerInfo}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>
                {folderConnected ? 'WhatsApp Folder Linked' : 'Connect WhatsApp Status'}
              </Text>
              <Text style={[styles.bannerDesc, { color: colors.textSecondary }]}>
                {folderConnected
                  ? `${statuses.length} media items discovered`
                  : 'Grant access to Android /WhatsApp/Media/.Statuses'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRequestAndroidFolder}
            style={[
              styles.connectButton,
              { backgroundColor: folderConnected ? colors.backgroundElement : colors.whatsapp },
            ]}>
            <Text
              style={[
                styles.connectButtonText,
                { color: folderConnected ? colors.text : '#FFFFFF' },
              ]}>
              {folderConnected ? 'Change' : 'Access Folder'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterBar, { backgroundColor: colors.backgroundElement }]}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[
              styles.filterTab,
              filter === 'all' && [styles.filterTabActive, { backgroundColor: colors.card }],
            ]}>
            <Text
              style={[
                styles.filterText,
                { color: filter === 'all' ? colors.whatsapp : colors.textSecondary },
              ]}>
              All ({statuses.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('image')}
            style={[
              styles.filterTab,
              filter === 'image' && [styles.filterTabActive, { backgroundColor: colors.card }],
            ]}>
            <Ionicons
              name="image-outline"
              size={14}
              color={filter === 'image' ? colors.whatsapp : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterText,
                { color: filter === 'image' ? colors.whatsapp : colors.textSecondary },
              ]}>
              Photos ({statuses.filter((s) => s.type === 'image').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('video')}
            style={[
              styles.filterTab,
              filter === 'video' && [styles.filterTabActive, { backgroundColor: colors.card }],
            ]}>
            <Ionicons
              name="videocam-outline"
              size={14}
              color={filter === 'video' ? colors.whatsapp : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterText,
                { color: filter === 'video' ? colors.whatsapp : colors.textSecondary },
              ]}>
              Videos ({statuses.filter((s) => s.type === 'video').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Grid */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.whatsapp} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Scanning WhatsApp Statuses...
            </Text>
          </View>
        ) : !folderConnected ? (
          <View style={styles.centerBox}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.whatsapp + '20' }]}>
              <Ionicons name="folder-open-outline" size={40} color={colors.whatsapp} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Connect WhatsApp Status Folder
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Grant access to the Android WhatsApp .Statuses folder to view and save statuses.
            </Text>
            <TouchableOpacity
              onPress={handleRequestAndroidFolder}
              style={[styles.grantButton, { backgroundColor: colors.whatsapp }]}>
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.grantButtonText}>Grant Folder Access</Text>
            </TouchableOpacity>
          </View>
        ) : filteredStatuses.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Recent Statuses</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Open WhatsApp to view recent statuses first, then pull down to refresh.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredStatuses}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadStatuses(folderUri, true)}
                tintColor={colors.whatsapp}
              />
            }
            renderItem={({ item }) => (
              <StatusCard
                item={item}
                onPress={() => setSelectedItem(item)}
                onQuickSave={() => handleQuickSave(item)}
              />
            )}
          />
        )}
      </View>

      {/* Fullscreen Preview Modal */}
      <StatusPreviewModal
        item={selectedItem}
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
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
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  waIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  connectButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  connectButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 9,
  },
  filterTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridContent: {
    paddingBottom: 30,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
