import React from 'react'
import CatSvg from './CatSvg'
import styles from './BigClock.module.css'

export default function BigClock({ timer, catAccessory }) {
  // Ring math
  const CIRCUMFERENCE = 2 * Math.PI * 90  // r=90
  const offset = CIRCUMFERENCE * (1 - timer.progress)
  const isRed  = timer.state === 'overtime'
  const isGold = timer.isNearEnd

  const ringColor = isRed ? '#E84B2A' : isGold ? '#9F8700' : '#9F8700'
  const ringClass = isRed ? styles.ringAlert : ''

  const isRunning = timer.state === 'running'

  return (
    <div className={styles.clockContainer}>
      <div className={styles.wrap}>
        {/* Ring */}
        <svg className={styles.ring} viewBox="0 0 200 200">
          {/* Track */}
          <circle cx="100" cy="100" r="90" fill="none" stroke="#EFCB00" strokeWidth="12"/>
          {/* Progress */}
          <circle
            cx="100" cy="100" r="90"
            fill="none"
            stroke={ringColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset .8s ease, stroke .4s' }}
            className={ringClass}
          />
        </svg>

        {/* Center content */}
        <div className={styles.center}>
          <div className={`${styles.timerDigits} ${isRed ? styles.red : isGold ? styles.gold : ''}`}>
            {timer.state === 'idle' ? '00:00' : timer.display}
          </div>
          <CatSvg mode={timer.catMode} size={80} accessory={catAccessory} />
        </div>
      </div>

      {/* Control Buttons */}
      <div className={styles.controls}>
        {/* Play / Pause */}
        <button
          className={styles.controlBtn}
          onClick={isRunning ? timer.pause : timer.resume}
          title={isRunning ? 'Pause' : 'Play'}
        >
          {isRunning ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'translateX(1px)' }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Reset */}
        <button
          className={styles.controlBtn}
          onClick={timer.reset}
          title="Reset"
          disabled={timer.state === 'idle'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
