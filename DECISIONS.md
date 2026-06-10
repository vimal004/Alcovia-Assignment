# Architecture and Sync Decisions

This document details the architectural decisions, synchronization protocols, conflict resolution strategies, and technical tradeoffs implemented in the Alcovia offline-first application.

---

## 1. Data and Sync Model: Action Log Merging

Rather than synchronizing full database states or relying on physical wall-clock time (which is unreliable due to device clock skew), the application uses an **Action Log Merging** sync model.

### Client-Side Action Queue
Every local state mutation (e.g., changing a task status, deleting a task, starting or finishing a focus session) is appended to a local action log. Each action is modeled as follows:
```typescript
interface SyncAction {
  id: string;        // UUID to uniquely identify the action
  clientId: string;  // Originating client identifier (client-A, client-B, client-C)
  studentId: string;
  type: SyncActionType;
  payload: any;      // Mutation data (e.g., taskId and newStatus)
  timestamp: string; // ISO 8601 timestamp generated at the time of action
  version: number;   // Logical version clock
  synced: boolean;
}
```
Actions are persisted to local storage immediately. When a client reconnects, it dispatches all unsynced actions to the server.

### Chronological Processing and State Projection
Upon receiving actions, the server:
1. Sorts the client actions chronologically by their original generation timestamps.
2. Discards duplicate actions using a global registry of processed action IDs.
3. Sequentially applies each mutation to the canonical state.
4. Recalculates user metrics (streaks, total coins, and daily focus minutes) based on the full focus session history.
5. Returns the converged canonical state to all devices.

---

## 2. Conflict Resolution Rules

Explicit, deterministic resolution rules guarantee convergence across devices.

### Case A: Concurrent Task Status Changes
*   **Rule**: Version Clock with Status Precedence Fallback.
*   **Mechanism**: Every task contains a logical `version` number.
    *   If a client submits an action with a version higher than the server's task version, the server accepts the change and updates the task version.
    *   If both clients submit changes concurrently (resulting in equal version numbers), the server resolves the conflict using a deterministic status weight:
        `done` > `in_progress` > `not_started`
    *   This ensures that student progress is never accidentally rolled back by a stale concurrent edit.

### Case B: Task Edit vs. Delete
*   **Rule**: Soft Delete Wins.
*   **Mechanism**: Task deletion sets a `deleted: true` flag. If one device updates the status of a task while another deletes it offline, the deletion is treated as terminal. This prevents deleted tasks from being resurrected.

### Case C: Out-of-Order or Duplicate Messages
*   **Rule**: Idempotent Rejection.
*   **Mechanism**: The server maintains a persistent map of processed action IDs. If an action arrives multiple times (e.g., due to network retries), the server ignores the action.

---

## 3. Idempotency Guarantees

To ensure rewards and notifications are not duplicated, idempotency is enforced at multiple layers.

### Backend Level
Focus sessions are assigned a client-generated UUID when started. When a successful session is synced, the server registers it. If the same session ID is received again (e.g., replayed by the same device or uploaded from a second device), the server registers the event but does not award coins or increment streaks a second time.

### n8n Automation Level
The n8n workflow uses a **Deduplicate Node** that evaluates incoming events using the `eventId` (which matches the Focus Session UUID).
*   n8n maintains an internal cache of processed event IDs.
*   If the backend triggers the webhook multiple times for the same session during client sync retries, n8n discards duplicate events, ensuring that notifications (e.g., WhatsApp messages) fire exactly once per session.

---

## 4. Key Tradeoffs

### Database: Custom Thread-Safe JSON Database vs. SQLite
*   **Decision**: I chose to implement a native, zero-dependency JSON database with atomic writes (`fs.renameSync` from a temporary file) and serialized operation queuing using a Promise chain (`dbPromiseChain`).
*   **Tradeoff**: While SQLite provides built-in transactional capabilities, native bindings (such as `better-sqlite3`) compile binary extensions during installation. Mismatched node version environments can cause compilation failures. The custom atomic JSON database provides portability across platforms while maintaining thread safety and crash resilience.

### Timezone Boundary Alignment: Client-Offset Projection
*   **Decision**: Clients resolve their local timezone name (e.g., `Asia/Kolkata`) via `Intl.DateTimeFormat` and attach it to sync requests. The server uses this timezone to format and group timestamps when calculating streaks and daily focus totals.
*   **Tradeoff**: This ensures that daily streaks and today's focus minutes align with the student's real local day, rather than breaking when they pass UTC midnight boundaries.

### Local Action Pruning
*   **Decision**: After successful synchronization, actions marked as synced are kept in client storage for 24 hours before being deleted.
*   **Tradeoff**: Retaining synced actions for 24 hours increases storage consumption slightly, but it allows the Developer Console to display sync histories for testing and diagnostics.

---

## 5. Architectural Decisions for Optional Extensions

### Bandwidth-Efficient Delta Syncing (Extension 6)
*   **Mechanism**: Clients pass their `lastSyncedAt` timestamp during sync. The server compares this timestamp with the tasks' `updatedAt` values and returns only modified items (`changedTasks`). The client applies this patch to its local memory instead of replacing the entire dataset.
*   **Benefit**: This reduces mobile data usage and UI re-render operations.

### Two-Way Sync Loop (Extension 1)
*   **Mechanism**: Server-side changes made via WhatsApp webhook replies (`/api/webhook/whatsapp-reply`) increment the task version clock and record a global `lastServerMutationAt` timestamp.
*   **Benefit**: Clients poll `/api/pending-mutations?since=...` every few seconds when online. If changes are detected, a sync is triggered automatically, enabling real-time convergence without the battery-drain overhead of persistent WebSockets.

### Stale Session Recovery (Extension 3)
*   **Mechanism**: On app mount, `recoverStaleSessions` checks for sessions in client storage that have been in the `'running'` state for longer than 10 minutes. It marks them as `'failed'` with a reason of `'app_switch'`.
*   **Benefit**: This prevents stale timers from blocking the UI after an app crash or reload, keeping focus statistics accurate.
