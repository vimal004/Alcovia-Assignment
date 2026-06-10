# 🚀 Alcovia Offline-First Sync & Automation Engine

This repository implements a production-grade, offline-first student dashboard featuring a **Focus Session Timer** and a **Syllabus Tracker**. Built with **React Native (Expo)**, **Express**, and **n8n**, this project goes far beyond the core assignment requirements by implementing seven optional advanced extensions, including **URL-based storage partitioning**, **delta syncs**, **exponential backoff retries**, **stale session recovery**, and **property-based fuzz tests**.

---

## 🌟 Going Above and Beyond (Key Extensions Implemented)

We built this project to simulate real-world, high-traffic production environments where hostel Wi-Fi is patchy, app switch events are common, and students use multiple devices.

| Extension | Feature | Description | File Reference |
| :--- | :--- | :--- | :--- |
| **Ext 1** | **Two-Way Sync Loop** | Webhook listener (`/api/webhook/whatsapp-reply`) allows students to reply to WhatsApp alerts (e.g., `"done"` or `"snooze"`). Clients poll this delta list every **2 seconds** for real-time synchronization. | [index.ts](file:///Users/vimalmanoharan/Downloads/Alcovia-Assignment/apps/server/src/index.ts) |
| **Ext 2** | **n8n-First Prototype** | Prototyped the coins & streak rollup logic directly inside n8n Code nodes first before hardening it in Express to ensure transaction safety. | [n8n-workflow-extended.json](file:///Users/vimalmanoharan/Downloads/Alcovia-Assignment/n8n-workflow-extended.json) |
| **Ext 3** | **Crash & Force-Quit Recovery** | Auto-fails sessions stuck in a `'running'` state for $>10$ minutes on app startup (e.g., from browser reloads or force-quits) as `'app_switch'`. | [focusStore.ts](file:///Users/vimalmanoharan/Downloads/Alcovia-Assignment/apps/mobile/stores/focusStore.ts) |
| **Ext 4** | **3+ Concurrent Devices** | Added complete support for **Device C** (`client-C`) including dedicated cards, online toggles, and sync logs in the Developer Console. | [types.ts](file:///Users/vimalmanoharan/Downloads/Alcovia-Assignment/packages/shared/types.ts) |
| **Ext 5** | **Exponential Backoff Retry** | Automatically retries failed synchronizations on network drops at `2s`, `4s`, and `8s` intervals before pausing to conserve client battery. | [syncStore.ts](file:///Users/vimalmanoharan/Downloads/Alcovia-Assignment/apps/mobile/stores/syncStore.ts) |
| **Ext 6** | **Bandwidth-Efficient Delta Sync** | Clients pass a `lastSyncedAt` timestamp. The server returns only tasks changed since then (`changedTasks`), preventing redrawing of unchanged UI components. | [index.ts](file:///Users/vimalmanoharan/Downloads/Alcovia-Assignment/apps/server/src/index.ts) |
| **Ext 7** | **Property / Fuzz Test Suite** | A mathematically rigorous fuzzer that shuffles random arrays of concurrent edits/deletes across devices and asserts deterministic convergence. | [convergence.test.ts](file:///Users/vimalmanoharan/Downloads/Alcovia-Assignment/apps/server/src/__tests__/convergence.test.ts) |

---

## 🛠️ Step-by-Step Setup Guide

### 1. Install Dependencies
Ensure you are using Node.js (v18+). Run the following command from the root directory:
```bash
npm install
```

### 2. Start the Backend Express Server
Run the local Express server in a terminal window:
```bash
npm run server
```
* The server will boot on `http://localhost:3001` and initialize a persistent `db.json` database.

### 3. Start the Mobile Client
Run the Expo developer server in a separate terminal window:
```bash
npm run mobile
```
* Press `w` to launch the application inside your web browser.

---

## 📱 How to Test (3-Device Isolated Testing)

Because standard browser tabs share local storage, we implemented a custom **URL-based storage partitioning namespace** (`getPartitionedStorageName`). This partitions local storage keys per client. 

To test **Devices A, B, and C** running concurrently, open three tabs in the same browser window:
1. **Device A (Tab 1):** `http://localhost:8081/?device=A`
2. **Device B (Tab 2):** `http://localhost:8081/?device=B`
3. **Device C (Tab 3):** `http://localhost:8081/?device=C`

### Real-Time Auto-Refresh Sync Demo
* Open all three tabs.
* Go to the **Dev Panel** in **Tab 1** and click the toggle switch to set **Device A Offline**.
* Go to the **Syllabus** tab on **Tab 1** (Device A) and complete the task *"Linear Equations"*.
* Go to the **Dev Panel** in **Tab 2** and set **Device B Offline**.
* Go to the **Syllabus** tab on **Tab 2** (Device B) and mark the same task *"Linear Equations"* as *"In Progress"*.
* Toggle both **Device A** and **Device B** back **Online**.
* **Observe:** The states sync and reconcile in the background. Within **2 seconds**, all three tabs (including the idle Device C in Tab 3) will auto-refresh and display the resolved status (`"done"` via status precedence rules) and updated overall progress percentages!

---

## ⚡ Setting up the n8n Automation Workflow

Our local n8n setup requires no cloud dependencies or tunneling services (like ngrok).

1. **Launch n8n:** Run `npx n8n` in a new terminal window. Open the dashboard at `http://localhost:5678`.
2. **Import Workflow:** 
   * In n8n, create a new workflow.
   * Click the three dots (top-right) and select **Import from File**.
   * Choose the `n8n-workflow.json` (for the core notification flow) or `n8n-workflow-extended.json` (for the n8n-first prototype workflow) from the project root.
3. **Activate Webhook:** Click the **Active** toggle (top-right) in n8n.
4. **Link to Client:** 
   * Copy the test or production webhook URL from n8n (e.g., `http://localhost:5678/webhook/focus-complete`).
   * Paste it into the **n8n Automation Console** inside the app's **Dev Panel** and click save.
   * When you complete a focus session, the backend will dispatch the session to n8n, logging webhook triggers inside the developer console.

---

## 🔬 Running Convergence Property Tests
We created fuzzer property tests to verify conflict resolution convergence under network jitter, packet drops, and replayed events:
```bash
# Run convergence & idempotency fuzz tests
npm run test
```

---

## 🏛️ Conflict Resolution at a Glance

For detailed architectural justifications, see [DECISIONS.md](file:///Users/vimalmanoharan/Downloads/Alcovia-Assignment/DECISIONS.md).

* **Task Status Conflicts:** Logical Version Clock + Priority Precedence. If logical version numbers are equal (concurrent offline updates), the status priority resolves conflicts:
  $$\text{done} \succ \text{in\_progress} \succ \text{not\_started}$$
  This ensures progress is never lost.
* **Task Edit vs Delete:** Deletion is terminal. If one device edits and the other deletes offline, the task remains soft-deleted (`deleted: true`), avoiding resurrected tasks.
* **Focus Session Deduplication:** Every session is tagged with a UUID. The backend deduplicates session rewards on replay, and the n8n workflow contains a deduplication node to guarantee WhatsApp notifications fire **exactly once** per session.
