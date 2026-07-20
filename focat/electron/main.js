const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, safeStorage, screen, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const { execFile } = require('child_process')
const { pathToFileURL } = require('url')

const USER_DATA = app.getPath('userData')
const TASKS_FILE = path.join(USER_DATA, 'tasks.json')
const EVENTS_FILE = path.join(USER_DATA, 'events.json')
const SETTINGS_FILE = path.join(USER_DATA, 'settings.json')
const API_KEY_FILE = path.join(USER_DATA, 'apikey.enc')
const NAME_FILE = path.join(USER_DATA, 'username.txt')
const USAGE_FILE = path.join(USER_DATA, 'app-usage.json')

function loadDotEnv() {
  const envPath = path.resolve(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex < 0) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!key || process.env[key] !== undefined) continue
    process.env[key] = value
  }
}

loadDotEnv()

let mainWindow = null
let notificationWindow = null
let pendingNotificationData = null
let tray = null
let isQuitting = false
let focusGuardTimer = null
let eventReminderTimer = null
let currentDistractionSession = null
let activeUsageSample = null
let lastFocatInteractionAt = Date.now()
let lastStudyPromptAt = 0
let focusSnoozeUntil = 0

const FOCUS_CHECK_INTERVAL_MS = 15 * 1000
const EVENT_CHECK_INTERVAL_MS = 60 * 1000
const DISTRACTION_GRACE_MS = 2 * 60 * 1000
const DOOMSCROLL_TEN_MIN_MS = 10 * 60 * 1000
const DOOMSCROLL_THIRTY_MIN_MS = 30 * 60 * 1000
const APP_UNUSED_PROMPT_MS = 10 * 60 * 1000
const FOCUS_SNOOZE_MS = 5 * 60 * 1000
const NOTIFICATION_WIDTH = 380
const NOTIFICATION_HEIGHT = 220

// Apps/sites that COULD be used for studying (show "I'm studying" option)
const EDUCATIONAL_POSSIBLE = [
  'youtube', 'coursera', 'udemy', 'edx', 'khan academy', 'brilliant',
  'stackoverflow', 'github', 'medium', 'notion', 'google docs',
  'wikipedia', 'w3schools', 'mdn', 'leetcode', 'hackerrank',
]

const DISTRACTING_APPS = [
  'discord', 'netflix', 'telegram', 'whatsapp', 'snapchat', 'tiktok',
  'instagram', 'facebook', 'messenger',
]

const DISTRACTING_TITLE_KEYWORDS = [
  'facebook', 'instagram', 'tiktok', 'twitter', 'x.com', 'reddit',
  'youtube', 'netflix', 'twitch', 'pinterest', 'snapchat', 'discord',
  'threads', 'tumblr', '9gag', 'prime video', 'disney+', 'hulu',
]

const BROWSER_PROCESSES = [
  'chrome', 'msedge', 'firefox', 'brave', 'opera', 'operagx', 'vivaldi',
]

const DOOMSCROLL_STEPS = [
  {
    id: 'first',
    afterMs: DISTRACTION_GRACE_MS,
    level: 1,
    sound: 'meow-normal.wav',
    message: 'Caught you doomscrolling! Take 2 mins to schedule your tasks before you go ahead.',
  },
  {
    id: 'ten',
    afterMs: DOOMSCROLL_TEN_MIN_MS,
    level: 2,
    sound: 'meow-annoyed.wav',
    message: 'Another 10 mins on doomscrolling. Can we start small?',
  },
  {
    id: 'thirty',
    afterMs: DOOMSCROLL_THIRTY_MIN_MS,
    level: 3,
    sound: 'meow-angry.wav',
    message: 'You literally spent 30 mins doomscrolling! Tell me one thing you have to do.',
  },
]

