import { Overlay } from './components/Overlay'
import { Settings } from './components/Settings'

export function App() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  return mode === 'settings' ? <Settings /> : <Overlay />
}
