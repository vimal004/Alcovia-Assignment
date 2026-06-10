# Alcovia Sync & Automation Engine

This repository contains an offline-first student focus dashboard and syllabus progress tracker built using React Native (Expo), Express, and n8n. It includes robust conflict resolution, delta-based synchronization, and event deduplication to ensure consistency across multiple clients sharing the same account.

---

## Technical Features & Implementation Scope

The solution covers the core offline-first requirements and implements several advanced architecture patterns:

### Core Capabilities
* **Offline-First Storage**: User actions are queued locally in Zustand and persisted via AsyncStorage, ensuring uninterrupted functionality during network outages.
* **State Convergence**: Multi-device state reconciles deterministically upon reconnection.
* **Idempotent Rewards**: Daily streaks and coins are credited exactly once, regardless of sync retries or multi-device sync collisions.
* **Idempotent Automation**: n8n workflows process session successes exactly once using event-level deduplication.

### Advanced Architectural Extensions
* **Delta Syncing**: Clients synchronize using a `lastSyncedAt` timestamp. The server returns only tasks modified since that timestamp (`changedTasks`), reducing bandwidth usage and client re-render overhead.
* **Two-Way Sync Loop**: Enables server-initiated updates (e.g., via WhatsApp replies hitting `/api/webhook/whatsapp-reply`) to reconcile down to clients using a lightweight, offline-resilient HTTP polling mechanism.
* **Partitioned Local Storage**: Supports isolated client profiles (`client-A`, `client-B`, `client-C`) within a single browser instance by appending partition keys to storage queries (`?device=A`).
* **Session Crash Recovery**: Automatically identifies stale sessions stuck in a `'running'` state on startup and marks them failed, keeping student metrics accurate.
* **Network Fault Resilience**: Automatically retries failed synchronizations using an exponential backoff schedule (`2s`, `4s`, `8s`) before pausing to conserve battery.
* **Property-Based Fuzz Testing**: Includes automated testing suites that shuffle randomized offline action queues across multiple devices to verify deterministic convergence.

---

## Repository Structure

```
├── apps
│   ├── server               # Express backend & database file layer
│   │   ├── src
│   │   │   ├── index.ts     # Sync server API, two-way loop & state calculation
│   │   │   ├── db.ts        # Thread-safe database read/write lock layer
│   │   │   └── __tests__    # Convergence & idempotency property tests
│   └── mobile               # React Native (Expo Web) client
│       ├── app              # Tab views (Focus, Syllabus, Dev Console)
│       ├── components       # UI widgets, timer, progress bars, and log views
│       └── stores           # Zustand state managers (sync, syllabus, focus, device)
├── packages
│   └── shared               # Shared TypeScript schemas and interfaces
├── n8n-workflow.json        # Core n8n automation export
└── n8n-workflow-extended.json # Extended n8n workflow for prototyping
```

---

## Setup & Installation

### Prerequisites
* Node.js (v18 or higher)
* npm (v9 or higher)

### 1. Install Dependencies
Run the following command from the root directory to install all packages:
```bash
npm install
```

### 2. Start the Backend Server
Start the Express server in a dedicated terminal window:
```bash
npm run server
```
* The server will run on `http://localhost:3001` and initialize `apps/server/db.json`.

### 3. Start the Mobile Client
Start the Expo client in a separate terminal window:
```bash
npm run mobile
```
* Press `w` to launch the application in your browser.

---

## Verification & Manual Testing Guide

To test synchronization and conflict resolution across multiple devices, open three isolated browser tabs:
1. **Device A**: `http://localhost:8081/?device=A`
2. **Device B**: `http://localhost:8081/?device=B`
3. **Device C**: `http://localhost:8081/?device=C`

### Test Case: Concurrent Offline Mutations
1. Open all three tabs.
2. In **Device A**, toggle the network status to **Offline** in the Developer Console.
3. In **Device B**, toggle the network status to **Offline** in the Developer Console.
4. On **Device A**, change the status of *"Linear Equations"* to **Done**.
5. On **Device B**, change the status of the same task *"Linear Equations"* to **In Progress**.
6. Set both **Device A** and **Device B** back **Online**.
7. Observe that all three tabs reconcile within 2 seconds. The task status converges deterministically to **Done** (based on status precedence rules), and the overall progress percentages recalculate identically across all clients.

---

## n8n Workflow Integration

The automation workflow runs locally and routes event alerts to a notification logging sink.

1. **Launch n8n**: Execute `npx n8n` in your terminal and open `http://localhost:5678`.
2. **Import Workflow**:
   * Create a new empty workflow in n8n.
   * Open the top-right menu and choose **Import from File**.
   * Select `n8n-workflow.json` from the project root.
3. **Activate Webhook**: Toggle the workflow status to **Active** in n8n.
4. **Link to Client**:
   * Copy the webhook URL from the Webhook node (typically `http://localhost:5678/webhook/focus-complete`).
   * Paste this URL into the **n8n Automation Console** in the app's Developer Console and save.
   * When a focus session finishes successfully, the backend dispatches a webhook to n8n, which processes it and logs the result in the console.

---

## Automated Verification

The project includes property-based fuzz tests to verify state convergence. These tests generate random sequences of offline status changes, edits, deletions, and focus updates, then assert that the server resolves the final state identically regardless of processing order.

To run the automated tests:
```bash
npm run test
```

---

## Conflict Resolution Summary

Detailed architectural justifications are documented in [DECISIONS.md](file:///Users/vimalmanoharan/Downloads/Alcovia-Assignment/DECISIONS.md).

* **Task Status Conflicts**: Resolved using logical version clocks and priority precedence:
  `done` > `in_progress` > `not_started`.
* **Edit vs. Delete Conflicts**: Deletes are treated as terminal. If one device deletes a task offline while another modifies it, the task remains soft-deleted.
* **Session Deduplication**: Sessions use UUID keys. The backend filters incoming sessions by ID to ensure rewards (coins, streaks) are credited exactly once, even if multiple devices sync the same session.

---

## Technical Limitations & Future Improvements

### What Was Left Out / Production Roadmap
1. **Network Listener Integration**: The client simulates offline mode via the Developer Panel UI. In a production build, the app would use `@react-native-community/netinfo` to subscribe to native device network state changes and automatically trigger sync sessions.
2. **Robust Outbound Webhook Retries**: If the local n8n service is down when a focus session completes, the Express webhook dispatch fails and logs an error without retrying. For production, outbound webhooks would be pushed to a transactional message queue (e.g., BullMQ or RabbitMQ) and retried with exponential backoff.
3. **Relational Database Migration**: To maintain simple local setup, the backend currently stores state in a thread-safe JSON file database. In production, this would be migrated to a relational database like PostgreSQL to support database-level isolation, query optimizations, and scale.
4. **Hybrid Logical Clocks (HLC)**: Action logs are sorted chronologically by client-generated timestamps. If a client device's clock is inaccurate or manipulated, actions could be applied in an incorrect order. A production system would employ Hybrid Logical Clocks to enforce monotonic ordering independent of physical clock drifts.
