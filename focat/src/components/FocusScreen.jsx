import React, { useState } from 'react'
import BigClock from './BigClock'
import MusicPlayer from './MusicPlayer'
import styles from './FocusScreen.module.css'

export default function FocusScreen({
  timer,
  music,
  catAccessory,
  activeSubtask,   // { id, title, taskId, estimatedMinutes, status }
  onCheckDone,     // (taskId, subtaskId) => void — mark done in store, don't reset timer
  onNextTask,      // () => void — mark current done, start next, stay in focus
  onExit,          // () => void — collapse focus mode (timer keeps running)
  onStopAndExit,   // () => void — reset timer + collapse focus mode
}) {
  const [earlyPrompt, setEarlyPrompt]   = useState(false)
  const [exiting,     setExiting]       = useState(false)
  const [taskDone,    setTaskDone]      = useState(false)

  const isDone = taskDone || activeSubtask?.status === 'done'

  // Reset done/prompt state when active subtask changes (next task loaded)
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
    // Show "Stop timer?" only if more than 3 minutes remain
    if (timer.remaining > 180) {
      setEarlyPrompt(true)
    }
  }

  function handleYes() {
    triggerExit(true)  // stop timer + exit
  }

  function handleNextTask() {
    setEarlyPrompt(false)
    onNextTask()  // App finds next subtask, starts its timer; stays in focus screen
  }

  function handleEdit() {
    triggerExit(false)  // just collapse, timer keeps running, user edits on main screen
  }

  function handleCollapseBtn() {
    triggerExit(false)  // X button — just collapse, timer continues
  }

  return (
    <div className={`${styles.overlay} ${exiting ? styles.exiting : ''}`}>

      {/* ── Atmospheric background layers ── */}
      <div className={styles.bgGlow1} />
      <div className={styles.bgGlow2} />

      {/* ── Top-right collapse button ── */}
      <button
        className={styles.collapseBtn}
        onClick={handleCollapseBtn}
        title="Exit focus mode"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 14 10 14 10 20" />
          <polyline points="20 10 14 10 14 4" />
          <line x1="10" y1="14" x2="3" y2="21" />
          <line x1="21" y1="3" x2="14" y2="10" />
        </svg>
      </button>

      {/* ── Task card — top-left ── */}
      <div className={styles.cardArea}>
        <p className={styles.motto}>Done is better than Perfect</p>

        <div className={styles.taskCard}>
          {/* Check circle + title row */}
          <div className={styles.taskRow}>
            <button
              className={`${styles.checkCircle} ${isDone ? styles.checkCircleDone : ''}`}
              onClick={handleCheckCircle}
              title={isDone ? 'Marked as done' : 'Mark as done'}
              disabled={isDone}
            >
              {isDone && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            <div className={styles.taskTitle}>
              {activeSubtask?.title || 'No task selected'}
            </div>
          </div>

          {/* Status label */}
          <div className={`${styles.statusLabel} ${isDone ? styles.statusDone : ''}`}>
            {isDone ? 'Completed ✓' : 'Focusing on right now'}
          </div>

          {/* ── Early-done prompt ── */}
          {earlyPrompt && !exiting && (
            <div className={styles.earlyPrompt}>
              <span className={styles.earlyQuestion}>Stop timer?</span>
              <div className={styles.earlyActions}>
                <button className={styles.earlyBtnYes} onClick={handleYes}>
                  Yes
                </button>
                <button className={styles.earlyBtnNext} onClick={handleNextTask}>
                  Start the next task
                </button>
              </div>
            </div>
          )}

          {/* Edit link */}
          <button className={styles.editLink} onClick={handleEdit}>
            edit task
          </button>
        </div>
      </div>

      {/* ── BigClock — center ── */}
      <div className={styles.clockArea}>
        <BigClock timer={timer} catAccessory={catAccessory} large />
      </div>

      {/* ── Music player — bottom ── */}
      <div className={styles.musicArea}>
        <MusicPlayer {...music} />
      </div>
    </div>
  )
}
