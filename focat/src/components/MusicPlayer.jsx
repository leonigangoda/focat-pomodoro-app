import React from 'react'
import styles from './MusicPlayer.module.css'

export default function MusicPlayer({ 
  currentTrack, 
  playing, 
  volume, 
  shuffled, 
  audioMode, 
  toggle, 
  next, 
  prev, 
  toggleShuffle 
}) {
  // Ensure track name is Sentence Case
  const trackName = currentTrack && currentTrack.title
    ? currentTrack.title.charAt(0).toUpperCase() + currentTrack.title.slice(1).toLowerCase()
    : 'White noise'

  const displayTrackName = audioMode === 'local' ? `${trackName} (Offline)` : trackName

  return (
    <div className={styles.playerWrap}>
      {/* White circle play button */}
      <button className={styles.playBtn} onClick={toggle} title={playing ? 'Pause' : 'Play'}>
        {playing ? (
          <svg width="14" height="16.8" viewBox="0 0 10 12">
            <rect x="0" y="0" width="3.5" height="12" rx="1" fill="#EFCB00"/>
            <rect x="6.5" y="0" width="3.5" height="12" rx="1" fill="#EFCB00"/>
          </svg>
        ) : (
          <svg width="16.8" height="19.6" viewBox="0 0 12 14">
            <polygon points="0,0 12,7 0,14" fill="#EFCB00"/>
          </svg>
        )}
      </button>

      {/* White capsule containing track name and right-aligned controls */}
      <div className={styles.capsule}>
        <span className={styles.trackName} title={displayTrackName}>
          {displayTrackName}
        </span>
        
        <div className={styles.navBtns}>
          {/* Shuffle/crossover icon */}
          <button 
            className={`${styles.navBtn} ${shuffled ? styles.shuffled : ''}`} 
            onClick={toggleShuffle} 
            title="Shuffle"
          >
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <path d="M2 11 L5 11 L9 3 L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M2 3 L5 3 L6.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M7.5 8 L9 11 L12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M10 1 L12 3 L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 9 L12 11 L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Prev */}
          <button className={styles.navBtn} onClick={prev} title="Previous">
            <svg width="16" height="16" viewBox="0 0 12 12">
              <polygon points="11,1 3,6 11,11" fill="currentColor"/>
              <rect x="0" y="1" width="2" height="10" rx="0.5" fill="currentColor"/>
            </svg>
          </button>

          {/* Next */}
          <button className={styles.navBtn} onClick={next} title="Next">
            <svg width="16" height="16" viewBox="0 0 12 12">
              <polygon points="1,1 9,6 1,11" fill="currentColor"/>
              <rect x="10" y="1" width="2" height="10" rx="0.5" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
