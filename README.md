# Dahoot 🚀

Dahoot is a premium, self-hosted educational quiz platform similar to Kahoot. It features a modern, responsive, glassmorphism-inspired UI and connects to a local **PocketBase** backend for real-time WebSocket communication and multiplayer synchronization.

## 🌟 Features

- **Teacher View / Question Bank Manager**: Create, edit, and delete questions directly in the application.
- **Multiple Question Types**:
  - **Multiple Choice**: Speed-based points answering.
  - **Sorting**: Arrange options in correct sequence.
  - **Drag & Drop**: Tap-to-place words in blank spaces (Duolingo style).
  - **Drop-Down**: Fill sentences by selecting options from dropdown selections.
  - **Categorize**: Tinder-style deck categorizer where students classify elements into custom groups.
- **Lobby Management**: Automated game codes, live student registration badges, clickable links, and scannable QR codes for seamless student entry.
- **Projector & Leaderboards**: Real-time timer count, skip capabilities, correctness distributions, and top-5 leaderboard animations.

---

## 🛠️ First-Time Setup Instructions

Follow these steps to get Dahoot up and running on your local machine:

### 1. Install Dependencies
Clone the repository and install Node dependencies:
```bash
npm install
```

### 2. Download PocketBase (Local Dev Version)
Install the correct PocketBase binary for your Operating System and CPU architecture automatically using the installation script:
```bash
npm run db:install
```
*This downloads the OS-specific ZIP of PocketBase, extracts the binary into `/pocketbase/`, and configures execution permissions.*

### 3. Configure Environment Variables
Copy the example configuration to create your local environment:
```bash
cp .env.example .env
```
Open the `.env` file and configure:
- `VITE_POCKETBASE_URL` (Defaults to `http://127.0.0.1:8090`)
- `POCKETBASE_ADMIN_EMAIL` (Email for backend admin, e.g. `dev@teacherjake.com`)
- `POCKETBASE_ADMIN_PASSWORD` (Password, e.g. `localAdmin`)

### 4. Setup & Seed Database Schema
Before running the app, provision your database collections and populate default quiz questions:
1. Make sure PocketBase is running (see next step).
2. Run the database configuration script:
   ```bash
   npm run db:setup
   ```
   *This script logs into your local PocketBase instance as a superuser, creates the required schemas for `rooms`, `players`, and `questions`, and seeds default demo questions representing all five question types.*

   **Non-destructive by default**: Running `npm run db:setup` will create missing collections and add new fields without deleting existing data.

   **Full reset**: To delete all `dahoot_*` collections and reseed default data, use the `--erase` flag:
   ```bash
   npm run db:setup -- --erase
   ```

---

## 🚀 Running the App

Start the PocketBase server and the Vite development server concurrently with a single command:
```bash
npm run dev
```

- **Open Student / Host Panel**: Navigate to `http://localhost:5173`.
- **Open PocketBase Admin Panel**: Navigate to `http://127.0.0.1:8090/_/` and log in with your configured email and password.

---

---

## 🚀 Deployment Commands

Dahoot supports flexible deployment workflows depending on your hosting setup:

- **Full Deployment (Backend + Frontend to VPS)**:
  ```bash
  npm run deploy
  ```
- **Backend Only Deployment (PocketBase hooks & schema checks)**:
  ```bash
  npm run deploy-backend
  ```
  *Use this when your frontend is hosted separately (e.g. Cloudflare Pages or Vercel) and you only need to sync PocketBase hooks and verify DB schemas.*

- **Frontend Only Deployment (Vite build & static asset rsync)**:
  ```bash
  npm run deploy-frontend
  ```

### ☁️ Cloudflare Pages (Frontend Hosting)
If you host your frontend on Cloudflare Pages via GitHub:
1. Connect your GitHub repository to Cloudflare Pages (Framework: `Vite`, Build command: `npm run build`, Output directory: `dist`).
2. Add `VITE_POCKETBASE_URL` to Cloudflare Pages environment variables.
3. Use `npm run deploy-backend` to manage and deploy your PocketBase server hooks & schema checks.

For complete step-by-step instructions on self-hosting Dahoot on a DigitalOcean Ubuntu droplet, see [DIGITALOCEAN_DEPLOYMENT.md](./DIGITALOCEAN_DEPLOYMENT.md).

