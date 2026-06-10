# Alcovia Offline-First Sync & Automation Take-Home

This repository implements an offline-first mobile dashboard showing a study syllabus tracker and a focus timer session workspace. It features deterministic sync reconciliation across multiple devices using Node.js/Express, a zero-dependency atomic database, and an n8n automation pipeline.

---

## 1. Quick Start Guide

### Prerequisites
Make sure you have Node.js (v18+) installed.

### Step 1: Install Dependencies
Run from the root directory to install all packages for the workspaces:
```bash
npm install
```

### Step 2: Start the Backend Server
Run the Express server in a terminal window:
```bash
npm run server
```
The server will start on `http://localhost:3001` and create a local `db.json` database.

### Step 3: Start the Mobile Client
Run the Expo web server in another terminal window:
```bash
npm run mobile
```
Press `w` to open the app in your browser.

> **Testing on Two Devices:** To simulate two devices (Device A and Device B) concurrently, see [Section 3: How to Test the App](#3-how-to-test-the-app-two-device-setup) below for the step-by-step Incognito setup instructions.

---

## 2. Setting up n8n Automation

We run n8n locally to ensure zero external internet requirements (no ngrok required).

### Step 1: Start n8n
Run n8n in a new terminal window:
```bash
npx n8n
```
Open the n8n dashboard (usually at `http://localhost:5678`).

### Step 2: Import the Workflow
1. In the n8n dashboard, click **Workflows** -> **Add Workflow** (or **New**).
2. Click the three dots top-right of the canvas and select **Import from File**.
3. Select the `n8n-workflow.json` file located in the root of this project.
4. Click **Active** (toggle top-right) to enable the webhook listeners.

---

## 3. How to Test the App (3+ Device Setup)

To verify the offline-first sync engine and conflict resolution across multiple devices, you can simulate three devices (**Device A**, **Device B**, and **Device C**). We support two testing methodologies:

### Option A: Side-by-Side Browser Tabs (Isolated Storage Namespaces)
We have implemented **URL-based storage partitioning**. By appending `?device=A`, `?device=B`, or `?device=C` to the app URL, the tabs will automatically set their active client ID and completely partition their local storage (AsyncStorage) namespace. This allows you to test multiple devices in the same browser window side-by-side without state collisions:

1. **Device A (Tab 1):** Open `http://localhost:8081/?device=A` in a browser tab.
2. **Device B (Tab 2):** Open `http://localhost:8081/?device=B` in a second tab.
3. **Device C (Tab 3):** Open `http://localhost:8081/?device=C` in a third tab.
4. **Offline Sync Demo:**
   * Go to the **Dev Panel** in each tab. You will see that each tab correctly identifies as Device A, B, or C.
   * Toggle **Device A** and **Device B** offline using their online toggles.
   * Modify tasks or complete focus blocks on both offline tabs.
   * Toggle them online again and watch the changes reconcile instantly and automatically propagate to all online tabs (like Device C) via the background polling system.

### Option B: Using Dev Panel Presets (Single Tab Simulation)
If you prefer not to open multiple tabs, you can simulate multi-device synchronization from within a single tab:
1. Navigate to the **Dev Panel** in the app.
2. Under **Custom Presets** or **Pre-made Presets**, click any scenario button (e.g., *Task Delete vs Edit Conflict*).
3. The app will simulate offline edits on other devices and replay them chronologically, letting you watch state reconciliation directly in the **Real-time Synchronization Grid**.


---

## 4. Reconciling Conflict Presets

Inside the app, navigate to the **Dev Panel** tab to run automated conflict scenarios or configure custom limits:

### Custom Presets Section
* Customize parameters (e.g., Coin rewards, focus minutes, or task statuses) for Device A and Device B.
* Simulate custom offline scenarios and verify how the database reconciles them.

### Premade Scenarios
1. **Focus Session Merge:**
   * Toggles both devices offline.
   * Device A completes a Focus session; Device B completes another.
   * Reconnecting sums up coin rewards and study metrics, and fires the n8n webhook exactly once.
2. **Task Precedence Merge:**
   * Toggles both devices offline.
   * Device A marks a task "In Progress" with an older timestamp.
   * Device B marks the same task "Done" with a newer timestamp.
   * Reconnecting converges both devices to "Done" (latest state wins).
3. **Soft-Delete Merge:**
   * Toggles both devices offline.
   * Device A deletes a task; Device B edits the same task offline.
   * Reconnecting resolves the conflict by keeping the task deleted (deletion wins).

