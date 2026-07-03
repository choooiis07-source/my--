import { Overlay } from './components/Overlay'
import { Settings } from './components/Settings'

export function App() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  if (mode === 'settings') return <Settings />

  const isDesktopApp = navigator.userAgent.includes('Electron')
  if (isDesktopApp) return <Overlay />

  return (
    <div className="web-preview">
      <header className="web-preview__intro">
        <span className="web-preview__badge">WEB PREVIEW</span>
        <h1>행운의 거북이</h1>
        <p>화면 아래를 산책하는 거북이를 눌러 보세요.<br />기분에 따라 표정이 달라져요.</p>
      </header>
      <div className="web-preview__floor" aria-hidden="true" />
      <Overlay />
    </div>
  )
}
