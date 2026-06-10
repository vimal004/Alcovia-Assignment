import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { useM3Theme } from '../constants/Theme';

interface AchievementCardProps {
  symbol: string; // Minimal geometric symbol instead of childish emojis
  value: string | number;
  label: string;
  tint?: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

export function AchievementCard({
  symbol,
  value,
  label,
  tint,
  variant = 'primary',
}: AchievementCardProps) {
  const { colors, shapes, typography } = useM3Theme();

  const getContainerBg = () => {
    switch (variant) {
      case 'primary':
        return colors.primaryContainer;
      case 'secondary':
        return colors.secondaryContainer;
      case 'tertiary':
        return colors.tertiaryContainer;
    }
  };

  const getOnContainerColor = () => {
    switch (variant) {
      case 'primary':
        return colors.onPrimaryContainer;
      case 'secondary':
        return colors.onSecondaryContainer;
      case 'tertiary':
        return colors.onTertiaryContainer;
    }
  };

  return (
    <AppCard
      variant="filled"
      padding={16}
      style={[
        styles.card,
        {
          backgroundColor: getContainerBg(),
          borderRadius: shapes.l,
        },
      ]}
    >
      <View style={[styles.symbolContainer, { backgroundColor: colors.surface + '80' }]}>
        <Text style={[styles.symbol, { color: tint || getOnContainerColor() }]}>{symbol}</Text>
      </View>
      <Text style={[typography.titleLarge, styles.value, { color: tint || getOnContainerColor() }]}>
        {value}
      </Text>
      <Text style={[typography.labelMedium, styles.label, { color: colors.onSurfaceVariant }]}>
        {label}
      </Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  symbolContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  symbol: {
    fontSize: 14,
    fontWeight: '900',
  },
  value: {
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.25,
  },
});
