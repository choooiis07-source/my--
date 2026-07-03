import type { CSSProperties } from 'react'
import frontAsset from '../assets/turtle-3d-front.png'
import backAsset from '../assets/turtle-3d-back.png'
import normalAsset from '../assets/turtle-3d-normal.png'
import stepAsset from '../assets/turtle-3d-step2.png'
import hiddenAsset from '../assets/turtle-3d-hidden.png'

type Props = {
  shellColor: string
  skinColor: string
  mood: 'walking' | 'happy' | 'annoyed' | 'angry' | 'sad' | 'shy' | 'sleepy'
  view: 'front' | 'back' | 'left' | 'right'
  isMoving?: boolean
}

function hueFromHex(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  const red = ((value >> 16) & 255) / 255
  const green = ((value >> 8) & 255) / 255
  const blue = (value & 255) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  if (max === min) return 82
  const delta = max - min
  const section = max === red
    ? ((green - blue) / delta) % 6
    : max === green
      ? (blue - red) / delta + 2
      : (red - green) / delta + 4
  return (section * 60 + 360) % 360
}

export function Turtle({ shellColor, skinColor, mood, view, isMoving = false }: Props) {
  const style = {
    '--shell': shellColor,
    '--skin': skinColor,
    '--hue-shift': `${hueFromHex(shellColor) - 82}deg`,
  } as CSSProperties
  const isProfile = view === 'left' || view === 'right'
  const normalSource = isProfile ? normalAsset : view === 'front' ? frontAsset : backAsset
  const stepSource = isProfile ? stepAsset : normalSource

  return (
    <span className={`turtle turtle--${mood} turtle--view-${view}${isMoving ? ' turtle--moving' : ''}`} style={style} role="img" aria-label="행운의 바다거북이">
      <span className="turtle-art">
        <img className="turtle-art__image turtle-art__image--normal" src={normalSource} alt="" draggable={false} />
        <img className="turtle-art__image turtle-art__image--step2" src={stepSource} alt="" draggable={false} />
        <img className="turtle-art__image turtle-art__image--hidden" src={hiddenAsset} alt="" draggable={false} />
        <span className="turtle-expression">
          <span className="turtle-expression__eye" />
          <span className="turtle-expression__tear" />
        </span>
      </span>
      <span className="turtle-art__sparkles turtle-art__sparkles--left">✦</span>
      <span className="turtle-art__sparkles turtle-art__sparkles--right">✦</span>
    </span>
  )
}
