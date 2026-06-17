/**
 * generate-meows.js
 * Synthesizes cat meow WAV audio files using pure math.
 * Run with: node electron/generate-meows.js
 *
 * Produces:
 *   public/sounds/meow-sweet.wav      — gentle, short meow for idle/daily prompt
 *   public/sounds/meow-normal.wav     — normal attention-seeking meow (first doomscroll nudge)
 *   public/sounds/meow-attention.wav  — slightly insistent meow (messaging app nudge)
 *   public/sounds/meow-annoyed.wav    — mildly annoyed meow (10 min doomscroll)
 *   public/sounds/meow-angry.wav      — prolonged angry meow (30 min doomscroll)
 */

const fs = require('fs')
const path = require('path')

const SAMPLE_RATE = 22050
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'sounds')

// ── helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

/** Write a mono 16-bit PCM WAV file */
function writeWav(filePath, samples) {
  const numSamples = samples.length
  const byteRate = SAMPLE_RATE * 2 // 16-bit mono
  const dataSize = numSamples * 2
  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)       // chunk size
  buffer.writeUInt16LE(1, 20)        // PCM
  buffer.writeUInt16LE(1, 22)        // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(2, 32)        // block align
  buffer.writeUInt16LE(16, 34)       // bits per sample

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }

  fs.writeFileSync(filePath, buffer)
  console.log(`  ✓ ${path.basename(filePath)} (${(dataSize / 1024).toFixed(1)} KB, ${(numSamples / SAMPLE_RATE).toFixed(2)}s)`)
}

/** Simple ADSR envelope */
function adsr(t, duration, attack, decay, sustain, release) {
  const releaseStart = duration - release
  if (t < attack) return t / attack
  if (t < attack + decay) return 1 - (1 - sustain) * ((t - attack) / decay)
  if (t < releaseStart) return sustain
  if (t < duration) return sustain * (1 - (t - releaseStart) / release)
  return 0
}

/**
 * Generate a meow sound.
 * A cat meow is roughly a vowel-like tone with a rising-then-falling pitch contour
 * and formant-like spectral emphasis.
 */
function generateMeow(opts) {
  const {
    duration = 0.4,       // total duration in seconds
    baseFreq = 700,       // starting fundamental frequency
    peakFreq = 900,       // peak frequency at midpoint
    endFreq = 600,        // ending frequency
    volume = 0.6,         // overall volume 0-1
    attack = 0.05,        // attack time
    decay = 0.05,         // decay time
    sustain = 0.7,        // sustain level
    release = 0.15,       // release time
    vibrato = 5,          // vibrato rate Hz
    vibratoDepth = 15,    // vibrato depth Hz
    harmonics = [1, 0.5, 0.25, 0.12], // harmonic amplitudes
    noiseAmount = 0.03,   // breathiness
  } = opts

  const numSamples = Math.ceil(duration * SAMPLE_RATE)
  const samples = new Float64Array(numSamples)

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    const progress = t / duration // 0→1

    // Pitch contour: rise to peak then fall
    let freq
    if (progress < 0.4) {
      freq = baseFreq + (peakFreq - baseFreq) * (progress / 0.4)
    } else {
      freq = peakFreq + (endFreq - peakFreq) * ((progress - 0.4) / 0.6)
    }

    // Add vibrato
    freq += Math.sin(2 * Math.PI * vibrato * t) * vibratoDepth

    // Generate harmonics
    let sample = 0
    for (let h = 0; h < harmonics.length; h++) {
      const hFreq = freq * (h + 1)
      sample += harmonics[h] * Math.sin(2 * Math.PI * hFreq * t / SAMPLE_RATE * SAMPLE_RATE / SAMPLE_RATE)
    }

    // Recompute properly with phase accumulation... let's simplify:
    // We need proper phase accumulation for changing frequency
    sample = 0
    // We'll use a trick: integrate frequency to get phase
    // But for simplicity, approximate:
    const phase = 2 * Math.PI * freq * t
    for (let h = 0; h < harmonics.length; h++) {
      sample += harmonics[h] * Math.sin(phase * (h + 1))
    }

    // Add slight noise for breathiness
    sample += noiseAmount * (Math.random() * 2 - 1)

    // Apply envelope
    const env = adsr(t, duration, attack, decay, sustain, release)
    sample *= env * volume

    samples[i] = sample
  }

  return samples
}

