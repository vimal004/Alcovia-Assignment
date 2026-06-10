import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager, TextInput } from 'react-native';
import { useSyllabusStore } from '../../stores/syllabusStore';
import { useDeviceStore } from '../../stores/deviceStore';
import { useSyncStore } from '../../stores/syncStore';
import Animated, { FadeIn } from 'react-native-reanimated';
import { TaskItem } from '../../components/TaskItem';
import { ProgressBar } from '../../components/ProgressBar';
import { calculateChapterProgress, calculateSubjectProgress } from '../../utils/helpers';
import { useM3Theme } from '../../constants/Theme';
import { AppCard } from '../../components/AppCard';
import type { Subject, Chapter, Task } from '../../../../packages/shared/types';

const EMPTY_ARRAY: Subject[] = [];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SyllabusScreen() {
  const { colors, typography, shapes, isDark } = useM3Theme();
  const clientId = useDeviceStore((state) => state.clientId);
  const isOnline = useDeviceStore((state) => state.isOnline[clientId]);
  const subjects = useSyllabusStore((state) => state.subjects[clientId] || EMPTY_ARRAY);
  const updateTaskStatus = useSyllabusStore((state) => state.updateTaskStatus);
  const deleteTask = useSyllabusStore((state) => state.deleteTask);
  const addTask = useSyllabusStore((state) => state.addTask);
  const initializeSyllabus = useSyllabusStore((state) => state.initializeIfNeeded);

  // Sync state on load or when switching clients
  useEffect(() => {
    initializeSyllabus();
    if (isOnline) {
      useSyncStore.getState().sync(clientId);
    }
  }, [clientId, isOnline]);

  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({
    'sub-math': true,
  });

  // Task creation local inputs state
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  const toggleExpandSubject = (subjectId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  const handleAddTask = (chapterId: string) => {
    const title = taskInputs[chapterId]?.trim();
    if (!title) return;

    addTask(chapterId, title);
    setTaskInputs((prev) => ({
      ...prev,
      [chapterId]: '',
    }));
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[typography.headlineMedium, { color: colors.onBackground, fontWeight: '800' }]}>
        Syllabus Progress
      </Text>
      <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 6, marginBottom: 20, lineHeight: 20 }]}>
        Track your study items, modify task statuses offline, and view real-time progress rollups.
      </Text>

      {subjects.map((subject) => {
        const isExpanded = !!expandedSubjects[subject.id];
        const subjectProgress = calculateSubjectProgress(subject.chapters);

        return (
          <AppCard
            key={subject.id}
            variant="elevated"
            elevation={1}
            padding={0}
            style={styles.subjectCard}
          >
            {/* Subject Header */}
            <TouchableOpacity
              style={[
                styles.subjectHeader,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: isExpanded ? colors.outlineVariant : 'transparent',
                  borderBottomWidth: isExpanded ? 1 : 0,
                },
              ]}
              onPress={() => toggleExpandSubject(subject.id)}
              activeOpacity={0.8}
            >
              <View style={styles.subjectInfo}>
                <Text style={[typography.titleLarge, { color: colors.primary, fontWeight: '700' }]}>{subject.name}</Text>
                <Text style={[styles.expandIcon, { color: colors.outline }]}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </View>
              <ProgressBar progress={subjectProgress} color={colors.primary} />
            </TouchableOpacity>

            {/* Chapters & Tasks list */}
            {isExpanded && (
              <View style={[styles.chaptersContainer, { backgroundColor: isDark ? '#1D1A22' : '#F6F2FA' }]}>
                {subject.chapters.map((chapter: Chapter) => {
                  const chapterProgress = calculateChapterProgress(chapter.tasks);
                  const activeTasks = chapter.tasks.filter((t: Task) => !t.deleted);
                  const currentInputValue = taskInputs[chapter.id] || '';

                  return (
                    <View key={chapter.id} style={[styles.chapterCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
                      <View style={styles.chapterHeader}>
                        <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: '700', flex: 1 }]}>
                          {chapter.name}
                        </Text>
                        <View style={{ width: 100 }}>
                          <ProgressBar progress={chapterProgress} color={colors.success} showLabel={false} />
                        </View>
                      </View>

                      <View style={styles.tasksList}>
                        {activeTasks.length > 0 ? (
                          activeTasks.map((task: Task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onStatusChange={updateTaskStatus}
                              onDelete={deleteTask}
                            />
                          ))
                        ) : (
                          <Text style={[typography.bodyMedium, styles.noTasks, { color: colors.outline }]}>
                            No active tasks in this chapter.
                          </Text>
                        )}
                      </View>

                      {/* Inline Task Creation Deck */}
                      <View style={[styles.createTaskRow, { borderTopColor: colors.outlineVariant }]}>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              color: colors.onSurface,
                              borderColor: colors.outlineVariant,
                              borderRadius: shapes.s,
                              backgroundColor: isDark ? '#26232A' : '#FAF6FF',
                            },
                          ]}
                          placeholder="Add new task..."
                          placeholderTextColor={colors.outline}
                          value={currentInputValue}
                          onChangeText={(text) =>
                            setTaskInputs((prev) => ({ ...prev, [chapter.id]: text }))
                          }
                          onSubmitEditing={() => handleAddTask(chapter.id)}
                        />
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: colors.primaryContainer, borderRadius: shapes.s }]}
                          onPress={() => handleAddTask(chapter.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[typography.labelLarge, { color: colors.onPrimaryContainer, fontWeight: '800' }]}>
                            ＋ Add
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </AppCard>
        );
      })}
    </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  subjectCard: {
    marginBottom: 16,
  },
  subjectHeader: {
    padding: 18,
  },
  subjectInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  expandIcon: {
    fontSize: 12,
  },
  chaptersContainer: {
    padding: 14,
    gap: 14,
  },
  chapterCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  tasksList: {
    gap: 4,
  },
  noTasks: {
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  createTaskRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addButton: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
