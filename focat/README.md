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
│       ├── CatSvg.jsx           ← Pixel cat: idle/cooking/done/tired
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
