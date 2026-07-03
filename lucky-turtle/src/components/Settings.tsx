import { useEffect, useState } from 'react'
import { Turtle } from './Turtle'
import type { TurtleSettings } from '../types'

const shellColors = ['#74b66a', '#6ea8d9', '#a78bd4', '#e98e91', '#e4ad52', '#738a72']

export function Settings() {
  const [settings, setSettings] = useState<TurtleSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => { void window.turtleDesktop.getSettings().then(setSettings) }, [])
  if (!settings) return <div className="settings-loading">거북이를 깨우는 중…</div>

  const update = <K extends keyof TurtleSettings>(key: K, value: TurtleSettings[K]) => {
    setSettings({ ...settings, [key]: value })
    setSaved(false)
  }

  const save = async () => {
    await window.turtleDesktop.saveSettings(settings)
    setSaved(true)
  }

  return (
    <main className="settings-page">
      <header>
        <p className="eyebrow">LUCKY TURTLE</p>
        <h1>나의 행운 거북이</h1>
        <p>오늘의 기분에 어울리는 친구로 꾸며주세요.</p>
      </header>
      <div className="settings-preview">
        <Turtle shellColor={settings.shellColor} skinColor={settings.skinColor} mood="happy" view="left" />
      </div>
      <label className="field">
        <span>이름</span>
        <input maxLength={12} value={settings.name} onChange={(event) => update('name', event.target.value)} />
      </label>
      <fieldset>
        <legend>오늘의 등딱지 색</legend>
        <div className="color-list">
          {shellColors.map((color) => (
            <button
              key={color}
              className={settings.shellColor === color ? 'color color--active' : 'color'}
              style={{ backgroundColor: color }}
              onClick={() => update('shellColor', color)}
              aria-label={`등딱지 색 ${color}`}
            />
          ))}
          <input className="custom-color" type="color" value={settings.shellColor} onChange={(event) => update('shellColor', event.target.value)} />
        </div>
      </fieldset>
      <fieldset>
        <legend>산책 속도</legend>
        <div className="segmented">
          {([['slow', '느긋하게'], ['normal', '사뿐사뿐'], ['lively', '신나게']] as const).map(([value, label]) => (
            <button key={value} className={settings.speed === value ? 'active' : ''} onClick={() => update('speed', value)}>{label}</button>
          ))}
        </div>
      </fieldset>
      <label className="toggle-row">
        <span><strong>화면의 세로길 찾기</strong><small>화면은 기기 안에서만 분석하며 저장하거나 전송하지 않아요.</small></span>
        <input type="checkbox" checked={settings.detectScreenLines} onChange={(event) => update('detectScreenLines', event.target.checked)} />
      </label>
      <label className="toggle-row">
        <span><strong>컴퓨터를 켤 때 만나기</strong><small>로그인하면 거북이가 함께 일어나요.</small></span>
        <input type="checkbox" checked={settings.launchOnStartup} onChange={(event) => update('launchOnStartup', event.target.checked)} />
      </label>
      <button className="save-button" onClick={save}>{saved ? '저장했어요 ✓' : '이 모습으로 함께하기'}</button>
      <button className="quit-button" onClick={() => window.turtleDesktop.quit()}>거북이 쉬게 하기</button>
    </main>
  )
}
