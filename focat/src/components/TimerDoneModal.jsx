import React from 'react'
import styles from './TimerDoneModal.module.css'
import CatSvg from './CatSvg'

export default function TimerDoneModal({ onYes, onNo }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <CatSvg mode="done" size={72} accessory="chef-hat" />
        <div className={styles.title}>Timer's done...</div>
        <div className={styles.subtitle}>Are you?</div>
        <div className={styles.btns}>
          <button className={`${styles.btn} ${styles.yes}`} onClick={onYes}>Yes!</button>
          <button className={`${styles.btn} ${styles.no}`} onClick={onNo}>Not yet</button>
        </div>
      </div>
    </div>
  )
}
