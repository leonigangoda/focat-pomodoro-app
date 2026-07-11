import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer() {
  const [state, setState]       = useState('idle')   // idle | running | paused | overtime | finished
  const [elapsed, setElapsed]   = useState(0)
  const [duration, setDuration] = useState(25 * 60)
  const [activeId, setActiveId] = useState(null)
  const intervalRef    = useRef(null)
  const wasOvertimeRef = useRef(false)  // remember if we were overtime when paused

  const isOvertime       = state === 'overtime'
  const overtimeElapsed  = isOvertime ? Math.max(elapsed - duration, 0) : 0
  const overtimeProgress = Math.min(overtimeElapsed / Math.max(duration, 1), 1)
  const progress         = isOvertime ? 1 : Math.min(elapsed / Math.max(duration, 1), 1)
  const remaining        = Math.max(duration - elapsed, 0)
  const isNearEnd        = remaining <= 120 && state === 'running'

  // Build display string
  let display
  if (isOvertime) {
    const ot = elapsed - duration
    const mm = String(Math.floor(ot / 60)).padStart(2, '0')
    const ss = String(ot % 60).padStart(2, '0')
    display = `-${mm}:${ss}`
  } else {
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const ss = String(elapsed % 60).padStart(2, '0')
    display = `${mm}:${ss}`
  }

  const catMode =
    state === 'idle'     ? 'idle' :
    state === 'paused'   ? 'idle' :
    state === 'running'  ? 'cooking' :
    state === 'overtime' ? 'tired' :
    state === 'finished' ? 'done' : 'idle'

  const start = useCallback((id = 'manual', mins = 25) => {
    setActiveId(id)
    setElapsed(0)
    setDuration(mins * 60)
    setState('running')
    wasOvertimeRef.current = false
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
      start('manual', 25)
    }
  }, [state, start])

  const reset = useCallback(() => {
    setElapsed(0)
    setState('idle')
    setActiveId(null)
    wasOvertimeRef.current = false
  }, [])

  // Interval tick — runs in both 'running' and 'overtime'
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

  // Auto-transition: running → overtime when time is up
  useEffect(() => {
    if (state === 'running' && elapsed >= duration) {
      setState('overtime')
    }
  }, [elapsed, state, duration])

  return {
    state,
    catMode,
    elapsed,
    progress,
    overtimeProgress,
    isNearEnd,
    isOvertime,
    activeId,
    display,
    duration,
    remaining,
    overtimeElapsed,
    start,
    pause,
    resume,
    reset,
  }
}
