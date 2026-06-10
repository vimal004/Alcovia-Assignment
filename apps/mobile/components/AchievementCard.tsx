import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { useM3Theme } from '../constants/Theme';

interface AchievementCardProps {
  emoji: string;
  value: string | number;
  label: string;
  tint?: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

export function AchievementCard({
  emoji,
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
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
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
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 10,
  },
  emoji: {
    fontSize: 22,
  },
  value: {
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
});
