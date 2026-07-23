import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer() {
  const [state, setState]               = useState('idle')   // idle | running | paused | overtime
  const [elapsed, setElapsed]           = useState(0)
  const [duration, setDuration]         = useState(25 * 60)
  const [activeId, setActiveId]         = useState(null)
  const [selectedMode, setSelectedMode] = useState(25)       // 25 | 50 — user's chosen focus length
  const [isBreak, setIsBreak]           = useState(false)    // true while a break session is running

  const intervalRef    = useRef(null)
  const wasOvertimeRef = useRef(false)    // remember if we were overtime when paused
  const pendingModeRef = useRef(null)     // queued mode change while a session is active
  // Ref mirrors to avoid stale-closure issues inside the elapsed effect
  const isBreakRef       = useRef(false)
  const selectedModeRef  = useRef(25)
  const durationRef      = useRef(25 * 60)

  // Keep refs in sync
  useEffect(() => { isBreakRef.current = isBreak }, [isBreak])
  useEffect(() => { selectedModeRef.current = selectedMode }, [selectedMode])
  useEffect(() => { durationRef.current = duration }, [duration])

  const isOvertime       = state === 'overtime'
  const overtimeElapsed  = isOvertime ? Math.max(elapsed - duration, 0) : 0
  const overtimeProgress = Math.min(overtimeElapsed / Math.max(duration, 1), 1)
  const progress         = isOvertime ? 1 : Math.min(elapsed / Math.max(duration, 1), 1)
  const remaining        = Math.max(duration - elapsed, 0)
  const isNearEnd        = remaining <= 120 && state === 'running' && !isBreak

  // Build display string
  let display
  if (isBreak) {
    // Break: show countdown from break duration
    const rem = Math.max(duration - elapsed, 0)
    const mm  = String(Math.floor(rem / 60)).padStart(2, '0')
    const ss  = String(rem % 60).padStart(2, '0')
    display   = `${mm}:${ss}`
  } else if (isOvertime) {
    const ot = elapsed - duration
    const mm = String(Math.floor(ot / 60)).padStart(2, '0')
    const ss = String(ot % 60).padStart(2, '0')
    display  = `-${mm}:${ss}`
  } else {
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const ss = String(elapsed % 60).padStart(2, '0')
    display  = `${mm}:${ss}`
  }

  const catMode =
    state === 'idle'     ? 'idle' :
    state === 'paused'   ? 'idle' :
    state === 'running'  ? (isBreak ? 'idle' : 'cooking') :
    state === 'overtime' ? 'tired' :
    state === 'finished' ? 'done' : 'idle'

  // ── Actions ───────────────────────────────────────────────────────────────

  const start = useCallback((id = 'manual', mins = 25) => {
    setActiveId(id)
    setElapsed(0)
    setDuration(mins * 60)
    setIsBreak(false)
    setState('running')
    wasOvertimeRef.current = false
    pendingModeRef.current = null
  }, [])

  const pause = useCallback(() => {
    if (state === 'running') {
      wasOvertimeRef.current = false
      setState('paused')
    } else if (state === 'overtime') {
      wasOvertimeRef.current = true
      setState('paused')
    }
  }, [state])

  const resume = useCallback(() => {
    if (state === 'paused') {
      setState(wasOvertimeRef.current ? 'overtime' : 'running')
    } else if (state === 'idle') {
      start('manual', selectedMode)
    }
  }, [state, start, selectedMode])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    const modeToApply = pendingModeRef.current ?? selectedModeRef.current
    pendingModeRef.current = null
    setElapsed(0)
    setState('idle')
    setActiveId(null)
    setIsBreak(false)
    setDuration(modeToApply * 60)
    setSelectedMode(modeToApply)
    wasOvertimeRef.current = false
  }, [])

  // changeMode — sets the preferred focus duration.
  // Disabled during a break. If idle, applies immediately; otherwise queues it.
  const changeMode = useCallback((mode) => {
    if (isBreakRef.current) return

    setSelectedMode(mode)
    selectedModeRef.current = mode

    if (state === 'idle') {
      setDuration(mode * 60)
      setElapsed(0)
      pendingModeRef.current = null
    } else {
      pendingModeRef.current = mode
    }
  }, [state])

  // ── Interval tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (state === 'running' || state === 'overtime') {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [state])

  // ── Auto-transition on tick ───────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'running') return
    if (elapsed < durationRef.current) return

    if (isBreakRef.current) {
      // ── Break completed → return to idle ───────────────────────────────────
      const modeToApply = pendingModeRef.current ?? selectedModeRef.current
      pendingModeRef.current = null
      setIsBreak(false)
      isBreakRef.current = false
      setElapsed(0)
      setDuration(modeToApply * 60)
      durationRef.current = modeToApply * 60
      setSelectedMode(modeToApply)
      selectedModeRef.current = modeToApply
      setActiveId(null)
      setState('idle')
      wasOvertimeRef.current = false
    } else {
      // ── Focus session completed naturally → start break then overtime guard ──
      const breakMins = selectedModeRef.current === 50 ? 10 : 5
      const breakSecs = breakMins * 60
      // Update refs before any setState so the *same* render's other effects
      // see isBreak = true and do NOT set 'overtime'.
      isBreakRef.current  = true
      durationRef.current = breakSecs
      setIsBreak(true)
      setElapsed(0)
      setDuration(breakSecs)
      // state stays 'running' — interval continues into the break session
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, state])

  return {
    state,
    catMode,
    elapsed,
    progress,
    overtimeProgress,
    isNearEnd,
    isOvertime,
    isBreak,
    activeId,
    display,
    duration,
    remaining,
    overtimeElapsed,
    selectedMode,
    start,
    pause,
    resume,
    reset,
    changeMode,
  }
}
