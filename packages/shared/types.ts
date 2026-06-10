// ============================================
// Alcovia Shared Types
// ============================================

// --- Student ---
export const STUDENT_ID = 'student-001';

// --- Focus Sessions ---
export type SessionStatus = 'running' | 'success' | 'failed';
export type FailReason = 'give_up' | 'app_switch';

export interface FocusSession {
  id: string;
  studentId: string;
  clientId: string;
  targetDuration: number; // minutes
  startedAt: string;      // ISO timestamp
  endedAt: string | null;  // ISO timestamp
  status: SessionStatus;
  failReason: FailReason | null;
  coinsEarned: number;
  version: number;         // logical clock for sync
  lastHeartbeatAt?: string; // ISO timestamp of last active heartbeat
}

// --- Syllabus ---
export type TaskStatus = 'not_started' | 'in_progress' | 'done';

export interface Task {
  id: string;
  chapterId: string;
  title: string;
  status: TaskStatus;
  updatedAt: string;   // ISO timestamp
  version: number;     // logical clock for conflict resolution
  deleted: boolean;    // soft delete for conflict handling
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

// --- Student State ---
export interface StudentState {
  studentId: string;
  coins: number;
  streak: number;
  lastStreakDate: string | null; // ISO date string (YYYY-MM-DD)
  todayFocusMinutes: number;
  todayDate: string;            // ISO date string (YYYY-MM-DD)
}

// --- Sync ---
export type SyncActionType =
  | 'focus_session_complete'
  | 'focus_session_fail'
  | 'task_status_change'
  | 'task_delete';

export interface SyncAction {
  id: string;           // UUID - unique action identifier
  clientId: string;     // Which client/device created this
  studentId: string;
  type: SyncActionType;
  payload: any;         // The mutation data
  timestamp: string;    // ISO timestamp when action was created
  version: number;      // Logical clock value
  synced: boolean;      // Has this been sent to server?
}

// --- Device ---
// Extension 4: ClientId extended to support 3+ devices.
// The server sync API is agnostic to which client posts — any string clientId works.
export type ClientId = 'client-A' | 'client-B' | 'client-C';

export interface DeviceInfo {
  clientId: ClientId;
  isOnline: boolean;
}
