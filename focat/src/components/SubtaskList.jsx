import React, { useState } from 'react'
import styles from './SubtaskList.module.css'

export default function SubtaskList({
  tasks, activeId, timerState,
  onStart, onDone, onDelete,
  onDeleteSubtask, onEditSubtask,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDoneId, setConfirmDoneId] = useState(null)

  const allSubtasks = tasks.flatMap(task =>
    task.subtasks.map(s => ({ ...s, taskId: task.id, taskTitle: task.title }))
  )

  if (allSubtasks.length === 0) return (
    <div className={styles.empty}>
      Type a task above and press Enter ↵
    </div>
  )

  const formatSentenceCase = (str) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  function handleDoubleClick(sub) {
    if (sub.status === 'done') return
    setEditingId(sub.id)
    setEditValue(sub.title)
  }

  function handleEditKeyDown(e, sub) {
    if (e.key === 'Enter') {
      commitEdit(sub)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  function commitEdit(sub) {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== sub.title && onEditSubtask) {
      onEditSubtask(sub.taskId, sub.id, trimmed)
    }
    setEditingId(null)
  }

  return (
    <div className={styles.list}>
      {allSubtasks.map(sub => {
        const isActive = sub.id === activeId
        const isDone   = sub.status === 'done'
        const isEditing = editingId === sub.id
        const isHighPriority = sub.priority === 'high'

        return (
          <div
            key={sub.id}
            className={`${styles.card} ${isActive ? styles.active : ''} ${isDone ? styles.done : ''} fade-in`}
            data-click-feedback={!isDone && !isEditing ? 'true' : undefined}
            onClick={() => !isDone && !isEditing && !isActive && onStart(sub.taskId, sub)}
          >
            {/* Delete button */}
            <button
              className={styles.deleteBtn}
              onClick={e => { e.stopPropagation(); onDeleteSubtask?.(sub.taskId, sub.id) }}
              title="Delete subtask"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Info */}
            <div className={styles.info}>
              {isEditing ? (
                <input
                  className={styles.editInput}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => handleEditKeyDown(e, sub)}
                  onBlur={() => commitEdit(sub)}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <div
                  className={styles.title}
                  onDoubleClick={() => handleDoubleClick(sub)}
                  title="Double-click to edit"
                >
                  {formatSentenceCase(sub.title)}
                </div>
              )}
              <div className={styles.meta}>
                <span>{sub.estimatedMinutes}mins</span>
                {isHighPriority && !isDone && (
                  <span className={styles.priorityBadge}>High Priority</span>
                )}
                {isActive && <span className={styles.badge}>Current</span>}
                {isDone && <span className={`${styles.badge} ${styles.doneBadge}`}>Done</span>}
              </div>
            </div>

            {/* Hollow circle check */}
            <button
              className={`${styles.check} ${isDone ? styles.checked : ''}`}
              onClick={e => { e.stopPropagation(); setConfirmDoneId(sub.id) }}
              title="Mark done"
            >
              {isDone && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          </div>
        )
      })}
      
      {confirmDoneId && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDoneId(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <p>Are you sure this task is finished?</p>
            <div className={styles.modalButtons}>
              <button 
                className={styles.modalYesBtn} 
                onClick={() => {
                  const sub = allSubtasks.find(s => s.id === confirmDoneId)
                  if (sub) onDone(sub.taskId, sub.id)
                  setConfirmDoneId(null)
                }}
              >
                Yes
              </button>
              <button 
                className={styles.modalNoBtn} 
                onClick={() => setConfirmDoneId(null)}
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
