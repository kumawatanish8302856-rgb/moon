import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  showAppLogo?: boolean;
  rightAction?: React.ReactNode;
  showThemeToggle?: boolean;
}

export function Header({
  title,
  subtitle,
  icon,
  showAppLogo,
  rightAction,
  showThemeToggle = true,
}: HeaderProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.titleRow}>
        {showAppLogo ? (
          <Image
            source={require('../../assets/images/moonflow-logo.png')}
            style={styles.appLogo}
            resizeMode="cover"
          />
        ) : icon ? (
          <View style={[styles.iconWrapper, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name={icon} size={22} color={colors.primary} />
          </View>
        ) : null}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.rightAction}>
        {showThemeToggle && <ThemeToggle />}
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
