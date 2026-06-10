import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import type { Task, TaskStatus } from '../../packages/shared/types';

interface TaskItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDelete: (taskId: string) => void;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: string }> = {
  not_started: { label: 'Not Started', color: '#757575', bg: '#F5F5F5', icon: '○' },
  in_progress: { label: 'In Progress', color: '#FF9800', bg: '#FFF3E0', icon: '◐' },
  done: { label: 'Done', color: '#4CAF50', bg: '#E8F5E9', icon: '●' },
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  not_started: 'in_progress',
  in_progress: 'done',
  done: 'not_started',
};

export function TaskItem({ task, onStatusChange, onDelete }: TaskItemProps) {
  if (task.deleted) return null;

  const config = STATUS_CONFIG[task.status];

  const handleStatusCycle = () => {
    const next = NEXT_STATUS[task.status];
    onStatusChange(task.id, next);
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (confirm(`Delete "${task.title}"?`)) {
        onDelete(task.id);
      }
    } else {
      Alert.alert('Delete Task', `Delete "${task.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(task.id) },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.statusButton}
        onPress={handleStatusCycle}
        activeOpacity={0.7}
      >
        <Text style={[styles.statusIcon, { color: config.color }]}>{config.icon}</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={[styles.title, task.status === 'done' && styles.titleDone]}>
          {task.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statusButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusIcon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212121',
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: '#9E9E9E',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
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
    color: '#BDBDBD',
  },
});
