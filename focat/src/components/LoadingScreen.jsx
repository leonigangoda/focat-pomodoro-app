import React from 'react'
import CatSvg from './CatSvg'
import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  return (
    <div className={styles.screen}>
      <CatSvg mode="idle" size={100} accessory="chef-hat" />
      <div className={styles.text}>Loading...</div>
    </div>
  )
}
