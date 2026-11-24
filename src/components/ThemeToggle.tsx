import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
}

export function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const { isDark, toggleTheme, colors } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      activeOpacity={0.75}
      style={[
        styles.button,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
        },
      ]}>
      <Ionicons
        name={isDark ? 'sunny' : 'moon'}
        size={18}
        color={isDark ? '#FBBF24' : '#6366F1'}
      />
      {showLabel && (
        <Text style={[styles.labelText, { color: colors.text }]}>
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Segmented Selector for settings (Light / Dark / System)
 */
export function ThemeSegmentedControl() {
  const { themeMode, setThemeMode, colors } = useAppTheme();

  return (
    <View style={[styles.segmentContainer, { backgroundColor: colors.backgroundElement }]}>
      <TouchableOpacity
        onPress={() => setThemeMode('light')}
        style={[
          styles.segmentItem,
          themeMode === 'light' && [styles.segmentActive, { backgroundColor: colors.card }],
        ]}>
        <Ionicons
          name="sunny"
          size={14}
          color={themeMode === 'light' ? '#F59E0B' : colors.textSecondary}
        />
        <Text
          style={[
            styles.segmentText,
            { color: themeMode === 'light' ? colors.text : colors.textSecondary },
          ]}>
          Light
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setThemeMode('dark')}
        style={[
          styles.segmentItem,
          themeMode === 'dark' && [styles.segmentActive, { backgroundColor: colors.card }],
        ]}>
        <Ionicons
          name="moon"
          size={14}
          color={themeMode === 'dark' ? '#818CF8' : colors.textSecondary}
        />
        <Text
          style={[
            styles.segmentText,
            { color: themeMode === 'dark' ? colors.text : colors.textSecondary },
          ]}>
          Dark
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setThemeMode('system')}
        style={[
          styles.segmentItem,
          themeMode === 'system' && [styles.segmentActive, { backgroundColor: colors.card }],
        ]}>
        <Ionicons
          name="phone-portrait-outline"
          size={14}
          color={themeMode === 'system' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.segmentText,
            { color: themeMode === 'system' ? colors.text : colors.textSecondary },
          ]}>
          System
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
