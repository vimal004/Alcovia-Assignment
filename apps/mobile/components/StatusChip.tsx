import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { InteractivePressable } from './InteractivePressable';
import { useM3Theme } from '../constants/Theme';

interface StatusChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  bg?: string;
  icon?: React.ReactNode;
}

export function StatusChip({
  label,
  selected = false,
  onPress,
  color,
  bg,
  icon,
}: StatusChipProps) {
  const { colors, shapes, typography } = useM3Theme();

  const isInteractive = typeof onPress === 'function';

  // Custom coloring or Material 3 standards
  const defaultBg = selected ? colors.secondaryContainer : colors.surface;
  const defaultText = selected ? colors.onSecondaryContainer : colors.onSurfaceVariant;
  const defaultBorder = selected ? 'transparent' : colors.outlineVariant;

  const containerStyle = {
    backgroundColor: bg || defaultBg,
    borderColor: defaultBorder,
    borderWidth: selected ? 0 : 1,
    borderRadius: shapes.s,
    paddingHorizontal: 12,
    paddingVertical: 6,
  };

  const textStyle = {
    color: color || defaultText,
    ...typography.labelMedium,
    fontWeight: '600' as const,
  };

  if (isInteractive) {
    return (
      <InteractivePressable
        style={[styles.chip, containerStyle]}
        onPress={onPress}
        scaleTo={0.95}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={textStyle}>{label}</Text>
      </InteractivePressable>
    );
  }

  return (
    <View style={[styles.chip, containerStyle]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 6,
  },
});