/** Concatenate sample arrays with optional silence gap */
function concat(arrays, gapSeconds = 0) {
  const gapSamples = Math.ceil(gapSeconds * SAMPLE_RATE)
  const gap = new Float64Array(gapSamples)
  const parts = []
  for (let i = 0; i < arrays.length; i++) {
    if (i > 0) parts.push(gap)
    parts.push(arrays[i])
  }
  const total = parts.reduce((s, a) => s + a.length, 0)
  const out = new Float64Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

// ── Generate each meow variant ───────────────────────────────────────────────

function main() {
  ensureDir(OUTPUT_DIR)
  console.log('Generating meow sounds...\n')

  // 1. Sweet meow — gentle, short, high-pitched, soft
  const sweet = generateMeow({
    duration: 0.35,
    baseFreq: 800,
    peakFreq: 950,
    endFreq: 700,
    volume: 0.4,
    attack: 0.06,
    decay: 0.04,
    sustain: 0.5,
    release: 0.12,
    vibrato: 4,
    vibratoDepth: 10,
    harmonics: [1, 0.3, 0.1],
    noiseAmount: 0.02,
  })
  writeWav(path.join(OUTPUT_DIR, 'meow-sweet.wav'), sweet)

  // 2. Normal meow — standard attention-seeking
  const normal = generateMeow({
    duration: 0.45,
    baseFreq: 700,
    peakFreq: 900,
    endFreq: 600,
    volume: 0.55,
    attack: 0.04,
    decay: 0.05,
    sustain: 0.65,
    release: 0.15,
    vibrato: 5,
    vibratoDepth: 18,
    harmonics: [1, 0.45, 0.2, 0.1],
    noiseAmount: 0.03,
  })
  writeWav(path.join(OUTPUT_DIR, 'meow-normal.wav'), normal)

  // 3. Attention meow — slightly insistent, two short meows
  const attn1 = generateMeow({
    duration: 0.3,
    baseFreq: 750,
    peakFreq: 1000,
    endFreq: 700,
    volume: 0.6,
    attack: 0.03,
    decay: 0.04,
    sustain: 0.7,
    release: 0.1,
    vibrato: 6,
    vibratoDepth: 20,
    harmonics: [1, 0.5, 0.25, 0.12],
    noiseAmount: 0.035,
  })
  const attn2 = generateMeow({
    duration: 0.35,
    baseFreq: 800,
    peakFreq: 1050,
    endFreq: 650,
    volume: 0.65,
    attack: 0.03,
    decay: 0.04,
    sustain: 0.7,
    release: 0.12,
    vibrato: 6,
    vibratoDepth: 22,
    harmonics: [1, 0.5, 0.3, 0.15],
    noiseAmount: 0.04,
  })
  writeWav(path.join(OUTPUT_DIR, 'meow-attention.wav'), concat([attn1, attn2], 0.15))

  // 4. Annoyed meow — louder, more harmonics, slightly longer
  const annoyed1 = generateMeow({
    duration: 0.5,
    baseFreq: 650,
    peakFreq: 1050,
    endFreq: 550,
    volume: 0.75,
    attack: 0.02,
    decay: 0.05,
    sustain: 0.8,
    release: 0.18,
    vibrato: 7,
    vibratoDepth: 30,
    harmonics: [1, 0.6, 0.35, 0.2, 0.1],
    noiseAmount: 0.05,
  })
  const annoyed2 = generateMeow({
    duration: 0.4,
    baseFreq: 700,
    peakFreq: 1100,
    endFreq: 500,
    volume: 0.7,
    attack: 0.02,
    decay: 0.04,
    sustain: 0.75,
    release: 0.15,
    vibrato: 8,
    vibratoDepth: 28,
    harmonics: [1, 0.55, 0.3, 0.18],
    noiseAmount: 0.045,
  })
  writeWav(path.join(OUTPUT_DIR, 'meow-annoyed.wav'), concat([annoyed1, annoyed2], 0.12))

  // 5. Angry meow — prolonged, loud, harsh, multiple bursts
  const angry1 = generateMeow({
    duration: 0.7,
    baseFreq: 600,
    peakFreq: 1150,
    endFreq: 500,
    volume: 0.9,
    attack: 0.015,
    decay: 0.04,
    sustain: 0.85,
    release: 0.25,
    vibrato: 9,
    vibratoDepth: 40,
    harmonics: [1, 0.7, 0.45, 0.3, 0.15, 0.08],
    noiseAmount: 0.07,
  })
  const angry2 = generateMeow({
    duration: 0.55,
    baseFreq: 650,
    peakFreq: 1200,
    endFreq: 450,
    volume: 0.85,
    attack: 0.02,
    decay: 0.03,
    sustain: 0.8,
    release: 0.2,
    vibrato: 10,
    vibratoDepth: 45,
    harmonics: [1, 0.65, 0.4, 0.25, 0.12],
    noiseAmount: 0.06,
  })
  const angry3 = generateMeow({
    duration: 0.8,
    baseFreq: 550,
    peakFreq: 1100,
    endFreq: 400,
    volume: 0.95,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.9,
    release: 0.3,
    vibrato: 8,
    vibratoDepth: 50,
    harmonics: [1, 0.75, 0.5, 0.35, 0.2, 0.1],
    noiseAmount: 0.08,
  })
  writeWav(path.join(OUTPUT_DIR, 'meow-angry.wav'), concat([angry1, angry2, angry3], 0.1))

  console.log('\nDone! All meow sounds generated.')
}

main()