const EVENT_REMINDER_STEPS = [
  { id: '10h', beforeMs: 10 * 60 * 60 * 1000, label: '10 hours left', level: 2, sound: 'meow-attention.wav' },
  { id: '1d', beforeMs: 24 * 60 * 60 * 1000, label: 'Tomorrow', level: 1, sound: 'meow-sweet.wav' },
  { id: '2d', beforeMs: 2 * 24 * 60 * 60 * 1000, label: '2 days left', level: 1, sound: 'meow-sweet.wav' },
  { id: '4d', beforeMs: 4 * 24 * 60 * 60 * 1000, label: '4 days left', level: 1, sound: 'meow-normal.wav' },
  { id: '7d', beforeMs: 7 * 24 * 60 * 60 * 1000, label: '7 days left', level: 1, sound: 'meow-normal.wav' },
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
    lastFocatInteractionAt = Date.now()
    mainWindow.hide()
  })

  mainWindow.on('focus', () => {
    lastFocatInteractionAt = Date.now()
    currentDistractionSession = null
    hideNotificationWindow()
  })

  mainWindow.on('show', () => {
    lastFocatInteractionAt = Date.now()
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

function loadEvents() {
  const data = readJSON(EVENTS_FILE, { events: [] })
  return { events: Array.isArray(data.events) ? data.events : [] }
}

function showMainWindow() {
  if (!mainWindow) createWindow()
  mainWindow?.show()
  if (mainWindow?.isMinimized()) mainWindow.restore()
  mainWindow?.focus()
  lastFocatInteractionAt = Date.now()
  currentDistractionSession = null
}

function getSoundUrl(fileName) {
  const unpackedPath = path.join(__dirname, '../public/sounds', fileName)
  const packagedPath = path.join(process.resourcesPath || '', 'sounds', fileName)
  const filePath = app.isPackaged && fs.existsSync(packagedPath) ? packagedPath : unpackedPath
  return pathToFileURL(filePath).toString()
}

function positionNotificationWindow() {
  if (!notificationWindow) return
  const cursorPoint = screen.getCursorScreenPoint()
  const { workArea } = screen.getDisplayNearestPoint(cursorPoint)
  const x = Math.round(workArea.x + workArea.width - NOTIFICATION_WIDTH - 16)
  const y = Math.round(workArea.y + workArea.height - NOTIFICATION_HEIGHT - 16)
  notificationWindow.setBounds({ x, y, width: NOTIFICATION_WIDTH, height: NOTIFICATION_HEIGHT })
}

function deliverNotificationData() {
  if (!notificationWindow || notificationWindow.isDestroyed() || !pendingNotificationData) return
  positionNotificationWindow()
  notificationWindow.showInactive()
  notificationWindow.webContents.send('notif:show', pendingNotificationData)
  pendingNotificationData = null
}

function createNotificationWindow() {
  if (notificationWindow && !notificationWindow.isDestroyed()) return notificationWindow

  notificationWindow = new BrowserWindow({
    width: NOTIFICATION_WIDTH,
    height: NOTIFICATION_HEIGHT,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'notification-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  notificationWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  notificationWindow.loadFile(path.join(__dirname, 'notification.html'))
  notificationWindow.webContents.on('did-finish-load', deliverNotificationData)
  notificationWindow.on('closed', () => { notificationWindow = null })
  return notificationWindow
}

function hideNotificationWindow() {
  if (notificationWindow && !notificationWindow.isDestroyed()) notificationWindow.hide()
}

function showFocatNotification({ message, hint = 'Click to open focat.', level = 1, sound = 'meow-sweet.wav', showStudyOption = false, isFollowUp = false }) {
  pendingNotificationData = {
    message,
    hint,
    level,
    meowFile: isFollowUp ? null : getSoundUrl(sound),
    showStudyOption,
    isFollowUp,
  }

  const win = createNotificationWindow()
  if (!win.webContents.isLoading()) deliverNotificationData()
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

// --- API Key (Groq) ---
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
  const envKey = process.env.MY_API_KEY?.trim()
  return envKey || null
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

function getUsageDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function normalizeUsageName(info) {
  return String(info?.processName || 'unknown').trim().toLowerCase() || 'unknown'
}

function trackForegroundUsage(info, distraction, now = Date.now()) {
  if (!info?.processName) {
    activeUsageSample = null
    return
  }

  if (!activeUsageSample) {
    activeUsageSample = { info, distraction, sampledAt: now }
    return
  }

  const elapsedMs = Math.max(0, Math.min(now - activeUsageSample.sampledAt, FOCUS_CHECK_INTERVAL_MS * 2))
  const previousName = normalizeUsageName(activeUsageSample.info)
  if (elapsedMs < 1000 || previousName === 'focat' || previousName === 'electron') {
    activeUsageSample = { info, distraction, sampledAt: now }
    return
  }

  const usage = readJSON(USAGE_FILE, { days: {} })
  const dateKey = getUsageDateKey()
  const day = usage.days[dateKey] || { apps: {}, distractions: {} }

  const appEntry = day.apps[previousName] || { seconds: 0, lastSeenAt: null }
  appEntry.seconds += Math.round(elapsedMs / 1000)
  appEntry.lastSeenAt = new Date(now).toISOString()
  day.apps[previousName] = appEntry

  if (activeUsageSample.distraction?.label) {
    const label = activeUsageSample.distraction.label
    const distractionEntry = day.distractions[label] || { seconds: 0, lastSeenAt: null }
    distractionEntry.seconds += Math.round(elapsedMs / 1000)
    distractionEntry.lastSeenAt = new Date(now).toISOString()
    day.distractions[label] = distractionEntry
  }

  usage.days[dateKey] = day
  writeJSON(USAGE_FILE, usage)
  activeUsageSample = { info, distraction, sampledAt: now }
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
    return { label: appMatch, key: `${processName}:${appMatch}`, educational: false }
  }

  const isBrowser = BROWSER_PROCESSES.some(browserName => processName.includes(browserName))
  const titleMatch = DISTRACTING_TITLE_KEYWORDS.find(keyword => title.includes(keyword))
  if (isBrowser && titleMatch) {
    // Check if this could be an educational site
    const isEducational = EDUCATIONAL_POSSIBLE.some(edu => title.includes(edu))
    return { label: titleMatch, key: `${processName}:${titleMatch}`, educational: isEducational }
  }

  return null
}

function getStudyHint(distraction) {
  const target = loadNextStudyTarget()
  if (target) return `Open focat and do one tiny step: ${target}`
  if (distraction?.label) return `Detected: ${distraction.label}. Click to open focat.`
  return 'Click to open focat.'
}

function showFocusNudge(distraction, step) {
  showFocatNotification({
    message: step.message,
    hint: getStudyHint(distraction),
    level: step.level,
    sound: step.sound,
    showStudyOption: distraction?.educational === true,
  })
}

function maybeShowIdleStudyPrompt(now) {
  const focatIsActive = mainWindow?.isVisible() && mainWindow?.isFocused()
  if (focatIsActive) {
    lastFocatInteractionAt = now
    return
  }

  const appUnusedLongEnough = now - lastFocatInteractionAt >= APP_UNUSED_PROMPT_MS
  const promptCooledDown = now - lastStudyPromptAt >= APP_UNUSED_PROMPT_MS
  if (!appUnusedLongEnough || !promptCooledDown) return

  showFocatNotification({
    message: 'Hey, can you tell me the tasks you have to do today? Click me.',
    hint: 'Open focat and write the first thing on your mind.',
    level: 1,
    sound: 'meow-sweet.wav',
  })
  lastStudyPromptAt = now
}

function formatEventTime(startAt) {
  const date = new Date(startAt)
  if (Number.isNaN(date.getTime())) return 'soon'
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function checkEventReminders() {
  const focatIsActive = mainWindow?.isVisible() && mainWindow?.isFocused()
  if (focatIsActive) return

  const data = loadEvents()
  const now = Date.now()
  let changed = false
  let reminderToShow = null

  const events = data.events.map(event => {
    const startMs = new Date(event.startAt).getTime()
    if (!event?.id || Number.isNaN(startMs) || startMs <= now) return event

    const remindersSent = Array.isArray(event.remindersSent) ? event.remindersSent : []

    let beforeMs = null
    let label = ''
    if (event.reminder && event.reminder.type !== 'none') {
      const type = event.reminder.type
      if (type === '30m') {
        beforeMs = 30 * 60 * 1000
        label = '30 minutes'
      } else if (type === '1d') {
        beforeMs = 24 * 60 * 60 * 1000
        label = '1 day'
      } else if (type === '3d') {
        beforeMs = 3 * 24 * 60 * 60 * 1000
        label = '3 days'
      } else if (type === '7d') {
        beforeMs = 7 * 24 * 60 * 60 * 1000
        label = '7 days'
      } else if (type === 'custom') {
        beforeMs = (event.reminder.value || 0) * 60 * 1000
        const val = event.reminder.customValue || '0'
        const unit = event.reminder.customUnit || 'minutes'
        label = `${val} ${val === '1' ? unit.replace(/s$/, '') : unit}`
      }
    }

    if (beforeMs === null) return event

    const timeLeftMs = startMs - now
    if (timeLeftMs > 0 && timeLeftMs <= beforeMs) {
      const reminderId = `${event.reminder.type}-${beforeMs}`
      if (remindersSent.includes(reminderId)) return event

      if (!reminderToShow) {
        reminderToShow = { event, label }
        changed = true
        return { ...event, remindersSent: [...remindersSent, reminderId] }
      }
    }

    return event
  })

  if (changed) writeJSON(EVENTS_FILE, { events })
  if (!reminderToShow) return

  const message = `"${reminderToShow.event.title}" is coming in ${reminderToShow.label}, let's start small`

  showFocatNotification({
    message,
    hint: `Starts ${formatEventTime(reminderToShow.event.startAt)}. Click to open focat.`,
    level: 1,
    sound: 'meow-normal.wav',
  })
}

async function checkFocusGuard() {
  const settings = loadSettings()
  if (settings.focusGuardEnabled === false) return
  const now = Date.now()
  maybeShowIdleStudyPrompt(now)
  if (now < focusSnoozeUntil) return

  const info = await getActiveWindowInfo()
  const distraction = classifyDistraction(info)
  trackForegroundUsage(info, distraction, now)

  if (!distraction) {
    currentDistractionSession = null
    return
  }

  if (mainWindow?.isFocused()) {
    currentDistractionSession = null
    return
  }

  if (!currentDistractionSession || distraction.key !== currentDistractionSession.key) {
    currentDistractionSession = {
      key: distraction.key,
      label: distraction.label,
      startedAt: now,
      notifiedSteps: new Set(),
    }
    return
  }

  const elapsed = now - currentDistractionSession.startedAt
  let stepToShow = null
  for (const step of DOOMSCROLL_STEPS) {
    if (elapsed >= step.afterMs && !currentDistractionSession.notifiedSteps.has(step.id)) {
      stepToShow = step
    }
  }
  if (!stepToShow) return

  currentDistractionSession.notifiedSteps.add(stepToShow.id)
  showFocusNudge(distraction, stepToShow)
}

function startFocusGuard() {
  if (focusGuardTimer) return
  checkFocusGuard()
  focusGuardTimer = setInterval(checkFocusGuard, FOCUS_CHECK_INTERVAL_MS)
}

function startEventReminders() {
  if (eventReminderTimer) return
  checkEventReminders()
  eventReminderTimer = setInterval(checkEventReminders, EVENT_CHECK_INTERVAL_MS)
}

// Window controls
ipcMain.on('win:minimize', () => mainWindow?.minimize())
ipcMain.on('win:close', () => mainWindow?.close())

// API key (Groq)
ipcMain.handle('apikey:save', (_, key) => { saveApiKey(key); return { ok: true } })
ipcMain.handle('apikey:exists', () => !!loadConfiguredApiKey())

// User name
ipcMain.handle('name:save', (_, name) => { saveName(name); return { ok: true } })
ipcMain.handle('name:load', () => loadName())

// Tasks
ipcMain.handle('tasks:load', () => readJSON(TASKS_FILE, { tasks: [], archived: [] }))
ipcMain.handle('tasks:save', (_, data) => { writeJSON(TASKS_FILE, data); return { ok: true } })

// Events
ipcMain.handle('events:load', () => loadEvents())
ipcMain.handle('events:save', (_, data) => {
  writeJSON(EVENTS_FILE, { events: Array.isArray(data?.events) ? data.events : [] })
  return { ok: true }
})

// Settings
ipcMain.handle('settings:load', () => loadSettings())
ipcMain.handle('settings:save', (_, s) => {
  writeJSON(SETTINGS_FILE, { ...loadSettings(), ...s })
  configureBackgroundStartup()
  return { ok: true }
})

// AI decompose via Groq REST API (with retry for rate limits)
ipcMain.handle('ai:decompose', async (_, { task, deadline }) => {
  const apiKey = loadConfiguredApiKey()
  if (!apiKey) return { error: 'AI setup is missing an API key. Set MY_API_KEY before launching focat.' }

  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const deadlinePrompt = deadline ? `\nAvailable Time/Deadline: "${deadline}". Plan the subtask estimates within this constraint where possible.` : ''
  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Break this task into 3-6 actionable subtasks, each completable in 15-35 minutes.${deadlinePrompt}
Task: "${task}"
Return ONLY a JSON array, no markdown, no explanation:
[{"id":"1","title":"subtask","estimatedMinutes":25,"notes":"tip"},...]`
    }],
    temperature: 0.7,
    max_tokens: 1024,
  })

  const MAX_RETRIES = 3
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body
      })

      if (response.status === 429) {
        const waitSec = Math.pow(2, attempt + 1)
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, waitSec * 1000))
          continue
        }
        return { error: 'Rate limited — the Groq API allows a limited number of requests/minute. Wait a moment and try again.' }
      }

      if (!response.ok) {
        const errBody = await response.text()
        throw new Error(`Groq API error (${response.status}): ${errBody}`)
      }

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || ''
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

ipcMain.on('notif:clicked', () => {
  hideNotificationWindow()
  showMainWindow()
})

ipcMain.on('notif:dismissed', () => {
  hideNotificationWindow()
})

ipcMain.on('notif:snooze5min', () => {
  hideNotificationWindow()
  focusSnoozeUntil = Date.now() + FOCUS_SNOOZE_MS
})

ipcMain.on('notif:imStudying', () => {
  hideNotificationWindow()
  // Snooze for 15 minutes before checking again
  focusSnoozeUntil = Date.now() + 15 * 60 * 1000
  currentDistractionSession = null
  // Show a brief follow-up encouragement notification
  setTimeout(() => {
    showFocatNotification({
      message: "Okay, I'll check up on you later. GL 💛",
      hint: '',
      level: 1,
      isFollowUp: true,
    })
  }, 400)
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
  startEventReminders()
  app.on('activate', () => { showMainWindow() })
})

app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', () => {})
