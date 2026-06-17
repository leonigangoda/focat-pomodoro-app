const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, safeStorage, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const { execFile } = require('child_process')

const USER_DATA = app.getPath('userData')
const TASKS_FILE = path.join(USER_DATA, 'tasks.json')
const SETTINGS_FILE = path.join(USER_DATA, 'settings.json')
const API_KEY_FILE = path.join(USER_DATA, 'apikey.enc')
const NAME_FILE = path.join(USER_DATA, 'username.txt')

let mainWindow = null
let tray = null
let isQuitting = false
let focusGuardTimer = null
let distractionStartedAt = 0
let lastDistractionKey = ''
let lastFocusNudgeAt = 0
let focusSnoozeUntil = 0

const FOCUS_CHECK_INTERVAL_MS = 30 * 1000
const DISTRACTION_GRACE_MS = 90 * 1000
const FOCUS_NUDGE_COOLDOWN_MS = 15 * 60 * 1000
const FOCUS_SNOOZE_MS = 5 * 60 * 1000

const DISTRACTING_APPS = [
  'discord', 'steam', 'epicgameslauncher', 'spotify', 'netflix', 'vlc',
  'telegram', 'whatsapp', 'snapchat', 'tiktok', 'instagram',
]

const DISTRACTING_TITLE_KEYWORDS = [
  'facebook', 'instagram', 'tiktok', 'twitter', 'x.com', 'reddit',
  'youtube', 'netflix', 'twitch', 'pinterest', 'snapchat', 'discord',
  'threads', 'tumblr', '9gag', 'prime video', 'disney+', 'hulu',
]

const BROWSER_PROCESSES = [
  'chrome', 'msedge', 'firefox', 'brave', 'opera', 'operagx', 'vivaldi',
]

function createWindow({ startHidden = false } = {}) {
  mainWindow = new BrowserWindow({
    width: 1020,
    height: 620,
    resizable: false,
    center: true,
    frame: false,
    transparent: false,
    show: false,
    backgroundColor: '#FFE656',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    titleBarStyle: 'hidden',
  })

  mainWindow.once('ready-to-show', () => {
    if (!startHidden) mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    mainWindow.hide()
  })

  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function readJSON(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch { return fallback }
}

function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

function loadSettings() {
  return readJSON(SETTINGS_FILE, {
    catName: 'Miso',
    catAccessory: 'chef-hat',
    defaultTimer: 25,
    musicVolume: 0.5,
    musicTrack: 0,
    studyPattern: '',
    focusGuardEnabled: true,
    focusGuardStartAtLogin: true,
  })
}

function showMainWindow() {
  if (!mainWindow) createWindow()
  mainWindow?.show()
  if (mainWindow?.isMinimized()) mainWindow.restore()
  mainWindow?.focus()
}

function createTray() {
  if (tray) return
  const iconPath = path.join(__dirname, '../public/icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('focat')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open focat', click: showMainWindow },
    { label: 'Snooze focus nudges for 5 minutes', click: () => { focusSnoozeUntil = Date.now() + FOCUS_SNOOZE_MS } },
    { type: 'separator' },
    { label: 'Quit focat', click: () => { isQuitting = true; app.quit() } },
  ]))
  tray.on('click', showMainWindow)
}

function configureBackgroundStartup() {
  const settings = loadSettings()
  app.setLoginItemSettings({
    openAtLogin: settings.focusGuardStartAtLogin !== false,
    args: ['--hidden'],
  })
}

// --- API Key (Gemini) ---
function saveApiKey(key) {
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(API_KEY_FILE, safeStorage.encryptString(key))
  } else {
    fs.writeFileSync(API_KEY_FILE, key, 'utf8')
  }
}

function loadApiKey() {
  try {
    if (!fs.existsSync(API_KEY_FILE)) return null
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(fs.readFileSync(API_KEY_FILE))
    }
    return fs.readFileSync(API_KEY_FILE, 'utf8')
  } catch { return null }
}

