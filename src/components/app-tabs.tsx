import { NativeTabs } from 'expo-router/native-tabs';
import { useAppTheme } from '@/context/ThemeContext';

export default function AppTabs() {
  const { colors } = useAppTheme();

  return (
    <NativeTabs
      backBehavior="history"
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Downloader</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="arrow.down.circle"
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="status">
        <NativeTabs.Trigger.Label>Status Saver</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="message.badge.fill"
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="downloads">
        <NativeTabs.Trigger.Label>Downloads</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="folder.fill"
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
