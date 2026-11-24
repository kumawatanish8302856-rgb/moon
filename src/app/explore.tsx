import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Header } from '@/components/Header';
import { ThemeSegmentedControl } from '@/components/ThemeToggle';
import { PermissionsModal } from '@/components/PermissionsModal';
import { downloaderService } from '@/services/downloader.service';

export default function GuideScreen() {
  const { colors, isDark } = useAppTheme();
  const [permissionsVisible, setPermissionsVisible] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [serverUrl, setServerUrl] = useState<string>(downloaderService.getBackendUrl());

  const checkConnection = useCallback(async () => {
    setServerStatus('checking');
    const result = await downloaderService.checkBackendHealth();
    setServerUrl(result.url);
    setServerStatus(result.ok ? 'connected' : 'offline');
  }, []);

  useEffect(() => {
    let active = true;
    downloaderService.checkBackendHealth().then((result) => {
      if (active) {
        setServerUrl(result.url);
        setServerStatus(result.ok ? 'connected' : 'offline');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="App Guide & Settings"
        subtitle="Theme appearance, media download & status FAQ"
        icon="book-outline"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Section: Appearance (Light / Dark Mode) */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  Choose between Light, Dark, or System mode
                </Text>
              </View>
            </View>

            <ThemeSegmentedControl />
          </View>

          {/* Section: Device Permissions Manager */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.success }]}>
                <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Device Permissions</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  Gallery, File Manager storage & Clipboard access
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setPermissionsVisible(true)}
              style={[styles.managePermissionsBtn, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="settings-outline" size={16} color={colors.primary} />
              <Text style={[styles.managePermissionsText, { color: colors.primary }]}>
                Check & Manage App Permissions
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section: Backend Server Connection Status */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      serverStatus === 'connected'
                        ? colors.success
                        : serverStatus === 'offline'
                        ? colors.error
                        : colors.primary,
                  },
                ]}>
                <Ionicons
                  name={
                    serverStatus === 'connected'
                      ? 'server-outline'
                      : serverStatus === 'offline'
                      ? 'cloud-offline-outline'
                      : 'sync-outline'
                  }
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Backend Server</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {serverUrl}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor:
                    serverStatus === 'connected'
                      ? colors.success + '20'
                      : serverStatus === 'offline'
                      ? colors.error + '20'
                      : colors.primary + '20',
                }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color:
                      serverStatus === 'connected'
                        ? colors.success
                        : serverStatus === 'offline'
                        ? colors.error
                        : colors.primary,
                    textTransform: 'uppercase',
                  }}>
                  {serverStatus}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={checkConnection}
              disabled={serverStatus === 'checking'}
              style={[styles.managePermissionsBtn, { backgroundColor: colors.backgroundElement }]}>
              {serverStatus === 'checking' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                  <Text style={[styles.managePermissionsText, { color: colors.primary }]}>
                    Test Server Connection
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Section 1: YouTube Downloader */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.youtube }]}>
                <Ionicons name="logo-youtube" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>YouTube MP3 & MP4</Text>
            </View>

            <View style={styles.stepList}>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                1. Open the YouTube app or website and find the video you want.
              </Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                2. Tap <Text style={{ color: colors.text, fontWeight: '700' }}>Share</Text> →{' '}
                <Text style={{ color: colors.text, fontWeight: '700' }}>Copy Link</Text>.
              </Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                3. Switch to MOONFLOW and tap the <Text style={{ color: colors.text, fontWeight: '700' }}>Paste</Text> button.
              </Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                4. Select your preferred resolution (1080p, 720p) or MP3 Audio (320kbps).
              </Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                5. Tap <Text style={{ color: colors.primary, fontWeight: '700' }}>Download</Text>. You can then save directly to your phone gallery.
              </Text>
            </View>
          </View>

          {/* Section 2: Instagram Reels */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.instagram }]}>
                <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Instagram Reels & Posts</Text>
            </View>

            <View style={styles.stepList}>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                1. In Instagram, open any Reel or video post.
              </Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                2. Tap the paper airplane / share icon and choose <Text style={{ color: colors.text, fontWeight: '700' }}>Copy link</Text>.
              </Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                3. Open MOONFLOW Downloader, paste the link, and choose Video or Audio format.
              </Text>
            </View>
          </View>

          {/* Section 3: WhatsApp Status Saver */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.whatsapp }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>WhatsApp Status Saver</Text>
            </View>

            <View style={styles.stepList}>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                1. View the status first inside WhatsApp so your device temporarily caches it.
              </Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                2. On Android, tap <Text style={{ color: colors.whatsapp, fontWeight: '700' }}>Access Folder</Text> to link your WhatsApp media directory.
              </Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                3. Tap any status in the grid to preview full-screen, save to gallery, or share with friends.
              </Text>
            </View>
          </View>

          {/* Section 4: Privacy & Notice */}
          <View style={[styles.noticeBox, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              MOONFLOW processes downloads securely. Files are saved locally to your device storage.
              Please respect copyright laws and content creators&apos; rights.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Permissions Manager Dialog */}
      <PermissionsModal
        visible={permissionsVisible}
        onClose={() => setPermissionsVisible(false)}
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
  managePermissionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  managePermissionsText: {
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.three,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  stepList: {
    gap: 8,
    paddingLeft: 4,
  },
  stepText: {
    fontSize: 13,
    lineHeight: 19,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
