import type { DesktopEnvironment, TurtleSettings } from './types'

const storageKey = 'lucky-turtle-settings'
const defaults: TurtleSettings = {
  name: '토리',
  shellColor: '#5f8063',
  skinColor: '#91aa77',
  speed: 'normal',
  launchOnStartup: false,
  detectScreenLines: false,
  hasCompletedOnboarding: true,
}

function getSettings(): TurtleSettings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) ?? '{}') }
  } catch {
    return defaults
  }
}

function getDesktop(): DesktopEnvironment {
  return {
    origin: { x: 0, y: 0 },
    displays: [{
      id: 1,
      bounds: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
      workArea: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
      scaleFactor: window.devicePixelRatio,
    }],
  }
}

export function installWebBridge() {
  if (window.turtleDesktop) return

  const settingsListeners = new Set<(settings: TurtleSettings) => void>()
  window.turtleDesktop = {
    getSettings: async () => getSettings(),
    saveSettings: async (settings) => {
      localStorage.setItem(storageKey, JSON.stringify(settings))
      settingsListeners.forEach((listener) => listener(settings))
    },
    getDesktop: async () => getDesktop(),
    scanVerticalLines: async () => [],
    setMouseInteractive: () => undefined,
    openSettings: () => { window.location.search = '?mode=settings' },
    quit: () => { window.location.href = window.location.pathname },
    onSettingsChanged: (callback) => {
      settingsListeners.add(callback)
      return () => settingsListeners.delete(callback)
    },
    onDesktopChanged: (callback) => {
      const onResize = () => callback(getDesktop())
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    },
  }
}
