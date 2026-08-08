import React from 'react'
import styles from './TitleBar.module.css'

export default function TitleBar({ onSettings }) {
  const isElectron = !!window.electron

  return (
    <div className={styles.bar}>
      <div className={styles.logo}>
        <img src="dist/assets/cats/focat-logo.svg" alt="focat logo" width={24} height={24} />
        <span className={styles.name}>focat</span>
      </div>

      <div className={styles.controls}>
        {onSettings && (
          <button className={styles.settingsBtn} onClick={onSettings} title="Settings">
            ⚙
          </button>
        )}
        {isElectron && (
          <>
            <button
              className={`${styles.winBtn} ${styles.minimize}`}
              onClick={() => window.electron.minimize()}
              title="Minimize"
            >—</button>
            <button
              className={`${styles.winBtn} ${styles.close}`}
              onClick={() => window.electron.close()}
              title="Close"
            >✕</button>
          </>
        )}
      </div>
    </div>
  )
}
