import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { useM3Theme } from '@/constants/Theme';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { getShadowStyle } from '@/utils/helpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TabIcon = ({ name, color, focused }: { name: string; color: any; focused: boolean }) => {
  const { colors } = useM3Theme();

  const iconColor = focused ? colors.onPrimaryContainer : color;

  const renderIcon = () => {
    switch (name) {
      case 'home':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.5}>
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );
      case 'focus':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.5}>
            <Circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
            <Polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );
      case 'syllabus':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.5}>
            <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );
      case 'dev':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.5}>
            <Circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.iconWrapper,
        focused && { backgroundColor: colors.primaryContainer },
      ]}
    >
      {renderIcon()}
    </View>
  );
};

export default function TabLayout() {
  const { colors, typography } = useM3Theme();
  const insets = useSafeAreaInsets();

  const bottomPadding = Platform.OS === 'web'
    ? 12
    : (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 24 : 14));
  
  const tabHeight = Platform.OS === 'web' ? 84 : (60 + bottomPadding);
  const paddingTop = Platform.OS === 'web' ? 10 : 10;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          ...typography.labelMedium,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
          height: tabHeight,
          paddingTop: paddingTop,
          paddingBottom: bottomPadding,
          ...getShadowStyle(colors.shadow, 0, -2, 0.08, 10, 8),
        },
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.outlineVariant,
          ...getShadowStyle(colors.shadow, 0, 2, 0.05, 4, 2),
        },
        headerTitleStyle: {
          ...typography.titleLarge,
          color: colors.onSurface,
          fontWeight: '800',
        },
        headerShown: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color, focused }) => <TabIcon name="focus" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="syllabus"
        options={{
          title: 'Syllabus',
          tabBarIcon: ({ color, focused }) => <TabIcon name="syllabus" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="devpanel"
        options={{
          title: 'Dev Panel',
          tabBarIcon: ({ color, focused }) => <TabIcon name="dev" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
