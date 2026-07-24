import React from 'react'
import CatSvg from './CatSvg'
import styles from './BigClock.module.css'

export default function BigClock({ timer, catAccessory, large = false }) {
  const CIRCUMFERENCE = 2 * Math.PI * 90  // r=90

  // Normal ring offset (gold) — full when overtime
  const normalOffset = CIRCUMFERENCE * (1 - timer.progress)

  // Overtime ring offset (red) — fills as overtime progresses
  const overtimeOffset = CIRCUMFERENCE * (1 - (timer.overtimeProgress || 0))

  const isRunning = timer.state === 'running' || timer.state === 'overtime'

  // Digit color class
  const digitClass = timer.isOvertime
    ? styles.overtime
    : timer.isBreak
    ? styles.breakDigits
    : timer.isNearEnd
    ? styles.gold
    : ''

  // Ring colors during break — use a calm teal instead of gold
  const ringTrackColor   = timer.isBreak ? '#78C8B0' : '#EFCB00'
  const ringFillColor    = timer.isBreak ? '#3D9B82' : '#9F8700'

  return (
    <div className={`${styles.clockContainer} ${large ? styles.largeContainer : ''}`}>
      <div className={`${styles.wrap} ${large ? styles.largeWrap : ''}`}>

        {/* Ring SVG */}
        <svg className={styles.ring} viewBox="0 0 200 200">
          {/* Track */}
          <circle cx="100" cy="100" r="90" fill="none" stroke={ringTrackColor} strokeWidth="12"/>

          {/* Progress ring */}
          <circle
            cx="100" cy="100" r="90"
            fill="none"
            stroke={ringFillColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={normalOffset}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset .8s ease, stroke 0.6s ease' }}
          />

          {/* Red overtime ring — overlays gold ring, fills from 0 as overtime grows */}
          {timer.isOvertime && (
            <circle
              cx="100" cy="100" r="90"
              fill="none"
              stroke="#f71647"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={overtimeOffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset .8s ease' }}
              className={styles.overtimeRing}
            />
          )}
        </svg>

        {/* Center content */}
        <div className={styles.center}>
          {/* Break label */}
          {timer.isBreak && (
            <div className={`${styles.breakLabel} ${large ? styles.breakLabelLarge : ''}`}>
              ☕ BREAK
            </div>
          )}

          <div className={`${styles.timerDigits} ${digitClass}`}>
            {timer.state === 'idle' ? '00:00' : timer.display}
          </div>
          {timer.state === 'running' && !timer.isBreak ? (
            <img
              src="dist\assets\cats\timer-cat.gif"
              alt="cat licking paws"
              width={large ? 96 : 80}
              height={large ? 96 : 80}
              style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
            />
          ) : (
            <CatSvg mode={timer.catMode} size={large ? 96 : 80} accessory={catAccessory} />
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className={styles.controls}>
        {/* Play / Pause */}
        <button
          className={`${styles.controlBtn} ${large ? styles.controlBtnLarge : ''}`}
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
          className={`${styles.controlBtn} ${large ? styles.controlBtnLarge : ''}`}
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

      {/* Mode Selector Buttons */}
      <div className={styles.modes}>
        {[25, 50].map(mode => {
          const isSelected = timer.selectedMode === mode
          return (
            <button
              key={mode}
              className={[
                styles.modeBtn,
                large ? styles.modeBtnLarge : '',
                isSelected
                  ? (large ? styles.modeBtnSelectedLarge : styles.modeBtnSelected)
                  : (large ? styles.modeBtnInactiveLarge : styles.modeBtnInactive),
              ].join(' ')}
              onClick={() => timer.changeMode(mode)}
              disabled={timer.isBreak}
              title={`${mode} min focus session`}
            >
              {mode} min
            </button>
          )
        })}
      </div>
    </div>
  )
}
