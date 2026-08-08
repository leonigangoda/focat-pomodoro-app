import React from 'react'
import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  return (
    <div className={styles.screen}>
      <img src="dist/assets/cats/focat-logo.png" alt="focat logo" width={100} height={100} />
      <div className={styles.text}>Loading...</div>
    </div>
  )
}
