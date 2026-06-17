import { useState, useEffect, useCallback } from 'react'

export function useTaskStore() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [decomposing, setDecomposing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const saved = await window.electron?.loadTasks()
        if (saved?.tasks) setTasks(saved.tasks)
      } catch (e) { console.warn(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    if (loading) return
    window.electron?.saveTasks({ tasks })
  }, [tasks, loading])

  const addTask = useCallback(async (title, deadline) => {
    setDecomposing(true)
    setError(null)
    const result = await window.electron?.decomposeTask(title, deadline)
    if (result?.error) { setError(result.error); setDecomposing(false); return null }

    const subtasks = (result?.subtasks ?? []).map(s => ({
      ...s,
      priority: s.priority || 'normal',
    }))

    // If deadline was provided, auto-assign priority based on time pressure
    if (deadline) {
      const totalHours = parseDeadlineToHours(deadline)
      if (totalHours !== null) {
        const totalEstimatedMins = subtasks.reduce((sum, s) => sum + (s.estimatedMinutes || 25), 0)
        const totalEstimatedHours = totalEstimatedMins / 60
        assignPriorities(subtasks, totalEstimatedHours, totalHours)
      }
    }

    const task = {
      id: `task-${Date.now()}`,
      title,
      deadline: deadline || null,
      createdAt: new Date().toISOString(),
      status: 'pending',
      subtasks,
    }
    setTasks(prev => [task, ...prev])
    setDecomposing(false)
    return task
  }, [])

  const addTaskOffline = useCallback((title, deadline) => {
    const subtasks = [{
      id: `st-${Date.now()}`,
      title,
      estimatedMinutes: 25,
      notes: '',
      status: 'pending',
      timerSeconds: 0,
      priority: 'normal',
    }]

    // If deadline was provided, auto-assign priority
    if (deadline) {
      const totalHours = parseDeadlineToHours(deadline)
      if (totalHours !== null) {
        const totalEstimatedMins = subtasks.reduce((sum, s) => sum + (s.estimatedMinutes || 25), 0)
        const totalEstimatedHours = totalEstimatedMins / 60
        assignPriorities(subtasks, totalEstimatedHours, totalHours)
      }
    }

    const task = {
      id: `task-${Date.now()}`,
      title,
      deadline: deadline || null,
      createdAt: new Date().toISOString(),
      status: 'pending',
      subtasks,
    }
    setTasks(prev => [task, ...prev])
    return task
  }, [])

  const updateSubtask = useCallback((taskId, subtaskId, changes) => {
    setTasks(prev => prev.map(t => t.id !== taskId ? t : {
      ...t,
      subtasks: t.subtasks.map(s => s.id !== subtaskId ? s : { ...s, ...changes }),
    }))
  }, [])

  const editSubtask = useCallback((taskId, subtaskId, newTitle) => {
    setTasks(prev => prev.map(t => t.id !== taskId ? t : {
      ...t,
      subtasks: t.subtasks.map(s => s.id !== subtaskId ? s : { ...s, title: newTitle }),
    }))
  }, [])

  const markSubtaskDone = useCallback((taskId, subtaskId, timerSeconds) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const subtasks = t.subtasks.map(s => s.id !== subtaskId ? s : { ...s, status: 'done', timerSeconds })
      const allDone = subtasks.every(s => s.status === 'done')
      return { ...t, subtasks, status: allDone ? 'done' : t.status }
    }))
  }, [])

  const deleteTask = useCallback((taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }, [])

  const deleteSubtask = useCallback((taskId, subtaskId) => {
    setTasks(prev => {
      return prev.map(t => {
        if (t.id !== taskId) return t
        const remaining = t.subtasks.filter(s => s.id !== subtaskId)
        if (remaining.length === 0) return null // remove the whole task
        return { ...t, subtasks: remaining }
      }).filter(Boolean)
    })
  }, [])

  return {
    tasks, loading, decomposing, error,
    addTask, addTaskOffline, updateSubtask, editSubtask,
    markSubtaskDone, deleteTask, deleteSubtask,
  }
}

/**
 * Parse a deadline string like "2 days", "5 hours", "1 day 3 hours" into total hours.
 */
function parseDeadlineToHours(deadline) {
  if (!deadline || typeof deadline !== 'string') return null
  const str = deadline.toLowerCase().trim()

  let totalHours = 0
  let matched = false

  // Match days
  const dayMatch = str.match(/(\d+(?:\.\d+)?)\s*d(?:ay)?s?/)
  if (dayMatch) {
    totalHours += parseFloat(dayMatch[1]) * 24
    matched = true
  }

  // Match hours
  const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*h(?:our)?s?/)
  if (hourMatch) {
    totalHours += parseFloat(hourMatch[1])
    matched = true
  }

  // If just a plain number, assume hours
  if (!matched) {
    const num = parseFloat(str)
    if (!isNaN(num)) return num
    return null
  }

  return totalHours
}

/**
 * Assign priority labels based on time pressure.
 * If available time < 2× estimated time, mark the earliest/largest subtasks as high priority.
 */
function assignPriorities(subtasks, totalEstimatedHours, availableHours) {
  const ratio = availableHours / totalEstimatedHours
  if (ratio < 2) {
    // Time is tight — mark all as high priority
    subtasks.forEach(s => { s.priority = 'high' })
  } else if (ratio < 3) {
    // Moderate pressure — mark the top half (by estimated time, descending) as high
    const sorted = [...subtasks].sort((a, b) => (b.estimatedMinutes || 25) - (a.estimatedMinutes || 25))
    const halfCount = Math.ceil(sorted.length / 2)
    const highIds = new Set(sorted.slice(0, halfCount).map(s => s.id))
    subtasks.forEach(s => {
      if (highIds.has(s.id)) s.priority = 'high'
    })
  }
  // else: ratio >= 3, no high priority needed
}
