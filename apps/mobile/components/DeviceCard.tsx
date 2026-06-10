import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { useM3Theme } from '../constants/Theme';
import { InteractivePressable } from './InteractivePressable';

interface DeviceCardProps {
  clientId: 'client-A' | 'client-B' | 'client-C';
  activeClientId: 'client-A' | 'client-B' | 'client-C';
  isOnline: boolean;
  onSelect: (id: 'client-A' | 'client-B' | 'client-C') => void;
  onToggleOnline: () => void;
}

export function DeviceCard({
  clientId,
  activeClientId,
  isOnline,
  onSelect,
  onToggleOnline,
}: DeviceCardProps) {
  const { colors, shapes, typography } = useM3Theme();

  const isActive = clientId === activeClientId;
  const cardBorderColor = isActive ? colors.primary : colors.outlineVariant;
  const statusColor = isOnline ? colors.success : colors.error;
  const statusContainerColor = isOnline ? colors.successContainer : colors.errorContainer;

  return (
    <AppCard
      variant={isActive ? 'elevated' : 'outlined'}
      elevation={isActive ? 3 : 0}
      padding={12}
      style={[
        styles.card,
        {
          borderColor: cardBorderColor,
          borderWidth: isActive ? 2 : 1,
        },
      ]}
    >
      <InteractivePressable onPress={() => onSelect(clientId)} style={styles.content} scaleTo={0.98}>
        <View style={styles.headerContainer}>
          <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: '700' }]} numberOfLines={1}>
            Device {clientId === 'client-A' ? 'A' : clientId === 'client-B' ? 'B' : 'C'}
          </Text>
          {isActive && (
            <View style={[styles.activePill, { backgroundColor: colors.primary, marginTop: 4, alignSelf: 'flex-start' }]}>
              <Text style={{ color: colors.onPrimary, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Active</Text>
            </View>
          )}
        </View>

        <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 6, fontSize: 11 }]} numberOfLines={1}>
          ID: {clientId}
        </Text>

        <View style={styles.divider} />

        {isActive ? (
          <InteractivePressable
            style={[styles.statusToggle, { backgroundColor: statusContainerColor }]}
            onPress={onToggleOnline}
            scaleTo={0.93}
          >
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[typography.labelMedium, { color: statusColor, fontWeight: '800' }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </InteractivePressable>
        ) : (
          <View style={styles.inactivePlaceholder}>
            <Text style={[typography.bodySmall, { color: colors.outline, fontSize: 10, textAlign: 'center' }]} numberOfLines={2}>
              Tap to switch
            </Text>
          </View>
        )}
      </InteractivePressable>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 90,
  },
  content: {
    width: '100%',
  },
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 10,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inactivePlaceholder: {
    alignItems: 'center',
    paddingVertical: 6,
  },
});
