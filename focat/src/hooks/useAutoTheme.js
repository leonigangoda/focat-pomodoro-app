import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getNextThemeBoundary, getThemeForTime } from '../themes/themeTime.mjs'

const THEME_TRANSITION_MS = 5000
const CLOCK_CHECK_MS = 60000

export function useAutoTheme() {
  const [theme, setTheme] = useState(() => getThemeForTime(new Date()))
  const themeRef = useRef(theme)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = themeRef.current
    delete document.documentElement.dataset.themeTransitioning
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let boundaryTimer = null
    let transitionTimer = null
    let lastTimezoneOffset = new Date().getTimezoneOffset()
    let lastWallClock = Date.now()
    let lastMonotonicClock = performance.now()

    function scheduleBoundary(now = new Date()) {
      window.clearTimeout(boundaryTimer)
      const delay = Math.max(getNextThemeBoundary(now).getTime() - now.getTime() + 50, 50)
      boundaryTimer = window.setTimeout(() => applyCurrentTheme(true), delay)
    }

    function applyCurrentTheme(animate) {
      const now = new Date()
      const nextTheme = getThemeForTime(now)

      if (nextTheme !== themeRef.current) {
        const shouldAnimate = animate && !reducedMotion.matches
        window.clearTimeout(transitionTimer)

        if (shouldAnimate) root.dataset.themeTransitioning = 'true'
        else delete root.dataset.themeTransitioning

        root.dataset.theme = nextTheme
        themeRef.current = nextTheme
        setTheme(nextTheme)

        if (shouldAnimate) {
          transitionTimer = window.setTimeout(() => {
            delete root.dataset.themeTransitioning
          }, THEME_TRANSITION_MS)
        }
      }

      lastTimezoneOffset = now.getTimezoneOffset()
      lastWallClock = Date.now()
      lastMonotonicClock = performance.now()
      scheduleBoundary(now)
    }

    function recheckOnForeground() {
      applyCurrentTheme(true)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') recheckOnForeground()
    }

    function detectClockOrTimezoneChange() {
      const now = new Date()
      const wallElapsed = Date.now() - lastWallClock
      const monotonicElapsed = performance.now() - lastMonotonicClock
      const clockShifted = Math.abs(wallElapsed - monotonicElapsed) > 2000
      const timezoneChanged = now.getTimezoneOffset() !== lastTimezoneOffset

      if (clockShifted || timezoneChanged) applyCurrentTheme(true)
      else {
        lastWallClock = Date.now()
        lastMonotonicClock = performance.now()
      }
    }

    applyCurrentTheme(false)
    window.addEventListener('focus', recheckOnForeground)
    window.addEventListener('pageshow', recheckOnForeground)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    const clockTimer = window.setInterval(detectClockOrTimezoneChange, CLOCK_CHECK_MS)

    return () => {
      window.clearTimeout(boundaryTimer)
      window.clearTimeout(transitionTimer)
      window.clearInterval(clockTimer)
      window.removeEventListener('focus', recheckOnForeground)
      window.removeEventListener('pageshow', recheckOnForeground)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      delete root.dataset.themeTransitioning
    }
  }, [])

  return theme
}
