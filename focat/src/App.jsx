import React, { useState, useEffect } from 'react'
import { useTimer }       from './hooks/useTimer'
import { useTaskStore }   from './hooks/useTaskStore'
import { useSettings }    from './hooks/useSettings'
import { useMusicPlayer } from './hooks/useMusicPlayer'
import { useClickFeedback } from './hooks/useClickFeedback'

import LoadingScreen   from './components/LoadingScreen'
import TitleBar        from './components/TitleBar'
import BigClock        from './components/BigClock'
import TaskInput       from './components/TaskInput'
import SubtaskList     from './components/SubtaskList'
import MusicPlayer     from './components/MusicPlayer'
import TimerDoneModal  from './components/TimerDoneModal'
import WelcomeScreen   from './components/WelcomeScreen'

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
  const [now, setNow] = useState(new Date())

  const { settings, update: updateSettings } = useSettings()
  const timer  = useTimer()
  const store  = useTaskStore()
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
