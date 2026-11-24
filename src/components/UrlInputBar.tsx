import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/context/ThemeContext';

interface UrlInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFetch: (url?: string) => void;
  isLoading: boolean;
  onClear: () => void;
  onPasteAndFetch?: (pastedText: string) => void;
}

export function UrlInputBar({
  value,
  onChangeText,
  onFetch,
  isLoading,
  onClear,
  onPasteAndFetch,
}: UrlInputBarProps) {
  const { colors } = useAppTheme();

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        const cleaned = text.trim();
        onChangeText(cleaned);
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // ignore haptics error on web
        }
        if (onPasteAndFetch) {
          onPasteAndFetch(cleaned);
        } else {
          onFetch(cleaned);
        }
      } else {
        Alert.alert(
          'Clipboard Empty',
          'No link found in your clipboard. Please copy a YouTube or Instagram video link first, then tap Paste.'
        );
      }
    } catch (e) {
      console.warn('Clipboard read error:', e);
      Alert.alert(
        'Clipboard Notice',
        'Could not access clipboard automatically. Please press and hold inside the text input to paste manually.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            borderColor: value.length > 0 ? colors.primary : colors.border,
          },
        ]}>
        <Ionicons name="link-outline" size={20} color={colors.textSecondary} style={styles.leftIcon} />

        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Paste YouTube or Instagram link here..."
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => onFetch()}
        />

        {value.length > 0 ? (
          <TouchableOpacity onPress={onClear} style={styles.iconButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handlePaste}
            style={[styles.pasteButton, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
            <Text style={[styles.pasteButtonText, { color: colors.primary }]}>Paste</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={() => onFetch()}
        disabled={isLoading || !value.trim()}
        style={[
          styles.fetchButton,
          {
            backgroundColor: !value.trim() ? colors.backgroundElement : colors.primary,
            opacity: isLoading || !value.trim() ? 0.7 : 1,
          },
        ]}>
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name="flash-outline" size={18} color={!value.trim() ? colors.textSecondary : '#FFFFFF'} />
            <Text
              style={[
                styles.fetchButtonText,
                { color: !value.trim() ? colors.textSecondary : '#FFFFFF' },
              ]}>
              Fetch Video Info
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  iconButton: {
    padding: 4,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  pasteButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  fetchButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