function loadConfiguredApiKey() {
  return loadApiKey()
    || process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || null
}

// --- User Name ---
function saveName(name) {
  fs.mkdirSync(path.dirname(NAME_FILE), { recursive: true })
  fs.writeFileSync(NAME_FILE, name, 'utf8')
}

function loadName() {
  try {
    if (!fs.existsSync(NAME_FILE)) return null
    return fs.readFileSync(NAME_FILE, 'utf8').trim() || null
  } catch { return null }
}

function loadNextStudyTarget() {
  const data = readJSON(TASKS_FILE, { tasks: [] })
  const tasks = Array.isArray(data.tasks) ? data.tasks : []
  for (const task of tasks) {
    if (task.status === 'done') continue
    const subtask = task.subtasks?.find(s => s.status !== 'done')
    return subtask?.title || task.title
  }
  return null
}

function getActiveWindowInfo() {
  if (process.platform !== 'win32') return Promise.resolve(null)

  const script = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class FocatWinApi {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
$handle = [FocatWinApi]::GetForegroundWindow()
$title = New-Object System.Text.StringBuilder 1024
[void][FocatWinApi]::GetWindowText($handle, $title, $title.Capacity)
$processId = 0
[void][FocatWinApi]::GetWindowThreadProcessId($handle, [ref]$processId)
$process = Get-Process -Id $processId -ErrorAction SilentlyContinue
[PSCustomObject]@{
  processName = $process.ProcessName
  title = $title.ToString()
  path = $process.Path
} | ConvertTo-Json -Compress
`

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 5000, windowsHide: true },
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null)
          return
        }
        try {
          resolve(JSON.parse(stdout))
        } catch {
          resolve(null)
        }
      }
    )
  })
}

function classifyDistraction(info) {
  if (!info?.processName) return null
  const processName = String(info.processName).toLowerCase()
  const title = String(info.title || '').toLowerCase()

  if (processName.includes('focat') || processName.includes('electron')) return null

  const appMatch = DISTRACTING_APPS.find(appName => processName.includes(appName))
  if (appMatch) {
    return { label: appMatch, key: `${processName}:${appMatch}` }
  }

  const isBrowser = BROWSER_PROCESSES.some(browserName => processName.includes(browserName))
  const titleMatch = DISTRACTING_TITLE_KEYWORDS.find(keyword => title.includes(keyword))
  if (isBrowser && titleMatch) {
    return { label: titleMatch, key: `${processName}:${titleMatch}` }
  }

  return null
}

function showFocusNudge(distraction, studyTarget) {
  if (!Notification.isSupported()) return

  const targetLine = studyTarget ? ` Try one tiny step: ${studyTarget}` : ''
  const notification = new Notification({
    title: 'focat',
    body: `Doomscrolling? How about we complete one single task and get back to it?${targetLine}`,
    actions: [
      { type: 'button', text: 'Remind me in 5 mins' },
      { type: 'button', text: 'Okay' },
    ],
    closeButtonText: 'Okay',
    timeoutType: 'never',
  })

  notification.on('action', (_event, index) => {
    if (index === 0) {
      focusSnoozeUntil = Date.now() + FOCUS_SNOOZE_MS
      return
    }
    showMainWindow()
  })
  notification.on('click', showMainWindow)
  notification.show()
  lastFocusNudgeAt = Date.now()
}

async function checkFocusGuard() {
  const settings = loadSettings()
  if (settings.focusGuardEnabled === false) return
  if (Date.now() < focusSnoozeUntil) return

  const info = await getActiveWindowInfo()
  const distraction = classifyDistraction(info)
  if (!distraction) {
    distractionStartedAt = 0
    lastDistractionKey = ''
    return
  }

  if (distraction.key !== lastDistractionKey) {
    lastDistractionKey = distraction.key
    distractionStartedAt = Date.now()
    return
  }

  const hasBeenDistractedLongEnough = Date.now() - distractionStartedAt >= DISTRACTION_GRACE_MS
  const cooledDown = Date.now() - lastFocusNudgeAt >= FOCUS_NUDGE_COOLDOWN_MS
  if (!hasBeenDistractedLongEnough || !cooledDown) return

  showFocusNudge(distraction, loadNextStudyTarget())
}

function startFocusGuard() {
  if (focusGuardTimer) return
  checkFocusGuard()
  focusGuardTimer = setInterval(checkFocusGuard, FOCUS_CHECK_INTERVAL_MS)
}

// Window controls
ipcMain.on('win:minimize', () => mainWindow?.minimize())
ipcMain.on('win:close', () => mainWindow?.close())

// API key (Gemini)
ipcMain.handle('apikey:save', (_, key) => { saveApiKey(key); return { ok: true } })
ipcMain.handle('apikey:exists', () => !!loadConfiguredApiKey())

// User name
ipcMain.handle('name:save', (_, name) => { saveName(name); return { ok: true } })
ipcMain.handle('name:load', () => loadName())

// Tasks
ipcMain.handle('tasks:load', () => readJSON(TASKS_FILE, { tasks: [], archived: [] }))
ipcMain.handle('tasks:save', (_, data) => { writeJSON(TASKS_FILE, data); return { ok: true } })

// Settings
ipcMain.handle('settings:load', () => loadSettings())
ipcMain.handle('settings:save', (_, s) => {
  writeJSON(SETTINGS_FILE, { ...loadSettings(), ...s })
  configureBackgroundStartup()
  return { ok: true }
})

// AI decompose via Gemini REST API (free tier, with retry for rate limits)
ipcMain.handle('ai:decompose', async (_, { task, deadline }) => {
  const apiKey = loadConfiguredApiKey()
  if (!apiKey) return { error: 'AI setup is missing a Gemini API key. Set GEMINI_API_KEY before launching focat.' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  
  const deadlinePrompt = deadline ? `\nAvailable Time/Deadline: "${deadline}". Plan the subtask estimates within this constraint where possible.` : ''
  const body = JSON.stringify({
    contents: [{
      parts: [{
        text: `Break this task into 3-6 actionable subtasks, each completable in 15-35 minutes.${deadlinePrompt}
Task: "${task}"
Return ONLY a JSON array, no markdown, no explanation:
[{"id":"1","title":"subtask","estimatedMinutes":25,"notes":"tip"},...]`
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    }
  })

  const MAX_RETRIES = 3
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      })

      // Rate limited — wait and retry
      if (response.status === 429) {
        const waitSec = Math.pow(2, attempt + 1) // 2s, 4s, 8s
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, waitSec * 1000))
          continue
        }
        return { error: 'Rate limited — the free Gemini tier allows 15 requests/min. Wait a moment and try again.' }
      }

      if (!response.ok) {
        const errBody = await response.text()
        throw new Error(`Gemini API error (${response.status}): ${errBody}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      const subtasks = JSON.parse(clean)

      return {
        ok: true,
        subtasks: subtasks.map((s, i) => ({
          id: `st-${Date.now()}-${i}`,
          title: s.title,
          estimatedMinutes: s.estimatedMinutes || 25,
          notes: s.notes || '',
          status: 'pending',
          timerSeconds: 0,
        })),
      }
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) return { error: err.message }
    }
  }
})

// Notification
ipcMain.handle('notify:done', (_, { title }) => {
  new Notification({ title: 'focat', body: `Timer done for "${title}" — are you?` }).show()
  return { ok: true }
})

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.on('second-instance', () => {
  showMainWindow()
})

app.whenReady().then(() => {
  app.setAppUserModelId('com.focat.app')
  configureBackgroundStartup()
  createTray()
  createWindow({ startHidden: process.argv.includes('--hidden') })
  startFocusGuard()
  app.on('activate', () => { showMainWindow() })
})

app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', () => {})
