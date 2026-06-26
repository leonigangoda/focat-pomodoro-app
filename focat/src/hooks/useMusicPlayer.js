import { useState, useRef, useEffect, useCallback } from 'react'

export const TRACKS = [
  { title: 'White Noise',      src: 'https://www.soundjay.com/nature/sounds/rain-07.mp3' },
  { title: 'Brown Noise',      src: 'https://www.soundjay.com/nature/sounds/river-1.mp3' },
  { title: 'Lofi Rain',        src: 'https://www.soundjay.com/nature/sounds/rain-07.mp3' },
  { title: 'Deep Focus',       src: 'https://www.soundjay.com/free-music/ambient-loop-01.mp3' },
  { title: 'Midnight Study',   src: 'https://www.soundjay.com/free-music/ambient-loop-03.mp3' },
]

class FocusAudioSynth {
  constructor() {
    this.ctx = null
    this.source = null
    this.nodes = []
    this.playing = false
    this.volumeNode = null
    this.currentType = null
    this.rainDropletInterval = null
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      this.volumeNode = this.ctx.createGain()
      this.volumeNode.connect(this.ctx.destination)
    }
  }

  setVolume(vol) {
    this.init()
    if (this.volumeNode) {
      this.volumeNode.gain.setValueAtTime(vol, this.ctx.currentTime)
    }
  }

  stop() {
    if (this.rainDropletInterval) {
      clearInterval(this.rainDropletInterval)
      this.rainDropletInterval = null
    }
    if (this.source) {
      try {
        this.source.stop()
      } catch (e) {}
      this.source = null
    }
    this.nodes.forEach(n => {
      try { n.disconnect() } catch (e) {}
    })
    this.nodes = []
    this.playing = false
  }

  play(type, volume) {
    this.init()
    this.stop()
    this.setVolume(volume)

    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }

    this.currentType = type
    this.playing = true

    try {
      if (type === 'White Noise') {
        this.playWhiteNoise()
      } else if (type === 'Brown Noise') {
        this.playBrownNoise()
      } else if (type === 'Lofi Rain') {
        this.playRain()
      } else if (type === 'Deep Focus') {
        this.playDeepFocus()
      } else if (type === 'Midnight Study') {
        this.playMidnightStudy()
      }
    } catch (e) {
      console.error("Local synth failed to play", e)
    }
  }

  createNoiseBuffer(color) {
    const sampleRate = this.ctx.sampleRate
    const bufferSize = 2 * sampleRate
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate)
    const data = buffer.getChannelData(0)

    if (color === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
    } else if (color === 'brown') {
      let lastOut = 0.0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        data[i] = (lastOut + (0.02 * white)) / 1.02
        lastOut = data[i]
        data[i] *= 3.5 // compensation
      }
    } else if (color === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        data[i] *= 0.11
        b6 = white * 0.115926
      }
    }
    return buffer
  }

  playWhiteNoise() {
    const buffer = this.createNoiseBuffer('white')
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(this.volumeNode)
    source.start(0)
    this.source = source
  }

  playBrownNoise() {
    const buffer = this.createNoiseBuffer('brown')
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(this.volumeNode)
    source.start(0)
    this.source = source
  }

  playRain() {
    const pinkBuffer = this.createNoiseBuffer('pink')
    const pinkSource = this.ctx.createBufferSource()
    pinkSource.buffer = pinkBuffer
    pinkSource.loop = true

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1200

    pinkSource.connect(filter)
    filter.connect(this.volumeNode)
    pinkSource.start(0)
    this.source = pinkSource

    this.nodes.push(pinkSource, filter)

    const intervalId = setInterval(() => {
      if (!this.playing || this.currentType !== 'Lofi Rain') {
        clearInterval(intervalId)
        return
      }
      if (Math.random() > 0.4) {
        this.triggerRaindrop()
      }
    }, 150)

    this.rainDropletInterval = intervalId
  }

  triggerRaindrop() {
    if (!this.ctx || this.ctx.state === 'suspended') return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      
      const pitch = 800 + Math.random() * 1000
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05)

      gain.gain.setValueAtTime(0.01 + Math.random() * 0.03, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.06)

      osc.connect(gain)
      gain.connect(this.volumeNode)

      osc.start()
      osc.stop(this.ctx.currentTime + 0.07)
    } catch (e) {}
  }

  playDeepFocus() {
    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    const gain1 = this.ctx.createGain()
    const gain2 = this.ctx.createGain()
    
    const pan1 = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null
    const pan2 = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null

    osc1.frequency.setValueAtTime(95, this.ctx.currentTime)
    osc2.frequency.setValueAtTime(101, this.ctx.currentTime)

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 150

    gain1.gain.setValueAtTime(0.5, this.ctx.currentTime)
    gain2.gain.setValueAtTime(0.5, this.ctx.currentTime)

    if (pan1 && pan2) {
      pan1.pan.setValueAtTime(-1, this.ctx.currentTime)
      pan2.pan.setValueAtTime(1, this.ctx.currentTime)
      osc1.connect(gain1).connect(pan1).connect(filter)
      osc2.connect(gain2).connect(pan2).connect(filter)
    } else {
      osc1.connect(gain1).connect(filter)
      osc2.connect(gain2).connect(filter)
    }

    filter.connect(this.volumeNode)

    osc1.start(0)
    osc2.start(0)

    this.source = osc1
    this.nodes.push(osc1, osc2, gain1, gain2, filter)
    if (pan1) this.nodes.push(pan1)
    if (pan2) this.nodes.push(pan2)
  }

  playMidnightStudy() {
    const rootFreq = 110
    const frequencies = [rootFreq, rootFreq * 1.5, rootFreq * 2, rootFreq * 2.5, rootFreq * 3]
    
    const oscillators = frequencies.map((freq, i) => {
      const osc = this.ctx.createOscillator()
      const oscGain = this.ctx.createGain()
      
      osc.type = i % 2 === 0 ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
      osc.detune.setValueAtTime((Math.random() - 0.5) * 10, this.ctx.currentTime)

      oscGain.gain.setValueAtTime(0.15 / frequencies.length, this.ctx.currentTime)
      
      osc.connect(oscGain)
      return { osc, gain: oscGain }
    })

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(250, this.ctx.currentTime)

    const lfo = this.ctx.createOscillator()
    const lfoGain = this.ctx.createGain()
    lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime)
    lfoGain.gain.setValueAtTime(100, this.ctx.currentTime)

    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)

    oscillators.forEach(({ osc, gain }) => {
      gain.connect(filter)
      osc.start(0)
    })
    
    lfo.start(0)

    filter.connect(this.volumeNode)

    this.source = oscillators[0].osc
    this.nodes.push(lfo, lfoGain, filter)
    oscillators.forEach(item => {
      this.nodes.push(item.osc, item.gain)
    })
  }
}

