import { Overlay } from './components/Overlay'
import { Settings } from './components/Settings'
import { WebLanding } from './components/WebLanding'

export function App() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  if (mode === 'settings') return <Settings />

  const isDesktopApp = navigator.userAgent.includes('Electron')
  if (isDesktopApp) return <Overlay />

  return <WebLanding />
}
