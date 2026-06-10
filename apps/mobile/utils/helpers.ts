import { Platform } from 'react-native';

// Helper utilities

// Generate a simple UUID v4
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get today's date as YYYY-MM-DD
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Format seconds into MM:SS
export function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Format minutes into human readable
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// Calculate chapter progress (0 to 1)
export function calculateChapterProgress(tasks: { status: string; deleted: boolean }[]): number {
  if (!tasks || !Array.isArray(tasks)) return 0;
  const activeTasks = tasks.filter((t) => !t.deleted);
  if (activeTasks.length === 0) return 0;
  const done = activeTasks.filter((t) => t.status === 'done').length;
  return done / activeTasks.length;
}

// Calculate subject progress (average of chapter progresses, 0 to 1)
export function calculateSubjectProgress(
  chapters: { tasks: { status: string; deleted: boolean }[] }[]
): number {
  if (!chapters || !Array.isArray(chapters) || chapters.length === 0) return 0;
  const total = chapters.reduce((sum, ch) => {
    const tasks = ch ? ch.tasks : [];
    return sum + calculateChapterProgress(tasks);
  }, 0);
  return total / chapters.length;
}

// Storage key with client namespace
export function getStorageKey(clientId: string, key: string): string {
  return `alcovia_${clientId}_${key}`;
}

// Generate cross-platform shadow styles
export function getShadowStyle(
  color: string,
  offsetX: number,
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number
): any {
  if (Platform.OS === 'web') {
    // Map colors like hex or name to standard RGBA or hex string
    const rgbaColor = color.startsWith('#') ? color : '#000000';
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${rgbaColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

// Platform-safe Alert dialog wrapper
export function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
}

// Platform-safe Confirm dialog wrapper
export function showConfirm(message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (confirm(message)) {
      onConfirm();
    }
  } else {
    const { Alert } = require('react-native');
    Alert.alert('Confirmation', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirm },
    ]);
  }
}

// Partition Zustand persist storage names per client on web to prevent tab state collisions
export function getPartitionedStorageName(baseName: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const clientParam = params.get('client') || params.get('device');
    let cid = 'client-A';
    if (clientParam === 'client-B' || clientParam === 'B') cid = 'client-B';
    if (clientParam === 'client-C' || clientParam === 'C') cid = 'client-C';
    return `${baseName}-${cid}`;
  }
  return baseName;
}

// Extract ClientId from URL parameters to auto-assign active device on tab launch
export function getUrlClientId(): 'client-A' | 'client-B' | 'client-C' {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const clientParam = params.get('client') || params.get('device');
    if (clientParam === 'client-B' || clientParam === 'B') return 'client-B';
    if (clientParam === 'client-C' || clientParam === 'C') return 'client-C';
  }
  return 'client-A';
}

