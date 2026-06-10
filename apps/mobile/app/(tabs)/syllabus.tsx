import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSyllabusStore } from '../../stores/syllabusStore';
import { TaskItem } from '../../components/TaskItem';
import { ProgressBar } from '../../components/ProgressBar';
import { calculateChapterProgress, calculateSubjectProgress } from '../../utils/helpers';

export default function SyllabusScreen() {
  const subjects = useSyllabusStore((state) => state.getSubjects());
  const updateTaskStatus = useSyllabusStore((state) => state.updateTaskStatus);
  const deleteTask = useSyllabusStore((state) => state.deleteTask);

  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({
    'sub-math': true, // default expand the first subject
  });

  const toggleExpandSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Syllabus Progress</Text>
      <Text style={styles.subtitle}>
        Mark tasks status. Progress rolls up automatically.
      </Text>

      {subjects.map((subject) => {
        const isExpanded = !!expandedSubjects[subject.id];
        const subjectProgress = calculateSubjectProgress(subject.chapters);

        return (
          <View key={subject.id} style={styles.subjectCard}>
            {/* Subject Header */}
            <TouchableOpacity
              style={styles.subjectHeader}
              onPress={() => toggleExpandSubject(subject.id)}
              activeOpacity={0.7}
            >
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
              </View>
              <ProgressBar progress={subjectProgress} color="#3F51B5" />
            </TouchableOpacity>

            {/* Chapters & Tasks list */}
            {isExpanded && (
              <View style={styles.chaptersContainer}>
                {subject.chapters.map((chapter) => {
                  const chapterProgress = calculateChapterProgress(chapter.tasks);
                  const activeTasks = chapter.tasks.filter((t) => !t.deleted);

                  return (
                    <View key={chapter.id} style={styles.chapterCard}>
                      <View style={styles.chapterHeader}>
                        <Text style={styles.chapterName}>{chapter.name}</Text>
                        <ProgressBar progress={chapterProgress} color="#4CAF50" />
                      </View>

                      <View style={styles.tasksList}>
                        {activeTasks.length > 0 ? (
                          activeTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onStatusChange={updateTaskStatus}
                              onDelete={deleteTask}
                            />
                          ))
                        ) : (
                          <Text style={styles.noTasks}>No active tasks in this chapter.</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#78909C',
    marginBottom: 16,
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subjectHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  subjectInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  expandIcon: {
    fontSize: 12,
    color: '#78909C',
  },
  chaptersContainer: {
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    gap: 12,
  },
  chapterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  chapterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474F',
    flex: 1,
  },
  tasksList: {
    gap: 2,
  },
  noTasks: {
    fontSize: 12,
    color: '#BDBDBD',
    textAlign: 'center',
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 12,
    color: '#D50000',
  },
});
