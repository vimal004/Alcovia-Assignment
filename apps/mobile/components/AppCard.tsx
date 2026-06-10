import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useM3Theme } from '../constants/Theme';
import { getShadowStyle } from '../utils/helpers';

interface AppCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'filled' | 'outlined';
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}

export function AppCard({
  children,
  variant = 'elevated',
  elevation = 1,
  style,
  padding = 16,
}: AppCardProps) {
  const { colors, shapes } = useM3Theme();

  const getCardStyles = (): StyleProp<ViewStyle> => {
    const baseStyle: ViewStyle = {
      borderRadius: shapes.l,
      padding,
      overflow: 'hidden',
    };

    if (variant === 'elevated') {
      return {
        ...baseStyle,
        backgroundColor: colors.surface,
        ...getShadowStyle(colors.shadow, 0, elevation, 0.1, elevation * 2, elevation * 2),
      };
    } else if (variant === 'filled') {
      return {
        ...baseStyle,
        backgroundColor: colors.surfaceVariant,
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.outlineVariant,
      };
    }
  };

  return <View style={[getCardStyles(), style]}>{children}</View>;
}
