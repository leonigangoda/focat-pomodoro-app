import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer() {
  const [state, setState] = useState('idle')      // idle | running | paused | done | overtime | finished
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(25 * 60)
  const [activeId, setActiveId] = useState(null)
  const intervalRef = useRef(null)

  const progress  = Math.min(elapsed / duration, 1)
  const remaining = Math.max(duration - elapsed, 0)
  const isNearEnd = remaining <= 120 && state === 'running'
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const display = `${mm}:${ss}`

  const catMode =
    state === 'idle'     ? 'idle' :
    state === 'paused'   ? 'idle' :
    state === 'running'  ? 'cooking' :
    state === 'done'     ? 'done' :
    state === 'finished' ? 'done' : 'tired'

  const start = useCallback((id = 'manual', mins = 25) => {
    setActiveId(id)
    setElapsed(0)
    setDuration(mins * 60)
    setState('running')
  }, [])

  const pause = useCallback(() => {
    if (state === 'running') {
      setState('paused')
    }
  }, [state])

  const resume = useCallback(() => {
    if (state === 'paused') {
      setState('running')
    } else if (state === 'idle') {
      start('manual', 25)
    }
  }, [state, start])

  const confirmDone = useCallback(() => {
    setState('finished')
  }, [])

  const notYet = useCallback(() => {
    setState('overtime')
  }, [])

  const reset = useCallback(() => {
    setElapsed(0)
    setState('idle')
    setActiveId(null)
  }, [])

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1
          if (next >= duration) {
            setState('done')
          }
          return next
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [state, duration])

  return { 
    state, 
    catMode, 
    elapsed, 
    progress, 
    isNearEnd, 
    activeId, 
    display, 
    duration, 
    start, 
    pause, 
    resume, 
    confirmDone, 
    notYet, 
    reset 
  }
}
