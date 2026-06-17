import React, { useState } from 'react'
import styles from './TaskInput.module.css'

export default function TaskInput({ onSubmit, decomposing, error, userName, timerRunning }) {
  const [value, setValue] = useState('')
  const [pendingTitle, setPendingTitle] = useState(null)
  const [deadlineValue, setDeadlineValue] = useState('')

  async function handleKey(e) {
    if (e.key === 'Enter' && value.trim()) {
      setPendingTitle(value.trim())
      setValue('')
    }
  }

  async function handleDeadlineSubmit() {
    if (pendingTitle) {
      const success = await onSubmit(pendingTitle, deadlineValue.trim() || null)
      if (success) {
        setPendingTitle(null)
        setDeadlineValue('')
      }
    }
  }

  function handleDeadlineKey(e) {
    if (e.key === 'Enter') {
      handleDeadlineSubmit()
    }
  }

  function handleSkip() {
    if (pendingTitle) {
      onSubmit(pendingTitle, null)
      setPendingTitle(null)
      setDeadlineValue('')
    }
  }

  const placeholder = userName
    ? `What are we working on today, ${userName}?`
    : 'What are we working on today?'

  return (
    <div className={styles.wrap}>
      <div className={`${styles.bar} ${timerRunning ? styles.active : ''}`}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={styles.icon}>
          <circle cx="7.5" cy="7.5" r="5.5" stroke="#9F8700" strokeWidth="1.8"/>
          <line x1="11.5" y1="11.5" x2="16" y2="16" stroke="#9F8700" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          className={styles.input}
          disabled={decomposing || !!pendingTitle}
        />
        {decomposing && <div className={styles.spinner} />}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Deadline prompt card */}
      {pendingTitle && !decomposing && (
        <div className={`${styles.deadlineCard} fade-in`}>
          <div className={styles.deadlineHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9F8700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className={styles.deadlineLabel}>How many days / hours do you have left?</span>
          </div>
          <div className={styles.deadlineInputRow}>
            <input
              type="text"
              placeholder='e.g. "2 days", "5 hours", "1 day 3 hours"'
              value={deadlineValue}
              onChange={e => setDeadlineValue(e.target.value)}
              onKeyDown={handleDeadlineKey}
              className={styles.deadlineInput}
              autoFocus
            />
            <button className={styles.deadlineBtn} onClick={handleDeadlineSubmit} title="Submit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button className={styles.skipBtn} onClick={handleSkip} title="Skip">
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
