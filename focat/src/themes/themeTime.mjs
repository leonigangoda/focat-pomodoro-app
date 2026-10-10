export const DAY_START_MINUTES = 5 * 60
export const NIGHT_START_MINUTES = 19 * 60 + 30

export function getThemeForTime(date) {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return minutes >= NIGHT_START_MINUTES || minutes < DAY_START_MINUTES
    ? 'night'
    : 'day'
}

export function getNextThemeBoundary(date) {
  const next = new Date(date)
  const minutes = date.getHours() * 60 + date.getMinutes()

  if (minutes < DAY_START_MINUTES) {
    next.setHours(5, 0, 0, 0)
  } else if (minutes < NIGHT_START_MINUTES) {
    next.setHours(19, 30, 0, 0)
  } else {
    next.setDate(next.getDate() + 1)
    next.setHours(5, 0, 0, 0)
  }

  return next
}
