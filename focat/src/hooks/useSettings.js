import { useState, useEffect } from 'react'

const DEFAULTS = {
  catName: 'Miso',
  catAccessory: 'chef-hat',
  defaultTimer: 25,
  musicVolume: 0.5,
  musicTrack: 0,
  studyPattern: '',
  focusGuardEnabled: true,
  focusGuardStartAtLogin: true,
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const saved = await window.electron?.loadSettings()
        if (saved) setSettings(s => ({ ...s, ...saved }))
      } catch (e) { console.warn(e) }
      finally { setLoaded(true) }
    }
    load()
  }, [])

  useEffect(() => {
    if (!loaded) return
    window.electron?.saveSettings(settings)
  }, [settings, loaded])

  const update = (changes) => setSettings(s => ({ ...s, ...changes }))
  return { settings, update }
}
