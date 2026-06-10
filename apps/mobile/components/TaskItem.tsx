import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Task, TaskStatus } from '../../../packages/shared/types';
import { useM3Theme } from '../constants/Theme';
import { showConfirm } from '../utils/helpers';
import { AppCard } from './AppCard';

interface TaskItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDelete: (taskId: string) => void;
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  not_started: 'in_progress',
  in_progress: 'done',
  done: 'not_started',
};

export function TaskItem({ task, onStatusChange, onDelete }: TaskItemProps) {
  const { colors, typography, shapes } = useM3Theme();

  if (task.deleted) return null;

  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'not_started':
        return {
          label: 'Not Started',
          color: colors.onSurfaceVariant,
          bg: colors.surfaceVariant,
          icon: '○',
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          color: colors.warning,
          bg: colors.warningContainer || '#FFF3E0',
          icon: '◐',
        };
      case 'done':
        return {
          label: 'Done',
          color: colors.success,
          bg: colors.successContainer || '#E8F5E9',
          icon: '✓',
        };
      default:
        return {
          label: 'Not Started',
          color: colors.onSurfaceVariant,
          bg: colors.surfaceVariant,
          icon: '○',
        };
    }
  };

  const config = getStatusConfig(task.status) || {
    label: 'Not Started',
    color: colors.outline,
    bg: colors.surfaceVariant,
    icon: '○',
  };

  const handleStatusCycle = () => {
    const next = NEXT_STATUS[task.status];
    onStatusChange(task.id, next);
  };

  const handleDelete = () => {
    showConfirm(`Delete "${task.title}"?`, () => {
      onDelete(task.id);
    });
  };

  return (
    <AppCard variant="elevated" elevation={1} padding={12} style={styles.card}>
      <View style={styles.container}>
        {/* Status Circular Indicator */}
        <TouchableOpacity
          style={[
            styles.statusButton,
            {
              borderColor: config.color,
              backgroundColor: task.status === 'done' ? colors.successContainer : 'transparent',
              borderRadius: shapes.full,
            },
          ]}
          onPress={handleStatusCycle}
          activeOpacity={0.7}
        >
          <Text style={[styles.statusIcon, { color: config.color, fontWeight: '700' }]}>
            {config.icon}
          </Text>
        </TouchableOpacity>

        {/* Content Section */}
        <View style={styles.content}>
          <Text
            style={[
              typography.bodyLarge,
              { color: colors.onSurface },
              task.status === 'done' && [styles.titleDone, { color: colors.outline }],
            ]}
          >
            {task.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: config.bg, borderRadius: shapes.xs }]}>
            <Text style={[typography.labelMedium, { color: config.color, fontWeight: '700' }]}>
              {config.label}
            </Text>
          </View>
        </View>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Text style={[styles.deleteText, { color: colors.outline }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
  },
  statusIcon: {
    fontSize: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  titleDone: {
    textDecorationLine: 'line-through',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteText: {
    fontSize: 16,
  },
});
