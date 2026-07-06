import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'focat-events'

function loadOfflineEvents() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"events":[]}')
    return Array.isArray(data.events) ? data.events : []
  } catch {
    return []
  }
}

function saveOfflineEvents(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events }))
  } catch {
    // Local storage is best-effort for the browser fallback.
  }
}

export function useEventStore() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const saved = await window.electron?.loadEvents?.()
        if (saved?.events) {
          setEvents(saved.events)
        } else {
          setEvents(loadOfflineEvents())
        }
      } catch (e) {
        console.warn(e)
        setEvents(loadOfflineEvents())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (loading) return
    if (window.electron?.saveEvents) {
      window.electron.saveEvents({ events })
    } else {
      saveOfflineEvents(events)
    }
  }, [events, loading])

  const addEvent = useCallback(({ title, startAt, color, reminder }) => {
    const event = {
      id: `event-${Date.now()}`,
      title,
      startAt,
      color,
      reminder: reminder || { type: 'none', value: 0 },
      remindersSent: [],
      createdAt: new Date().toISOString(),
    }
    setEvents(prev => [event, ...prev])
    return event
  }, [])

  const deleteEvent = useCallback((eventId) => {
    setEvents(prev => prev.filter(event => event.id !== eventId))
  }, [])

  return { events, loading, addEvent, deleteEvent }
}
