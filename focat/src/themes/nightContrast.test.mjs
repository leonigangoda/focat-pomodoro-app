import test from 'node:test'
import assert from 'node:assert/strict'

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16) / 255)
  const [red, green, blue] = channels.map(value =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

function blend(foreground, background, alpha) {
  const foregroundChannels = foreground.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16))
  const backgroundChannels = background.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16))
  return foregroundChannels
    .map((channel, index) => Math.round(channel * alpha + backgroundChannels[index] * (1 - alpha)))
    .map(channel => channel.toString(16).padStart(2, '0'))
    .join('')
}

const brightestImagePixel = 'FFFFFF'
const worstCaseGlass = blend('001A40', brightestImagePixel, 0.68)
const worstCaseNestedCard = blend('ADDBFF', worstCaseGlass, 0.12)

const textPairs = [
  ['pastel yellow on app background', 'FFF9B8', '001A40'],
  ['pastel yellow on worst-case glass', 'FFF9B8', worstCaseGlass],
  ['pastel yellow on worst-case nested card', 'FFF9B8', worstCaseNestedCard],
  ['pastel yellow on glass fallback', 'FFF9B8', '0A2A5C'],
  ['pastel yellow on selected chip', 'FFF9B8', '4A2300'],
  ['dark blue play icon on yellow', '001A40', 'FFF9B8'],
]

const iconAndBorderPairs = [
  ['idle icon on app background', '7FA9D1', '001A40'],
  ['hover icon on app background', 'BFE6FF', '001A40'],
  ['pressed icon on app background', 'FFF9B8', '001A40'],
  ['dark icon edge over brightest star', '001A40', 'FFFFFF'],
  ['pastel yellow digits against dark edge', 'FFF9B8', '001A40'],
  ['expand icon against dark edge', '7FA9D1', '001A40'],
  ['light blue ring track against dark edge', 'ADDBFF', '001A40'],
  ['window border on app background', 'ADDBFF', '001A40'],
  ['focus outline on app background', 'FFF9B8', '001A40'],
]

for (const [name, foreground, background] of textPairs) {
  test(`${name} meets 4.5:1`, () => {
    assert.ok(contrastRatio(foreground, background) >= 4.5)
  })
}

for (const [name, foreground, background] of iconAndBorderPairs) {
  test(`${name} meets 3:1`, () => {
    assert.ok(contrastRatio(foreground, background) >= 3)
  })
}
