# focat 🐱

ADHD focus timer with AI task decomposition, a pixel cat chef, and lofi music.

**Stack:** Electron 33 + React 18 + Vite + Claude API

---

## Quick start

### Prerequisites
- Node.js v18 or higher → https://nodejs.org

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/focat.git
cd focat
npm install
```

### 2. Add audio files
Download 5 royalty-free MP3s from https://pixabay.com/music/ and place them in `public/sounds/`:
```
public/sounds/white-noise.mp3
public/sounds/brown-noise.mp3
public/sounds/lofi-rain.mp3
public/sounds/deep-focus.mp3
public/sounds/midnight-study.mp3
```
The app runs without them (music player shows but won't play).

### 3. Run in dev mode
```bash
npm run dev
```
This starts Vite (React UI) on port 5173 and Electron side-by-side.

On first launch the app asks for your Anthropic API key. Get one at https://console.anthropic.com — it's stored encrypted on your device using OS-level encryption (Keychain on Mac, DPAPI on Windows).

If you want to test without an API key, just press Escape on the prompt — tasks will still work but won't be AI-decomposed (each task becomes a single subtask).

---

## Build for distribution

```bash
npm run build:mac    # → dist/focat-1.0.0.dmg
npm run build:win    # → dist/focat Setup 1.0.0.exe
npm run build:linux  # → dist/focat-1.0.0.AppImage
```

---

## Project structure

```
focat/
├── electron/
│   ├── main.js          ← Window (1020×620 fixed), IPC, Claude API, storage
│   └── preload.js       ← Secure bridge to renderer
├── src/
│   ├── App.jsx           ← Root layout, state wiring
│   ├── App.module.css    ← Layout styles
│   ├── index.css         ← Global styles, animations
│   ├── hooks/
│   │   ├── useTimer.js         ← FSM: idle→running→done→overtime/finished
│   │   ├── useTaskStore.js     ← Tasks, AI decompose, persistence
│   │   ├── useSettings.js      ← Cat customization, preferences
│   │   └── useMusicPlayer.js   ← Howler.js wrapper
│   └── components/
│       ├── TitleBar.jsx/css     ← Top bar with minimize/close (top right)
│       ├── BigClock.jsx/css     ← Ring timer + cat animation
│       ├── TaskInput.jsx/css    ← Search bar → AI decompose on Enter
│       ├── SubtaskList.jsx/css  ← Subtask cards, click to start timer
│       ├── MusicPlayer.jsx/css  ← Play/pause/skip + volume
│       ├── TimerDoneModal.jsx   ← "Timer done... are you?"
│       ├── LoadingScreen.jsx    ← Cat licking paws on boot
│       └── ApiKeyPrompt.jsx     ← First-run API key entry
├── public/
│   └── sounds/           ← MP3 files go here
├── index.html
├── vite.config.js
└── package.json
```

---

## Timer behaviour

| State | Cat | Ring |
|---|---|---|
| Idle | Licking paw | Empty |
| Running | Stirring pot with chef hat | Yellow filling up |
| Last 2 min | Stirring faster | Gold |
| Done | Modal pops up | Full |
| Yes (done) | Happy arms up, dish served | Full gold |
| Not yet | Falls asleep, Zzz | Turns red |

---

## Color palette

| Token | Hex | Used for |
|---|---|---|
| `--yellow` | `#FFE656` | Main background |
| `--ring-empty` | `#EFCB00` | Ring track, task box bg |
| `--ring-fill` | `#9F8700` | Ring progress, current time |
| `--white` | `#FFFFFF` | Timer card, active task card, music player |
| `--border` | `#FFEF95` | All component borders |
| `--time-color` | `#9F8700` | Clock time + date text |

Font: **Gaegu** (Google Fonts) — used for all text throughout.

---

## Complete Windows PC setup guide

This section explains how to download the project from GitHub and run it locally on a Windows PC. You do not need to install Electron separately; it is installed with the project dependencies.

### What you need

Install the following before downloading the project:

