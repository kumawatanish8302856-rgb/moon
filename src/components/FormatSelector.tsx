import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';
import { MediaFormat, MediaFormatType } from '@/types/media';

interface FormatSelectorProps {
  formats: MediaFormat[];
  selectedFormat: MediaFormat | null;
  onDownloadFormat: (format: MediaFormat) => void;
  isDownloading: boolean;
}

export function FormatSelector({
  formats,
  selectedFormat,
  onDownloadFormat,
  isDownloading,
}: FormatSelectorProps) {
  const { colors } = useAppTheme();

  const [activeTab, setActiveTab] = useState<MediaFormatType>('video');

  const videoFormats = formats.filter((f) => f.type === 'video');
  const audioFormats = formats.filter((f) => f.type === 'audio');

  const currentFormats = activeTab === 'video' ? videoFormats : audioFormats;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Quality to Download</Text>

      {/* Tabs: Video vs Audio */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.backgroundElement }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('video')}
          style={[
            styles.segmentButton,
            activeTab === 'video' && [styles.segmentButtonActive, { backgroundColor: colors.card }],
          ]}>
          <Ionicons
            name="videocam"
            size={16}
            color={activeTab === 'video' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'video' ? colors.text : colors.textSecondary },
            ]}>
            Video ({videoFormats.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('audio')}
          style={[
            styles.segmentButton,
            activeTab === 'audio' && [styles.segmentButtonActive, { backgroundColor: colors.card }],
          ]}>
          <Ionicons
            name="musical-notes"
            size={16}
            color={activeTab === 'audio' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentText,
              { color: activeTab === 'audio' ? colors.text : colors.textSecondary },
            ]}>
            Audio ({audioFormats.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quality list: ONLY Quality & MB Size */}
      <View style={styles.formatList}>
        {currentFormats.map((format) => {
          const isThisDownloading = isDownloading && selectedFormat?.id === format.id;

          // Clean Quality Label (e.g. 1080p, 720p, MP3 Audio, M4A Audio)
          const qualityName =
            format.type === 'video'
              ? format.quality
              : format.ext.toLowerCase() === 'mp3'
              ? 'MP3 Audio'
              : 'M4A Audio';

          // Clean MB Size (e.g. 26 MB, 14 MB)
          const sizeText = format.sizeEstimate
            ? format.sizeEstimate.replace('~', '').trim()
            : '';

          return (
            <TouchableOpacity
              key={format.id}
              disabled={isDownloading}
              onPress={() => onDownloadFormat(format)}
              activeOpacity={0.7}
              style={[
                styles.qualityCard,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: isThisDownloading ? colors.primary : 'transparent',
                },
              ]}>
              {/* Left: Icon & Quality */}
              <View style={styles.qualityLeft}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor:
                        format.type === 'video' ? colors.primary + '18' : colors.youtube + '18',
                    },
                  ]}>
                  <Ionicons
                    name={format.type === 'video' ? 'videocam-outline' : 'musical-note-outline'}
                    size={18}
                    color={format.type === 'video' ? colors.primary : colors.youtube}
                  />
                </View>
                <Text style={[styles.qualityTitle, { color: colors.text }]}>{qualityName}</Text>
              </View>

              {/* Right: MB Size & Download Action Button */}
              <View style={styles.qualityRight}>
                {sizeText ? (
                  <Text style={[styles.sizeValue, { color: colors.textSecondary }]}>
                    {sizeText}
                  </Text>
                ) : null}

                <View
                  style={[
                    styles.downloadButton,
                    { backgroundColor: isThisDownloading ? colors.success : colors.primary },
                  ]}>
                  {isThisDownloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-download-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.downloadButtonText}>Download</Text>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formatList: {
    gap: 10,
  },
  qualityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  qualityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  qualityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sizeValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
