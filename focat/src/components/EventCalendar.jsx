import React, { useMemo, useState } from 'react'
import styles from './EventCalendar.module.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const EVENT_COLORS = ['#9F8700', '#5C4400', '#C8320A', '#2E7D32', '#4B4B54']

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayKey() {
  return toDateKey(new Date())
}

function formatEventDate(startAt) {
  const date = new Date(startAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getTimeLeftLabel(startAt) {
  const start = new Date(startAt).getTime()
  if (Number.isNaN(start)) return ''

  const diffMs = start - Date.now()
  if (diffMs <= 0) return 'Now'

  const hours = Math.ceil(diffMs / (60 * 60 * 1000))
  if (hours <= 10) return `${hours}h left`
  if (hours < 24) return 'Tomorrow'

  const days = Math.ceil(hours / 24)
  return `${days}d left`
}

function makeCalendarDays(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = firstDay.getDay()

  const cells = []
  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({ key: `blank-${i}`, blank: true })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day)
    cells.push({ key: toDateKey(date), day, dateKey: toDateKey(date) })
  }
  return cells
}

export default function EventCalendar({ events, onAddEvent, onDeleteEvent, onClose }) {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => todayKey())
  const [title, setTitle] = useState('')
  const [dateValue, setDateValue] = useState(() => todayKey())
  const [timeValue, setTimeValue] = useState('09:00')
  const [color, setColor] = useState(EVENT_COLORS[0])
  const [reminderType, setReminderType] = useState('none')
  const [customValue, setCustomValue] = useState('10')
  const [customUnit, setCustomUnit] = useState('minutes')

  const calendarDays = useMemo(() => makeCalendarDays(viewDate), [viewDate])

  const eventsByDate = useMemo(() => {
    return events.reduce((acc, event) => {
      const date = new Date(event.startAt)
      if (Number.isNaN(date.getTime())) return acc
      const key = toDateKey(date)
      acc[key] = acc[key] || []
      acc[key].push(event)
      return acc
    }, {})
  }, [events])

  const upcomingEvents = useMemo(() => {
    const now = Date.now()
    const limitDate = new Date()
    limitDate.setMonth(limitDate.getMonth() + 3)
    return [...events]
      .filter(event => {
        const start = new Date(event.startAt).getTime()
        return start >= now && start <= limitDate.getTime()
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 5)
  }, [events])

  const selectedEvents = (eventsByDate[selectedDate] || [])
    .slice()
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  function shiftMonth(amount) {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1))
  }

  function handleSelectDate(dateKey) {
    setSelectedDate(dateKey)
    setDateValue(dateKey)
  }

  function handleCardClick(e, eventId) {
    // If the click is on the delete button itself, let the delete button handle it
    if (e.target.closest(`.${styles.deleteBtn}`)) return
    if (window.confirm("Do you want to delete this event?")) {
      onDeleteEvent(eventId)
    }
  }

  function handleDeleteClick(eventId) {
    if (window.confirm("Are you sure you want to delete this event?")) {
      onDeleteEvent(eventId)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = title.trim()
    const start = new Date(`${dateValue}T${timeValue}`)
    if (!trimmed || Number.isNaN(start.getTime())) return

    let reminderValue = 0
    if (reminderType === '30m') {
      reminderValue = 30
    } else if (reminderType === '1d') {
      reminderValue = 24 * 60
    } else if (reminderType === '3d') {
      reminderValue = 3 * 24 * 60
    } else if (reminderType === '7d') {
      reminderValue = 7 * 24 * 60
    } else if (reminderType === 'custom') {
      const val = parseInt(customValue, 10) || 0
      if (customUnit === 'minutes') {
        reminderValue = val
      } else if (customUnit === 'hours') {
        reminderValue = val * 60
      } else if (customUnit === 'days') {
        reminderValue = val * 24 * 60
      }
    }

    const reminder = {
      type: reminderType,
      value: reminderValue,
      customValue: reminderType === 'custom' ? customValue : undefined,
      customUnit: reminderType === 'custom' ? customUnit : undefined,
    }

    onAddEvent({
      title: trimmed,
      startAt: start.toISOString(),
      color,
      reminder,
    })

    setTitle('')
    setReminderType('none')
    setCustomValue('10')
    setCustomUnit('minutes')
    setSelectedDate(dateValue)
    setViewDate(new Date(start.getFullYear(), start.getMonth(), 1))
  }

  return (
    <section className={styles.panel}>
      <div className={styles.drawerHeader}>
        <div className={styles.titleRow}>
          <h2 className={styles.drawerTitle}>Calendar</h2>
          <button className={styles.closeBtn} onClick={onClose} title="Close Calendar">
            ✕
          </button>
        </div>
        <div className={styles.drawerSubtitle}>
          Schedule your upcoming tasks so you won't miss deadlines
        </div>
      </div>

      <div className={styles.container}>
        {/* LEFT COLUMN: Calendar Grid */}
        <div className={styles.leftCol}>
          <div className={styles.header}>
            <button className={styles.monthBtn} onClick={() => shiftMonth(-1)} title="Previous month">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className={styles.monthTitle}>
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <button className={styles.monthBtn} onClick={() => shiftMonth(1)} title="Next month">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className={styles.weekdays}>
            {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
          </div>

          <div className={styles.grid}>
            {calendarDays.map(cell => {
              if (cell.blank) return <div key={cell.key} className={styles.blankCell} />
              const dayEvents = eventsByDate[cell.dateKey] || []
              const isToday = cell.dateKey === todayKey()
              const isSelected = cell.dateKey === selectedDate

              return (
                <button
                  key={cell.key}
                  className={`${styles.dayCell} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleSelectDate(cell.dateKey)}
                >
                  <span className={styles.dayNumber}>{cell.day}</span>
                  {dayEvents.length > 0 && (
                    <span className={styles.eventDots}>
                      {dayEvents.slice(0, 3).map(event => (
                        <span key={event.id} style={{ background: event.color }} />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Event list and form */}
        <div className={styles.rightCol}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              className={styles.titleInput}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event name"
              required
            />
            <input
              className={styles.dateInput}
              type="date"
              value={dateValue}
              onChange={e => {
                setDateValue(e.target.value)
                setSelectedDate(e.target.value)
              }}
            />
            <input
              className={styles.timeInput}
              type="time"
              value={timeValue}
              onChange={e => setTimeValue(e.target.value)}
            />

            <div className={styles.reminderRow}>
              <select
                className={styles.selectInput}
                value={reminderType}
                onChange={e => setReminderType(e.target.value)}
              >
                <option value="none">No reminder</option>
                <option value="30m">30 minutes before</option>
                <option value="1d">1 day before</option>
                <option value="3d">3 days before</option>
                <option value="7d">7 days before</option>
                <option value="custom">Custom reminder</option>
              </select>
            </div>

            {reminderType === 'custom' && (
              <div className={`${styles.customReminderRow} fade-in`}>
                <input
                  type="number"
                  className={styles.customValueInput}
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  min="1"
                  placeholder="e.g. 10"
                  required
                />
                <select
                  className={styles.customUnitInput}
                  value={customUnit}
                  onChange={e => setCustomUnit(e.target.value)}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            )}

            <div className={styles.colorRow}>
              <div className={styles.swatches}>
                {EVENT_COLORS.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.swatch} ${option === color ? styles.swatchActive : ''}`}
                    style={{ background: option }}
                    onClick={() => setColor(option)}
                    title={`Use ${option}`}
                  />
                ))}
              </div>
            </div>

            <button className={styles.addBtn} type="submit">Add Event</button>
          </form>

          <div className={styles.eventArea}>
            <div className={styles.listTitle}>
              {selectedEvents.length > 0 ? 'Selected day' : 'Upcoming'}
            </div>
            <div className={styles.eventList}>
              {(selectedEvents.length > 0 ? selectedEvents : upcomingEvents).map(event => (
                <div
                  className={styles.eventCard}
                  key={event.id}
                  onClick={(e) => handleCardClick(e, event.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className={styles.eventColor} style={{ background: event.color }} />
                  <div className={styles.eventInfo}>
                    <div className={styles.eventTitle}>{event.title}</div>
                    <div className={styles.eventMeta}>
                      {formatEventDate(event.startAt)} - {getTimeLeftLabel(event.startAt)}
                      {event.reminder && event.reminder.type !== 'none' && (
                        <span className={styles.reminderBadge}>
                          {' '}🔔 {event.reminder.type === 'custom'
                            ? `${event.reminder.customValue} ${event.reminder.customUnit}`
                            : event.reminder.type === '30m'
                            ? '30m'
                            : event.reminder.type === '1d'
                            ? '1d'
                            : event.reminder.type === '3d'
                            ? '3d'
                            : '7d'} before
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(event.id)
                    }}
                    title="Delete event"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              ))}
              {selectedEvents.length === 0 && upcomingEvents.length === 0 && (
                <div className={styles.empty}>No upcoming events yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
