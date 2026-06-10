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

> **Testing on Two Devices:** To simulate two devices (Device A and Device B), you can simply use the built-in Client toggles in the Dev Panel inside the app interface. Alternatively, open one browser tab in normal mode and another browser tab in Incognito Mode so their `AsyncStorage` values are namespaces.

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

## 3. Reconciling Conflict Presets

Inside the app, navigate to the **Simulation Control Deck ⚙️** (tab in bottom navigation) to run automated conflict scenarios:

1.  **Focus Session Merge:**
    *   Toggles Device A and Device B offline.
    *   Saves focus successes on both devices with pending rewards.
    *   Reconnecting both devices syncs them, merges coins correctly, and fires the webhook.
2.  **Task Precedence Merge:**
    *   Toggles both devices offline.
    *   Edits the same task status to "Done" on Device A and "In Progress" on Device B.
    *   Reconnecting merges the state to "Done".
3.  **Soft-Delete Merge:**
    *   Toggles both devices offline.
    *   Deletes a task on Device A and edits it on Device B.
    *   Reconnecting ensures the task remains deleted (soft-delete wins).
