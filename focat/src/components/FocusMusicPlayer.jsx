import React, { useState } from 'react'
import styles from './FocusMusicPlayer.module.css'

export default function FocusMusicPlayer({
  currentTrack,
  playing,
  volume,
  shuffled,
  audioMode,
  toggle,
  next,
  prev,
  toggleShuffle,
  setVolume,
}) {
  const [showVolume, setShowVolume] = useState(false)
  const title = currentTrack?.title || 'White noise'
  const displayTitle = audioMode === 'local' ? `${title} (Offline)` : title

  return (
    <div className={styles.player} aria-label="Focus music player">
      <button className={styles.iconButton} onClick={prev} title="Previous track" aria-label="Previous track">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zm3 7 9 7V5z" /></svg>
      </button>
      <button className={styles.playButton} onClick={toggle} title={playing ? 'Pause music' : 'Play music'} aria-label={playing ? 'Pause music' : 'Play music'}>
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <button className={styles.iconButton} onClick={next} title="Next track" aria-label="Next track">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 5 9 7-9 7zm10 0h2v14h-2z" /></svg>
      </button>

      <span className={styles.trackName} title={displayTitle}>{displayTitle}</span>

      <button
        className={`${styles.iconButton} ${shuffled ? styles.active : ''}`}
        onClick={toggleShuffle}
        title={shuffled ? 'Disable shuffle' : 'Shuffle'}
        aria-label={shuffled ? 'Disable shuffle' : 'Shuffle'}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h3c4 0 5 10 9 10h4M17 14l3 3-3 3M4 17h3c1.8 0 3-2.2 4.2-4.5M16 7h4M17 4l3 3-3 3" />
        </svg>
      </button>

      <div className={`${styles.volumeWrap} ${showVolume ? styles.volumeOpen : ''}`}>
        {showVolume && (
          <input
            className={styles.volumeSlider}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={event => setVolume(Number(event.target.value))}
            aria-label="Music volume"
          />
        )}
        <button
          className={styles.iconButton}
          onClick={() => setShowVolume(open => !open)}
          title="Volume"
          aria-label="Show volume control"
          aria-expanded={showVolume}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 9v6h4l5 4V5L9 9H5Z" />
            {volume > 0 && <path d="M17 9.2c.8.7 1.2 1.6 1.2 2.8s-.4 2.1-1.2 2.8" />}
            {volume > .55 && <path d="M19.5 6.8A7 7 0 0 1 21 12a7 7 0 0 1-1.5 5.2" />}
          </svg>
        </button>
      </div>
    </div>
  )
}
