import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlatformType } from '@/types/media';

interface PlatformBadgeProps {
  platform: PlatformType;
  size?: 'small' | 'medium';
}

export function PlatformBadge({ platform, size = 'small' }: PlatformBadgeProps) {
  let label = 'Direct';
  let iconName: keyof typeof Ionicons.glyphMap = 'link';
  let bgColor = '#64748B';

  switch (platform) {
    case 'youtube':
      label = 'YouTube';
      iconName = 'logo-youtube';
      bgColor = '#FF0033';
      break;
    case 'instagram':
      label = 'Instagram';
      iconName = 'logo-instagram';
      bgColor = '#E1306C';
      break;
    case 'whatsapp':
      label = 'WhatsApp';
      iconName = 'logo-whatsapp';
      bgColor = '#25D366';
      break;
  }

  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, isSmall && styles.badgeSmall]}>
      <Ionicons name={iconName} size={isSmall ? 12 : 15} color="#FFFFFF" />
      <Text style={[styles.badgeText, isSmall && styles.badgeTextSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  badgeTextSmall: {
    fontSize: 10,
    fontWeight: '700',
  },
});
