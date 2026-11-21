import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Header } from '@/components/Header';
import { UrlInputBar } from '@/components/UrlInputBar';
import { MediaPreviewCard } from '@/components/MediaPreviewCard';
import { FormatSelector } from '@/components/FormatSelector';
import { DownloadProgressModal } from '@/components/DownloadProgressModal';
import { PermissionsModal } from '@/components/PermissionsModal';
import { downloaderService } from '@/services/downloader.service';
import { DownloadedMedia, DownloadProgressInfo, MediaFormat, MediaMetadata } from '@/types/media';

export default function DownloaderScreen() {
  const { colors } = useAppTheme();

  const [inputUrl, setInputUrl] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<MediaMetadata | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<MediaFormat | null>(null);
  const [clipboardDetectedUrl, setClipboardDetectedUrl] = useState<string | null>(null);
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false);

  // Download state
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressInfo>({
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    status: 'idle',
  });
  const [completedItem, setCompletedItem] = useState<DownloadedMedia | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const checkBackend = useCallback(async () => {
    try {
      const health = await downloaderService.checkBackendHealth();
      setBackendOnline(health.ok);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  /**
   * PRIORITY 1: Check clipboard automatically on screen focus
   * If user copied a YouTube or Instagram link, prompt them or prefetch immediately!
   */
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      checkBackend();
      (async () => {
        try {
          const hasString = await Clipboard.hasStringAsync();
          if (hasString) {
            const clipText = (await Clipboard.getStringAsync())?.trim();
            if (clipText && isMounted) {
              const validation = downloaderService.validateUrl(clipText);
              if (validation.valid && clipText !== inputUrl) {
                setClipboardDetectedUrl(clipText);
                // Prefetch in background silently so it's warm
                downloaderService.prefetchMediaInfo(clipText)?.catch(() => {});
              }
            }
          }
        } catch {
          // Ignore clipboard permission / reading error
        }
      })();
      return () => {
        isMounted = false;
      };
    }, [inputUrl, checkBackend])
  );

  /**
   * PRIORITY 1: Automatic prefetching when URL is pasted or entered
   */
  const handleUrlChange = (text: string) => {
    const prevLen = inputUrl.length;
    setInputUrl(text);

    const validation = downloaderService.validateUrl(text);
    if (validation.valid) {
      // If user pasted a complete URL (pasted jump >5 chars or starting from empty), auto-fetch right away!
      if (text.length > 15 && (text.length - prevLen > 5 || prevLen === 0)) {
        handleFetch(text);
      } else {
        // Background prefetch if user is still typing or editing
        downloaderService.prefetchMediaInfo(text)?.catch(() => {});
      }
    }
  };

  const handleFetch = async (targetUrl?: string) => {
    const urlToFetch = (targetUrl || inputUrl).trim();
    if (!urlToFetch) return;

    const validation = downloaderService.validateUrl(urlToFetch);
    if (!validation.valid) {
      Alert.alert('Invalid URL', validation.errorMessage || 'Please enter a valid link');
      return;
    }

    // Set input to the clean URL if it had extra share text
    if (validation.cleanUrl && validation.cleanUrl !== urlToFetch) {
      setInputUrl(validation.cleanUrl);
    }

    setLoadingInfo(true);
    setMediaInfo(null);
    setSelectedFormat(null);

    try {
      // Resolves in < 50ms if already prefetched!
      const info = await downloaderService.fetchMediaInfo(validation);
      setMediaInfo(info);
      if (info.formats && info.formats.length > 0) {
        setSelectedFormat(info.formats[0]);
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore haptics
      }
    } catch (err: any) {
      Alert.alert('Fetch Error', err?.message || 'Could not fetch video metadata');
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleLoadClipboardLink = async () => {
    if (!clipboardDetectedUrl) return;
    const url = clipboardDetectedUrl;
    setInputUrl(url);
    setClipboardDetectedUrl(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore haptics on web
    }
    handleFetch(url);
  };

  const handleStartDownload = async (formatToDownload?: MediaFormat) => {
    const targetFormat = formatToDownload || selectedFormat;
    if (!mediaInfo || !targetFormat) return;

    setSelectedFormat(targetFormat);
    setDownloadModalVisible(true);
    setCompletedItem(null);
    setDownloadProgress({
      percent: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      status: 'downloading',
    });

    try {
      const record = await downloaderService.startDownload(
        mediaInfo,
        targetFormat,
        (progress) => {
          setDownloadProgress({
            percent: progress.percent,
            downloadedBytes: progress.downloadedBytes,
            totalBytes: progress.totalBytes,
            speed: progress.speed,
            status: 'downloading',
          });
        }
      );

      setCompletedItem(record);
      setDownloadProgress((prev) => ({
        ...prev,
        percent: 100,
        status: 'completed',
      }));
    } catch (e: any) {
      setDownloadProgress((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: e?.message || 'Failed to download file',
      }));
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="MOONFLOW"
        subtitle="YouTube MP3/MP4 & Instagram Reels"
        showAppLogo={true}
        rightAction={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              onPress={() => setPermissionsModalVisible(true)}
              style={[styles.historyButton, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="shield-checkmark-outline" size={17} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/downloads' as any)}
              style={[styles.historyButton, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="folder-open-outline" size={17} color={colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.contentWrapper}>
          {/* Clipboard Detection Banner */}
          {clipboardDetectedUrl && !mediaInfo && (
            <TouchableOpacity
              onPress={handleLoadClipboardLink}
              style={[
                styles.clipboardBanner,
                { backgroundColor: colors.primary + '15', borderColor: colors.primary },
              ]}>
              <View style={styles.clipboardLeft}>
                <Ionicons name="clipboard" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clipboardTitle, { color: colors.text }]}>
                    Link detected from clipboard
                  </Text>
                  <Text style={[styles.clipboardUrl, { color: colors.textSecondary }]} numberOfLines={1}>
                    {clipboardDetectedUrl}
                  </Text>
                </View>
              </View>
              <View style={[styles.clipboardButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.clipboardButtonText}>Load</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Hero Banner */}
          <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.bannerIcons}>
              <View style={[styles.platformIconCircle, { backgroundColor: colors.youtube }]}>
                <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
              </View>
              <View style={[styles.platformIconCircle, { backgroundColor: colors.instagram }]}>
                <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
              </View>
              <View style={[styles.platformIconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="musical-notes" size={18} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>
                High-Speed Stream Downloader
              </Text>
              <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
                Zero re-encoding (stream copy) with fragmented MP4 streaming for instant starts.
              </Text>
            </View>
          </View>

          {/* Backend Offline Warning Banner */}
          {backendOnline === false && (
            <View
              style={[
                styles.offlineBanner,
                { backgroundColor: colors.error + '15', borderColor: colors.error + '40' },
              ]}>
              <Ionicons name="alert-circle" size={24} color={colors.error} />
              <View style={styles.offlineTextWrapper}>
                <Text style={[styles.offlineTitle, { color: colors.error }]}>
                  Backend Server Offline
                </Text>
                <Text style={[styles.offlineSubtitle, { color: colors.textSecondary }]}>
                  Run <Text style={{ fontFamily: 'SpaceMono', fontWeight: 'bold' }}>npm run backend</Text> in terminal to start FastAPI on port 8000.
                </Text>
              </View>
              <TouchableOpacity
                onPress={checkBackend}
                style={[styles.offlineRetryBtn, { backgroundColor: colors.error }]}>
                <Text style={styles.offlineRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* URL Input Bar */}
          <UrlInputBar
            value={inputUrl}
            onChangeText={handleUrlChange}
            onFetch={() => handleFetch()}
            onPasteAndFetch={(pasted) => handleFetch(pasted)}
            isLoading={loadingInfo}
            onClear={() => {
              setInputUrl('');
              setMediaInfo(null);
              setSelectedFormat(null);
            }}
          />

          {/* Media Preview Card */}
          {mediaInfo && (
            <View style={styles.section}>
              <MediaPreviewCard media={mediaInfo} />
            </View>
          )}

          {/* Format Selector */}
          {mediaInfo && (
            <View style={styles.section}>
              <FormatSelector
                formats={mediaInfo.formats}
                selectedFormat={selectedFormat}
                onDownloadFormat={handleStartDownload}
                isDownloading={downloadProgress.status === 'downloading'}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Download Progress Modal */}
      <DownloadProgressModal
        visible={downloadModalVisible}
        progress={downloadProgress}
        completedItem={completedItem}
        onClose={() => setDownloadModalVisible(false)}
        onViewDownloads={() => {
          setDownloadModalVisible(false);
          router.push('/downloads' as any);
        }}
      />

      {/* Permissions Manager Dialog */}
      <PermissionsModal
        visible={permissionsModalVisible}
        onClose={() => setPermissionsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentWrapper: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.three,
    gap: 18,
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipboardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  clipboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  clipboardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  clipboardUrl: {
    fontSize: 11,
    marginTop: 2,
  },
  clipboardButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  clipboardButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bannerIcons: {
    flexDirection: 'column',
    gap: 6,
  },
  platformIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  section: {
    gap: 12,
  },
  offlineBanner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offlineTextWrapper: {
    flex: 1,
    gap: 2,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  offlineSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  offlineRetryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  offlineRetryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
