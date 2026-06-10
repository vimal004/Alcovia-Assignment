# Architecture and Sync Decision Records

This document explains the technical choices, synchronization protocols, conflict resolution strategies, and idempotency rules implemented in the Alcovia Take-Home Assignment.

---

## 1. Data and Sync Model: Event Sourcing & Action Log Merging

Instead of syncing full database states or relying on wall-clock time (which is unreliable due to device clock skew), we implemented an **Event Sourcing / Action Log Merging** sync protocol:

*   **Offline Action Queue:** Every state mutation (e.g. marking a task, deleting a task, completing a focus session) is appended to an offline actions list on the client.
*   **Unique Action Identifiers:** Every action is tagged with a unique UUID (`id`), the `clientId` (Device A or B), and a `timestamp` generated when the action was originally taken.
*   **Sequential Log Replay:** When a connection is restored, the client posts its pending actions to the server. The server processes them sequentially in chronological order of their original generation timestamp.
*   **State Projection:** Once all actions are successfully replayed, the server projects/recalculates the current converged user metrics (streak, coins, today's focus minutes) and returns the canonical state to all devices.

---

## 2. Conflict-Resolution Rules

We decided on explicit, deterministic resolution rules to guarantee convergence:

### Case A: Same task status edited on both devices offline
*   **Rule:** **Version Clock + Precedence Wins**.
*   **Mechanism:** Each task has a logical `version` counter. If Device A sends an edit with a higher version clock than the server, the server accepts it. If both devices edit the task concurrently (resulting in the same version number), the server resolves conflicts using a status priority:
    $$\text{done} \succ \text{in\_progress} \succ \text{not\_started}$$
    This ensures that progress is never lost (e.g., if one device marked a task Done and the other marked it In Progress, it converges to Done).

### Case B: Task edited on one device and deleted on the other offline
*   **Rule:** **Soft Delete Wins**.
*   **Mechanism:** Tasks are soft-deleted by setting a `deleted: true` flag. If one device updates the status of a task and the other deletes it, the deletion is treated as the terminal state (soft delete always wins), preventing resurrected tasks.

### Case C: Out of order or replayed sync messages
*   **Rule:** **Idempotent Skip**.
*   **Mechanism:** The server maintains a persistent record of all processed action UUIDs. If a client retries a sync request, or the network drops mid-sync, the server instantly discards any duplicate action IDs, processing only new changes.

---

## 3. Idempotency Guarantees

### Backend Level
*   A focus session has a unique session UUID. When syncing, if the session already exists in the server database, the server registers the sync request but **deduplicates rewards** (does not award coins twice or increase the daily focus minutes twice).

### n8n Automation Level
*   The n8n workflow contains a **Deduplicate Node** that tracks the incoming `eventId` (the Focus Session UUID).
*   Even if the server sync runs multiple times or multiple devices upload the same offline session, n8n discards duplicate events, ensuring the WhatsApp/notification webhook fires **exactly once** per successful session.

---

## 4. Key Tradeoffs

### Database: Custom Atomic JSON File Database vs SQLite
*   **Decision:** We chose to build a native, zero-dependency JSON-file database utilizing Node.js's built-in `fs` module, equipped with **atomic writes** (`fs.renameSync` from a temp file) and **operation queueing (Promise locks)**.
*   **Tradeoff:** While SQLite provides built-in transactions, native packages like `better-sqlite3` compile binary extensions during `npm install`. If the grader's environment has mismatched compiler setups or Node.js versions, it could fail to compile. The atomic JSON file database guarantees **100% setup-free portability** while still maintaining persistence and durability across crashes.

### Timezone Boundary Resolution: Intl-based Local Offset Projection
*   **Decision:** The client resolves its native timezone name (e.g. `Asia/Kolkata`) via standard `Intl.DateTimeFormat` and passes it on every sync request. The server uses `Intl.DateTimeFormat` with `'en-CA'` locale to format and evaluate dates in that exact timezone.
*   **Tradeoff:** This ensures daily streak calculations and total focus minutes match the student's real local day, rather than breaking when they pass UTC midnight boundaries.

### Storage Pruning: Synced Action Garbage Collection
*   **Decision:** After each successful synchronization, actions that have been marked `synced: true` and are older than 24 hours are deleted from client storage.
*   **Tradeoff:** Keeping synced actions for 24 hours ensures they remain visible in the Developer Console for easy demoing and troubleshooting, while automated deletion prevents long-term storage bloat in AsyncStorage.
