import React from 'react'
import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  return (
    <div className={styles.screen}>
      <img src="/assets/cats/focat-logo.svg" alt="focat logo" className={styles.logo} />
      <div className={styles.text}>Loading...</div>
    </div>
  )
}