const synthPlayer = new FocusAudioSynth()

export function useMusicPlayer(initialVolume = 0.5, initialTrack = 0) {
  const [trackIndex, setTrackIndex] = useState(initialTrack)
  const [playing, setPlaying]       = useState(false)
  const [volume, setVolume]         = useState(initialVolume)
  const [shuffled, setShuffled]     = useState(false)
  const [audioMode, setAudioMode]   = useState('online') // online | local

  const audioRef = useRef(null)
  const timeoutRef = useRef(null)
  const fadeIntervalRef = useRef(null)
  const targetVolumeRef = useRef(initialVolume)

  const startFadeIn = useCallback((targetVol) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
      fadeIntervalRef.current = null
    }

    const durationMs = 7000
    const intervalMs = 100 // Update volume every 100ms
    const steps = durationMs / intervalMs
    let currentStep = 0

    fadeIntervalRef.current = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const currentVol = targetVol * progress

      if (progress >= 1) {
        if (audioRef.current) {
          audioRef.current.volume = targetVol
        }
        synthPlayer.setVolume(targetVol)
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      } else {
        if (audioRef.current) {
          audioRef.current.volume = currentVol
        }
        synthPlayer.setVolume(currentVol)
      }
    }, intervalMs)
  }, [])

  const playTrack = useCallback((idx, currentMode) => {
    // Clean up
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    synthPlayer.stop()
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const track = TRACKS[idx]

    if (currentMode === 'online') {
      console.log(`Attempting online audio for: ${track.title}`)
      const audio = new Audio(track.src)
      audio.loop = true
      audio.volume = 0 // Start at 0 for fade-in
      audioRef.current = audio

      let fallbackTriggered = false
      const triggerFallback = () => {
        if (fallbackTriggered) return
        fallbackTriggered = true
        console.warn(`Online audio failed for ${track.title}. Falling back to local synthesizer.`)
        if (audioRef.current === audio) {
          audio.pause()
          audioRef.current = null
        }
        setAudioMode('local')
      }

      timeoutRef.current = setTimeout(() => {
        if (audio.readyState < 2) {
          triggerFallback()
        }
      }, 4000)

      audio.addEventListener('error', triggerFallback)
      audio.play().catch(() => {
        triggerFallback()
      })
    } else {
      console.log(`Using local synthesizer for: ${track.title}`)
      synthPlayer.play(track.title, 0) // Start at 0 for fade-in
    }
  }, []) // Removed dependency on volume to prevent track restarting when volume changes

  // Playback effect
  useEffect(() => {
    if (playing) {
      playTrack(trackIndex, audioMode)
      startFadeIn(targetVolumeRef.current)
    } else {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      synthPlayer.stop()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [trackIndex, playing, audioMode, playTrack, startFadeIn])

  // Volume effect
  useEffect(() => {
    targetVolumeRef.current = volume
    // If the user manually changes the volume, cancel any ongoing fade-in and apply it immediately
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
      fadeIntervalRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
    synthPlayer.setVolume(volume)
  }, [volume])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      synthPlayer.stop()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
      }
    }
  }, [])

  const play = () => {
    setAudioMode('online')
    setPlaying(true)
  }

  const pause = () => {
    setPlaying(false)
  }

  const toggle = () => {
    if (playing) {
      pause()
    } else {
      play()
    }
  }

  const next = () => {
    setAudioMode('online')
    if (shuffled) {
      const otherIndices = TRACKS.map((_, i) => i).filter(i => i !== trackIndex)
      const randIdx = otherIndices[Math.floor(Math.random() * otherIndices.length)]
      setTrackIndex(randIdx)
    } else {
      setTrackIndex(i => (i + 1) % TRACKS.length)
    }
  }

  const prev = () => {
    setAudioMode('online')
    if (shuffled) {
      const otherIndices = TRACKS.map((_, i) => i).filter(i => i !== trackIndex)
      const randIdx = otherIndices[Math.floor(Math.random() * otherIndices.length)]
      setTrackIndex(randIdx)
    } else {
      setTrackIndex(i => (i - 1 + TRACKS.length) % TRACKS.length)
    }
  }

  const toggleShuffle = () => {
    setShuffled(s => !s)
  }

  const setVol = (v) => {
    setVolume(v)
  }

  return {
    tracks: TRACKS,
    trackIndex,
    currentTrack: TRACKS[trackIndex],
    playing,
    volume,
    shuffled,
    audioMode,
    toggle,
    next,
    prev,
    toggleShuffle,
    setVolume: setVol,
  }
}
