export declare const STUDENT_ID = "student-001";
export type SessionStatus = 'running' | 'success' | 'failed';
export type FailReason = 'give_up' | 'app_switch';
export interface FocusSession {
    id: string;
    studentId: string;
    clientId: string;
    targetDuration: number;
    startedAt: string;
    endedAt: string | null;
    status: SessionStatus;
    failReason: FailReason | null;
    coinsEarned: number;
    version: number;
}
export type TaskStatus = 'not_started' | 'in_progress' | 'done';
export interface Task {
    id: string;
    chapterId: string;
    title: string;
    status: TaskStatus;
    updatedAt: string;
    version: number;
    deleted: boolean;
}
export interface Chapter {
    id: string;
    subjectId: string;
    name: string;
    tasks: Task[];
}
export interface Subject {
    id: string;
    name: string;
    chapters: Chapter[];
}
export interface StudentState {
    studentId: string;
    coins: number;
    streak: number;
    lastStreakDate: string | null;
    todayFocusMinutes: number;
    todayDate: string;
}
export type SyncActionType = 'focus_session_complete' | 'focus_session_fail' | 'task_status_change' | 'task_delete';
export interface SyncAction {
    id: string;
    clientId: string;
    studentId: string;
    type: SyncActionType;
    payload: any;
    timestamp: string;
    version: number;
    synced: boolean;
}
export type ClientId = 'client-A' | 'client-B';
export interface DeviceInfo {
    clientId: ClientId;
    isOnline: boolean;
}
//# sourceMappingURL=types.d.ts.map