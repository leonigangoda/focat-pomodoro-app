import React, { useState } from 'react'
import FocusMusicPlayer from './FocusMusicPlayer'
import styles from './FocusScreen.module.css'

export default function FocusScreen({
  timer,
  music,
  catAccessory,
  activeSubtask,
  onCheckDone,
  onNextTask,
  onExit,
  onStopAndExit,
}) {
  const [earlyPrompt, setEarlyPrompt] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [taskDone, setTaskDone] = useState(false)

  const isDone = taskDone || activeSubtask?.status === 'done'
  const isRunning = timer.state === 'running' || timer.state === 'overtime'

  React.useEffect(() => {
    setTaskDone(false)
    setEarlyPrompt(false)
  }, [activeSubtask?.id])

  function triggerExit(stopTimer) {
    setExiting(true)
    setTimeout(() => {
      stopTimer ? onStopAndExit() : onExit()
    }, 420)
  }

  function handleCheckCircle() {
    if (isDone) return
    setTaskDone(true)
    onCheckDone(activeSubtask.taskId, activeSubtask.id)
    if (timer.remaining > 180) setEarlyPrompt(true)
  }

  function handleNextTask() {
    setEarlyPrompt(false)
    onNextTask()
  }

  return (
    <div className={`${styles.overlay} ${exiting ? styles.exiting : ''}`}>
      <div className={styles.paperTexture} aria-hidden="true" />
      <div className={styles.hill} aria-hidden="true" />

      <section className={styles.taskCard} aria-label="Current focus task">
        <button
          className={`${styles.checkCircle} ${isDone ? styles.checkCircleDone : ''}`}
          onClick={handleCheckCircle}
          title={isDone ? 'Marked as done' : 'Mark as done'}
          aria-label={isDone ? 'Task completed' : 'Mark task as done'}
          disabled={isDone}
        >
          {isDone && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        <div className={styles.taskCopy}>
          <div className={styles.taskTitle} title={activeSubtask?.title}>
            {activeSubtask?.title || 'No task selected'}
          </div>
          <div className={`${styles.statusLabel} ${isDone ? styles.statusDone : ''}`}>
            {isDone ? 'completed' : timer.isBreak ? 'taking a break' : 'focusing'}
          </div>
        </div>

        <button className={styles.editButton} onClick={() => triggerExit(false)} title="Edit task" aria-label="Edit task">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M7 23.5 8.4 17 22.7 2.7a2.5 2.5 0 0 1 3.6 0l1 1a2.5 2.5 0 0 1 0 3.6L13 21.6 7 23.5Z" />
            <path d="m20.8 4.6 6.6 6.6M16 25.5h11" />
          </svg>
        </button>

        {earlyPrompt && !exiting && (
          <div className={styles.earlyPrompt}>
            <span className={styles.earlyQuestion}>Stop timer?</span>
            <div className={styles.earlyActions}>
              <button className={styles.earlyBtnYes} onClick={() => triggerExit(true)}>Yes</button>
              <button className={styles.earlyBtnNext} onClick={handleNextTask}>Start the next task</button>
            </div>
          </div>
        )}
      </section>

      <p className={styles.motto}>
        <span>Done is better</span>
        <span>than Perfect</span>
      </p>

      <button className={styles.collapseBtn} onClick={() => triggerExit(false)} title="Exit focus mode" aria-label="Exit focus mode">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="4 14 10 14 10 20" />
          <polyline points="20 10 14 10 14 4" />
          <line x1="10" y1="14" x2="3" y2="21" />
          <line x1="21" y1="3" x2="14" y2="10" />
        </svg>
      </button>

      <main className={styles.timerArea}>
        {timer.isBreak && <div className={styles.breakLabel}>break time</div>}
        <div className={`${styles.timerDigits} ${timer.isOvertime ? styles.overtime : ''}`}>
          {timer.state === 'idle' ? '00:00' : timer.display}
        </div>
      </main>

      <img
        className={styles.timerCat}
        src="/assets/cats/timer-cat.gif"
        alt="Pixel cat focusing"
        data-accessory={catAccessory || 'none'}
      />

      <div className={styles.sessionControls} aria-label="Timer controls">
        <button
          className={styles.roundControl}
          onClick={isRunning ? timer.pause : timer.resume}
          title={isRunning ? 'Pause timer' : 'Resume timer'}
          aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
        >
          {isRunning ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        {[25, 50].map(mode => (
          <button
            key={mode}
            className={`${styles.modeButton} ${timer.selectedMode === mode ? styles.modeSelected : ''}`}
            onClick={() => timer.changeMode(mode)}
            disabled={timer.isBreak}
            title={`${mode} minute focus session`}
          >
            {mode} min
          </button>
        ))}

        <button className={styles.roundControl} onClick={timer.reset} title="Reset timer" aria-label="Reset timer" disabled={timer.state === 'idle'}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      <div className={styles.musicArea}>
        <FocusMusicPlayer {...music} />
      </div>
    </div>
  )
}
