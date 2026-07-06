import React, { useState, useEffect } from 'react'
import { useTimer }       from './hooks/useTimer'
import { useTaskStore }   from './hooks/useTaskStore'
import { useSettings }    from './hooks/useSettings'
import { useMusicPlayer } from './hooks/useMusicPlayer'
import { useClickFeedback } from './hooks/useClickFeedback'
import { useEventStore } from './hooks/useEventStore'

import LoadingScreen   from './components/LoadingScreen'
import TitleBar        from './components/TitleBar'
import BigClock        from './components/BigClock'
import TaskInput       from './components/TaskInput'
import SubtaskList     from './components/SubtaskList'
import MusicPlayer     from './components/MusicPlayer'
import TimerDoneModal  from './components/TimerDoneModal'
import WelcomeScreen   from './components/WelcomeScreen'
import EventCalendar   from './components/EventCalendar'

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
  const [appReady,       setAppReady]       = useState(false)
  const [needsSetup,     setNeedsSetup]     = useState(false)
  const [userName,       setUserName]       = useState('')
  const [showSettings,   setShowSettings]   = useState(false)
  const [showCalendar,   setShowCalendar]   = useState(false)
  const [now, setNow] = useState(new Date())

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
      const storedName = await window.electron?.loadName().catch(() => null)
      const storedSettings = await window.electron?.loadSettings().catch(() => null)
      setUserName(storedName || '')
      setNeedsSetup(!storedName || !storedSettings?.studyPattern)
      await new Promise(r => setTimeout(r, 1400))
      setAppReady(true)
    }
    boot()
  }, [])

  async function handleTaskSubmit(title, deadline) {
    const isElectron = !!window.electron
    if (isElectron) {
      const result = await store.addTask(title, deadline)
      return !!result // null = failed, object = success
    } else {
      store.addTaskOffline(title, deadline)
      return true
    }
  }

  function handleSubtaskStart(taskId, subtask) {
    store.updateSubtask(taskId, subtask.id, { status: 'active' })
    timer.start(subtask.id, subtask.estimatedMinutes || settings.defaultTimer)
    window.electron?.notifyDone?.(subtask.title)
  }

  function handleSubtaskDone(taskId, subtaskId) {
    store.markSubtaskDone(taskId, subtaskId, timer.elapsed)
    if (timer.activeId === subtaskId) timer.reset()
  }

  function handleTimerYes() {
    const active = store.tasks.flatMap(t => t.subtasks).find(s => s.id === timer.activeId)
    if (active) store.markSubtaskDone(
      store.tasks.find(t => t.subtasks.some(s => s.id === timer.activeId))?.id,
      timer.activeId, timer.elapsed
    )
    timer.confirmDone()
  }

  function handleWelcomeComplete(name, studyPattern) {
    setUserName(name)
    updateSettings({ studyPattern })
    setNeedsSetup(false)
  }

  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const dateStr = `${DAYS[now.getDay()]},${ordinal(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`

  if (!appReady)  return <LoadingScreen />
  if (needsSetup && window.electron) return (
    <WelcomeScreen onComplete={handleWelcomeComplete} />
  )

  return (
    <div className={styles.app}>
      <TitleBar onSettings={() => setShowSettings(s => !s)} />

      {/* Backdrop overlay */}
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

      {/* Time + Date */}
      <div className={styles.header}>
        <div className={styles.time}>{h}:{m}</div>
        <div className={styles.date}>{dateStr}</div>
      </div>

      {/* Main layout */}
      <div className={styles.body}>

        {/* LEFT — timer + music */}
        <div className={styles.leftPanel}>
          <div className={styles.timerBox}>
            <BigClock timer={timer} catAccessory={settings.catAccessory} />
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

      {/* Timer done modal */}
      {timer.state === 'done' && (
        <TimerDoneModal onYes={handleTimerYes} onNo={timer.notYet} />
      )}
    </div>
  )
}
