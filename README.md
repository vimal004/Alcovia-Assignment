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

## 3. How to Test the App (Two-Device Setup)

To verify the offline-first sync engine and conflict resolution, you need to simulate two devices (**Device A** and **Device B**). You can do this in two ways:

### Option A: Side-by-Side Browser Tabs (Manual Testing)
Since Expo Web saves client identity and action queues in the browser's Local Storage, two tabs in the same browser window will share state. To isolate them:

1. **Open Tab 1 (Normal Window):** Go to `http://localhost:8081` (or your Expo web URL). By default, this is **Device A** (`client-A`).
2. **Open Tab 2 (Incognito/Private Window):** Go to the same URL, navigate to the **Dev Panel** tab, and tap **Device B** (`client-B`) to set it as active.
3. You now have two isolated clients! Toggle them **Offline** using their respective cards in the Dev Panel, make conflicting edits on both tabs, toggle them **Online**, and watch them automatically sync and converge.

### Option B: Using Dev Panel Presets (Single Tab Simulation)
If you prefer not to manage multiple browser windows/incognito tabs, you can run all conflict scenarios within a single tab:
1. Navigate to the **Dev Panel** in the app.
2. Under **Custom Presets** or **Premade Scenarios**, click any scenario button.
3. The Dev Panel will automatically trigger offline changes for both **Device A** and **Device B** in memory and synchronize them to showcase deterministic state convergence instantly.

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

