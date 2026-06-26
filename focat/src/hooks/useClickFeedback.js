import { useEffect, useRef } from 'react'

const CLICKABLE_SELECTOR = [
  'button',
  '[role="button"]',
  '[onclick]',
  'input[type="submit"]',
  'input[type="button"]',
  'input[type="reset"]',
  '[data-click-feedback]',
  '.cursor-pointer',
].join(',')

export function useClickFeedback() {
  const audioContextRef = useRef(null)
  const lastClickAtRef = useRef(0)

  useEffect(() => {
    function getClickableTarget(event) {
      const target = event.target instanceof Element
        ? event.target.closest(CLICKABLE_SELECTOR)
        : null
      if (!target || target.matches('[disabled], [aria-disabled="true"]')) return null
      return target
    }

    function playClick() {
      const now = performance.now()
      if (now - lastClickAtRef.current < 45) return
      lastClickAtRef.current = now

      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return

      const ctx = audioContextRef.current || new AudioContext()
      audioContextRef.current = ctx
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})

      const start = ctx.currentTime
      const osc = ctx.createOscillator()
      const overtone = ctx.createOscillator()
      const gain = ctx.createGain()
      const overtoneGain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(520, start)
      osc.frequency.exponentialRampToValueAtTime(760, start + 0.035)

      overtone.type = 'triangle'
      overtone.frequency.setValueAtTime(1040, start + 0.012)
      overtone.frequency.exponentialRampToValueAtTime(1320, start + 0.055)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(2600, start)

      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.075, start + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.085)

      overtoneGain.gain.setValueAtTime(0.0001, start + 0.012)
      overtoneGain.gain.exponentialRampToValueAtTime(0.026, start + 0.018)
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.095)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      overtone.connect(overtoneGain)
      overtoneGain.connect(ctx.destination)
      osc.start(start)
      overtone.start(start + 0.012)
      osc.stop(start + 0.095)
      overtone.stop(start + 0.105)
    }

    function handlePointerDown(event) {
      const target = getClickableTarget(event)
      if (!target) return
      target.classList.add('pressing')
      playClick()
    }

    function clearPress(event) {
      const target = getClickableTarget(event)
      if (target) target.classList.remove('pressing')
      document.querySelectorAll('.pressing').forEach(el => el.classList.remove('pressing'))
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('pointerup', clearPress, true)
    document.addEventListener('pointercancel', clearPress, true)
    document.addEventListener('pointerleave', clearPress, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('pointerup', clearPress, true)
      document.removeEventListener('pointercancel', clearPress, true)
      document.removeEventListener('pointerleave', clearPress, true)
    }
  }, [])
}
