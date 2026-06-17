import React, { useState } from 'react'
import styles from './WelcomeScreen.module.css'
import CatSvg from './CatSvg'

const STUDY_PATTERNS = [
  {
    id: 'mapper',
    name: 'Mapper',
    description: 'If you colour-code everything, draw it out, turn notes into diagrams, this is you.',
  },
  {
    id: 'mumbler',
    name: 'Mumbler',
    description: 'If you read aloud, record yourself, explain it to a friend, this is you.',
  },
  {
    id: 'noter',
    name: 'Noter',
    description: 'If you need to rewrite notes, make lists, summarise in your own words, this is you.',
  },
  {
    id: 'pacer',
    name: 'Pacer',
    description: 'If you need to build something, act it out, use real examples, take breaks to move, this is you.',
  },
  {
    id: 'shuffler',
    name: 'Shuffler',
    description: 'If you need all of the above before something actually sticks, this is you.',
  },
]

export default function WelcomeScreen({ onComplete }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [studyPattern, setStudyPattern] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleNameNext() {
    if (!name.trim()) return
    await window.electron?.saveName(name.trim())
    setStep(2)
  }

  async function handlePatternSave() {
    if (!studyPattern) return
    setSaving(true)
    const currentSettings = await window.electron?.loadSettings().catch(() => ({}))
    await window.electron?.saveSettings({
      ...(currentSettings || {}),
      studyPattern,
    })
    setSaving(false)
    onComplete(name.trim(), studyPattern)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <CatSvg mode="idle" size={80} accessory="chef-hat" />

        <div className={styles.steps}>
          <div className={`${styles.dot} ${step >= 1 ? styles.dotActive : ''}`} />
          <div className={styles.dotLine} />
          <div className={`${styles.dot} ${step >= 2 ? styles.dotActive : ''}`} />
        </div>

        {step === 1 && (
          <div className={styles.content} key="step1">
            <div className={styles.title}>Welcome to focat!</div>
            <div className={styles.sub}>What should we call you?</div>
            <input
              type="text"
              placeholder="Your name..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameNext()}
              className={styles.input}
              autoFocus
              maxLength={30}
            />
            <button
              className={styles.btn}
              onClick={handleNameNext}
              disabled={!name.trim()}
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.content} key="step2">
            <div className={styles.title}>Hey {name.trim()}! How do you study?</div>
            <div className={styles.sub}>Pick the pattern that sounds most like you.</div>
            <div className={styles.patterns}>
              {STUDY_PATTERNS.map(pattern => (
                <button
                  key={pattern.id}
                  type="button"
                  className={`${styles.patternCard} ${studyPattern === pattern.id ? styles.patternCardActive : ''}`}
                  onClick={() => setStudyPattern(pattern.id)}
                >
                  <span className={styles.patternName}>{pattern.name}</span>
                  <span className={styles.patternDescription}>{pattern.description}</span>
                </button>
              ))}
            </div>
            <div className={styles.btnRow}>
              <button
                className={styles.btnBack}
                onClick={() => setStep(1)}
                disabled={saving}
              >
                Back
              </button>
              <button
                className={styles.btn}
                onClick={handlePatternSave}
                disabled={!studyPattern || saving}
              >
                {saving ? 'Saving...' : "Let's go!"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
