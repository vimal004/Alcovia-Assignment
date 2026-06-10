import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
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
  const ChipContainer = isInteractive ? TouchableOpacity : View;

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

  return (
    <ChipContainer
      style={[styles.chip, containerStyle]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={textStyle}>{label}</Text>
    </ChipContainer>
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