1. **Node.js 18 or newer** — Node.js 20 LTS is recommended: https://nodejs.org
2. **Git for Windows** — only required if you want to clone the repository: https://git-scm.com/download/win
3. A terminal such as **PowerShell**, **Command Prompt**, or the terminal included with Visual Studio Code.

Confirm that Node.js and npm are available by opening a new terminal and running:

```powershell
node --version
npm --version
```

Both commands should print a version number. If either command is not recognized, restart the terminal after installing Node.js. If it is still unavailable, reinstall Node.js and enable the option that adds Node.js to `PATH`.

### Option A: Download the project as a ZIP

1. Open the project's GitHub page.
2. Select **Code**, then select **Download ZIP**.
3. Open your Downloads folder and extract the ZIP file.
4. Open the extracted project folder. Use the folder that directly contains `package.json`.
5. Right-click inside that folder and choose **Open in Terminal**, or open PowerShell and move into the folder manually:

```powershell
cd "C:\path\to\the\extracted\focat"
```

Replace the example path with the actual location of the extracted folder.

### Option B: Clone the project with Git

On the project's GitHub page, select **Code** and copy the HTTPS repository URL. Then run:

```powershell
git clone REPOSITORY_URL
cd focat
```

Replace `REPOSITORY_URL` with the HTTPS URL copied from GitHub. For example, a repository URL normally looks like `https://github.com/username/focat.git`.

### Install the project dependencies

Make sure the terminal is in the folder containing `package.json`, then run:

```powershell
npm install
```

The first installation can take several minutes because npm downloads Electron and the other project dependencies. Keep the terminal open until the command completes and a `node_modules` folder has been created.

Because the repository includes `package-lock.json`, you can alternatively perform an exact clean installation with:

```powershell
npm ci
```

Use either `npm install` or `npm ci`; running both is unnecessary.

### Run the app in development mode

From the project folder, run:

```powershell
npm run dev
```

This starts the Vite development server and then opens the focat desktop application in Electron. Keep the terminal running while using the app. Source-code changes are automatically reflected during development.

To stop the development server and close the running process, return to the terminal and press:

```text
Ctrl + C
```

For future launches, open a terminal in the project folder and run `npm run dev` again. You only need to repeat `npm install` when dependencies change or when `node_modules` has been removed.

### Optional music files

The app can run without locally downloaded music. To use local tracks, place the MP3 files listed earlier in this README inside:

```text
public/sounds/
```

Do not place app assets directly inside `dist`. That folder is generated automatically and is cleared whenever a new production build is created. Permanent images, GIFs, and other static files belong under `public`, such as `public/assets/cats/`.

### Create a Windows installer

After installing the dependencies, run:

```powershell
npm run build:win
```

This creates the packaged Windows application and installer in the generated `dist` output folder. Building can take several minutes. The installer can then be copied to another compatible Windows PC and run without starting the development server.

Windows may display a SmartScreen warning for a locally built, unsigned installer. Review the file and confirm that it is the installer you just created before choosing to run it.

### Common Windows problems

#### PowerShell says scripts are disabled

If PowerShell blocks `npm`, use the Windows command wrapper instead:

```powershell
npm.cmd install
npm.cmd run dev
```

#### The terminal cannot find `package.json`

The terminal is in the wrong folder. Run `dir` and confirm that `package.json` is listed, then run the npm command again.

#### Port 5173 is already in use

Close any other focat development terminal or another Vite process, then run `npm run dev` again. Restarting the PC will also release a process that is still holding the port.

#### Installation is incomplete or dependencies are corrupted

Close the app, delete the project's `node_modules` folder, and reinstall:

```powershell
npm install
```

Do not delete `src`, `public`, `electron`, `package.json`, or `package-lock.json`.

#### Images or cat animations are missing

Confirm that these files exist in `public/assets/cats/` and that their names have not been changed:

```text
cat-idle.gif
timer-cat.gif
focat-logo.png
focat-logo.svg
```

Then stop and restart the development server. For a packaged version, create a new build after restoring the files.
