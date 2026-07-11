import React, { useState, useEffect, useMemo } from 'react'
import { useTimer }        from './hooks/useTimer'
import { useTaskStore }    from './hooks/useTaskStore'
import { useSettings }     from './hooks/useSettings'
import { useMusicPlayer }  from './hooks/useMusicPlayer'
import { useClickFeedback } from './hooks/useClickFeedback'
import { useEventStore }   from './hooks/useEventStore'

import LoadingScreen  from './components/LoadingScreen'
import TitleBar       from './components/TitleBar'
import BigClock       from './components/BigClock'
import TaskInput      from './components/TaskInput'
import SubtaskList    from './components/SubtaskList'
import MusicPlayer    from './components/MusicPlayer'
import WelcomeScreen  from './components/WelcomeScreen'
import EventCalendar  from './components/EventCalendar'
import FocusScreen    from './components/FocusScreen'

import styles from './App.module.css'

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function ordinal(d) {
  if (d > 3 && d < 21) return d + ' th'
  switch (d % 10) {
    case 1: return d + ' st'; case 2: return d + ' nd'; case 3: return d + ' rd'; default: return d + ' th'
  }
}

export default function App() {
  const [appReady,     setAppReady]     = useState(false)
  const [needsSetup,   setNeedsSetup]   = useState(false)
  const [userName,     setUserName]     = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [focusMode,    setFocusMode]    = useState(false)
  const [now,          setNow]          = useState(new Date())

  const { settings, update: updateSettings } = useSettings()
  const timer  = useTimer()
  const store  = useTaskStore()
  const { events, addEvent, deleteEvent } = useEventStore()
  const music  = useMusicPlayer(settings.musicVolume, settings.musicTrack)
  useClickFeedback()

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Boot
  useEffect(() => {
    async function boot() {
      const storedName     = await window.electron?.loadName().catch(() => null)
      const storedSettings = await window.electron?.loadSettings().catch(() => null)
      setUserName(storedName || '')
      setNeedsSetup(!storedName || !storedSettings?.studyPattern)
      await new Promise(r => setTimeout(r, 1400))
      setAppReady(true)
    }
    boot()
  }, [])

  // ── Derive active subtask from timer.activeId ──────────────────────────────
  const activeSubtask = useMemo(() => {
    if (!timer.activeId) return null
    for (const task of store.tasks) {
      const sub = task.subtasks.find(s => s.id === timer.activeId)
      if (sub) return { ...sub, taskId: task.id }
    }
    return null
  }, [store.tasks, timer.activeId])

  // All subtasks flattened (for finding next task)
  const allSubtasks = useMemo(() =>
    store.tasks.flatMap(t => t.subtasks.map(s => ({ ...s, taskId: t.id }))),
    [store.tasks]
  )

  // ── Task handlers ──────────────────────────────────────────────────────────
  async function handleTaskSubmit(title, deadline) {
    const isElectron = !!window.electron
    if (isElectron) {
      const result = await store.addTask(title, deadline)
      return !!result
    } else {
      store.addTaskOffline(title, deadline)
      return true
    }
  }

  function handleSubtaskStart(taskId, subtask) {
    store.updateSubtask(taskId, subtask.id, { status: 'active' })
    timer.start(subtask.id, subtask.estimatedMinutes || settings.defaultTimer)
    window.electron?.notifyDone?.(subtask.title)
    // Focus mode is NOT auto-entered — user clicks the expand button
  }

  function handleSubtaskDone(taskId, subtaskId) {
    store.markSubtaskDone(taskId, subtaskId, timer.elapsed)
    if (timer.activeId === subtaskId) timer.reset()
  }

  function handleWelcomeComplete(name, studyPattern) {
    setUserName(name)
    updateSettings({ studyPattern })
    setNeedsSetup(false)
  }

  // ── Focus mode handlers ───────────────────────────────────────────────────
  function handleEnterFocus() {
    if (timer.state !== 'idle') {
      setFocusMode(true)
    }
  }

  // Called from FocusScreen X button — just collapses, timer keeps running
  function handleExitFocus() {
    setFocusMode(false)
  }

  // Called from FocusScreen "Yes" (stop timer) — resets timer then collapses
  function handleStopAndExitFocus() {
    timer.reset()
    setFocusMode(false)
  }

  // Mark done inside focus screen WITHOUT resetting timer (let user decide)
  function handleFocusCheckDone(taskId, subtaskId) {
    store.markSubtaskDone(taskId, subtaskId, timer.elapsed)
    // Don't reset timer here — user will choose Yes or Start Next
  }

  // "Start the next task" — stay on focus screen
  function handleNextTask() {
    // Capture activeId BEFORE resetting (reset clears it)
    const currentActiveId = timer.activeId
    timer.reset()

    // Find next pending subtask after the current one
    const currentIdx = allSubtasks.findIndex(s => s.id === currentActiveId)
    const searchFrom = currentIdx >= 0 ? currentIdx + 1 : 0
    const nextSub    = allSubtasks.slice(searchFrom).find(s => s.status !== 'done')

    if (nextSub) {
      // Start next task — stay in focus mode
      store.updateSubtask(nextSub.taskId, nextSub.id, { status: 'active' })
      timer.start(nextSub.id, nextSub.estimatedMinutes || settings.defaultTimer)
    } else {
      // No more tasks — exit focus mode
      setFocusMode(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const h       = String(now.getHours()).padStart(2, '0')
  const m       = String(now.getMinutes()).padStart(2, '0')
  const dateStr = `${DAYS[now.getDay()]},${ordinal(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`

  if (!appReady) return <LoadingScreen />
  if (needsSetup && window.electron) return (
    <WelcomeScreen onComplete={handleWelcomeComplete} />
  )

  const timerActive = timer.state !== 'idle'

  return (
    <div className={styles.app}>
      <TitleBar onSettings={() => setShowSettings(s => !s)} />

      {/* Backdrop overlay for calendar */}
      {showCalendar && (
        <div className={styles.backdrop} onClick={() => setShowCalendar(false)} />
      )}

      {/* Calendar Slide-out Drawer */}
      <div className={`${styles.calendarDrawer} ${showCalendar ? styles.calendarDrawerOpen : ''}`}>
        <EventCalendar
          events={events}
          onAddEvent={addEvent}
          onDeleteEvent={deleteEvent}
          onClose={() => setShowCalendar(false)}
        />
      </div>

      {/* ── Focus Screen Overlay ── */}
      {focusMode && (
        <FocusScreen
          timer={timer}
          music={music}
          catAccessory={settings.catAccessory}
          activeSubtask={activeSubtask}
          allSubtasks={allSubtasks}
          onCheckDone={handleFocusCheckDone}
          onNextTask={handleNextTask}
          onExit={handleExitFocus}
          onStopAndExit={handleStopAndExitFocus}
        />
      )}

      {/* ── Time + Date ── */}
      <div className={styles.header}>
        <div className={styles.time}>{h}:{m}</div>
        <div className={styles.date}>{dateStr}</div>
      </div>

      {/* ── Main layout ── */}
      <div className={styles.body}>

        {/* LEFT — timer + music */}
        <div className={styles.leftPanel}>
          <div className={styles.timerBox}>
            <BigClock timer={timer} catAccessory={settings.catAccessory} />

            {/* Expand / Enter Focus button — appears when timer is active */}
            {timerActive && (
              <button
                className={styles.expandBtn}
                onClick={handleEnterFocus}
                title="Enter focus mode"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
            )}
          </div>

          <div className={styles.musicBox}>
            <MusicPlayer {...music} />
          </div>
        </div>

        {/* RIGHT — tasks */}
        <div className={styles.rightPanel}>
          <div className={styles.rightPanelHeader}>
            <button
              className={styles.calendarToggleBtn}
              onClick={() => setShowCalendar(prev => !prev)}
              title="Calendar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </button>
          </div>
          <TaskInput
            onSubmit={handleTaskSubmit}
            decomposing={store.decomposing}
            error={store.error}
            userName={userName}
            timerRunning={timer.state === 'running' && !!timer.activeId}
          />
          <div className={styles.taskBox}>
            <SubtaskList
              tasks={store.tasks}
              activeId={timer.activeId}
              timerState={timer.state}
              onStart={handleSubtaskStart}
              onDone={handleSubtaskDone}
              onDelete={store.deleteTask}
              onDeleteSubtask={store.deleteSubtask}
              onEditSubtask={store.editSubtask}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
