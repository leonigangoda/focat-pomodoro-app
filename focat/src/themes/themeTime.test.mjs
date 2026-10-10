import test from 'node:test'
import assert from 'node:assert/strict'
import { getThemeForTime } from './themeTime.mjs'

function localTime(hours, minutes) {
  return new Date(2026, 0, 15, hours, minutes, 0, 0)
}

test('uses Starry Night immediately before 05:00', () => {
  assert.equal(getThemeForTime(localTime(4, 59)), 'night')
})

test('switches to Daylight at 05:00', () => {
  assert.equal(getThemeForTime(localTime(5, 0)), 'day')
})

test('uses Daylight immediately before 19:30', () => {
  assert.equal(getThemeForTime(localTime(19, 29)), 'day')
})

test('switches to Starry Night at 19:30', () => {
  assert.equal(getThemeForTime(localTime(19, 30)), 'night')
})

test('uses Starry Night at midnight', () => {
  assert.equal(getThemeForTime(localTime(0, 0)), 'night')
})
