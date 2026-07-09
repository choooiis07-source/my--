import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Turtle } from './Turtle'
import type { DesktopEnvironment, Rectangle, TurtleSettings, VerticalRail } from '../types'

const TURTLE_WIDTH = 160
const TURTLE_HEIGHT = 100
const EDGE_MARGIN = 24

const defaults: TurtleSettings = {
  name: '토리', shellColor: '#5f8063', skinColor: '#91aa77', speed: 'normal', launchOnStartup: false,
  detectScreenLines: false, hasCompletedOnboarding: false,
}

type Point = { x: number; y: number }
type RouteMode = 'bottom' | 'approach' | 'climb' | 'descend'
type LocalRail = VerticalRail & { localX: number; localTop: number; localBottom: number }

function localArea(area: Rectangle, desktop: DesktopEnvironment): Rectangle {
  return { ...area, x: area.x - desktop.origin.x, y: area.y - desktop.origin.y }
}

function displayForPoint(desktop: DesktopEnvironment, point: Point) {
  return desktop.displays.find((display) => {
    const area = localArea(display.workArea, desktop)
    return point.x + TURTLE_WIDTH / 2 >= area.x && point.x + TURTLE_WIDTH / 2 <= area.x + area.width
  }) ?? desktop.displays[0]
}

function bottomPoint(desktop: DesktopEnvironment, current: Point, preferredX?: number): Point {
  const display = displayForPoint(desktop, current)
  const area = localArea(display.workArea, desktop)
  const minX = area.x + EDGE_MARGIN
  const maxX = area.x + area.width - TURTLE_WIDTH - EDGE_MARGIN
  return {
    x: preferredX === undefined ? minX + Math.random() * Math.max(1, maxX - minX) : Math.max(minX, Math.min(maxX, preferredX)),
    y: area.y + area.height - TURTLE_HEIGHT - 10,
  }
}

function clampPoint(point: Point, desktop: DesktopEnvironment | null): Point {
  if (!desktop) {
    return {
      x: Math.max(0, Math.min(window.innerWidth - TURTLE_WIDTH, point.x)),
      y: Math.max(0, Math.min(window.innerHeight - TURTLE_HEIGHT, point.y)),
    }
  }
  const display = displayForPoint(desktop, point)
  const area = localArea(display.workArea, desktop)
  return {
    x: Math.max(area.x, Math.min(area.x + area.width - TURTLE_WIDTH, point.x)),
    y: Math.max(area.y, Math.min(area.y + area.height - TURTLE_HEIGHT, point.y)),
  }
}

export function Overlay() {
  const [settings, setSettings] = useState(defaults)
  const [desktop, setDesktop] = useState<DesktopEnvironment | null>(null)
  const [position, setPosition] = useState<Point>({ x: 80, y: 500 })
  const [target, setTarget] = useState<Point>({ x: 500, y: 500 })
  const [mode, setMode] = useState<RouteMode>('bottom')
  const [activeRail, setActiveRail] = useState<LocalRail | null>(null)
  const [mood, setMood] = useState<'walking' | 'happy' | 'annoyed' | 'angry' | 'sad' | 'shy' | 'sleepy'>('walking')
  const [touches, setTouches] = useState(0)
  const [view, setView] = useState<'front' | 'back' | 'left' | 'right'>('left')
  const [isDragging, setIsDragging] = useState(false)
  const positionRef = useRef(position)
  const desktopRef = useRef<DesktopEnvironment | null>(null)
  const settingsRef = useRef(settings)
  const modeRef = useRef<RouteMode>('bottom')
  const isDraggingRef = useRef(false)
  const dragOffset = useRef<Point>({ x: 0, y: 0 })
  const dragStartedAt = useRef<Point>({ x: 0, y: 0 })
  const didDrag = useRef(false)
  const lastTime = useRef(performance.now())
  const lastClimb = useRef(0)
  const moodTimer = useRef<number | undefined>(undefined)
  const touchResetTimer = useRef<number | undefined>(undefined)

  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { desktopRef.current = desktop }, [desktop])
  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { isDraggingRef.current = isDragging }, [isDragging])

  const settleOnBottom = useCallback((environment: DesktopEnvironment) => {
    const next = bottomPoint(environment, positionRef.current)
    setPosition(next)
    positionRef.current = next
    setTarget(bottomPoint(environment, next))
    setMode('bottom')
  }, [])

  useEffect(() => {
    void window.turtleDesktop.getSettings().then(setSettings)
    void window.turtleDesktop.getDesktop().then((value) => {
      setDesktop(value)
      desktopRef.current = value
      settleOnBottom(value)
    })
    const offSettings = window.turtleDesktop.onSettingsChanged(setSettings)
    const offDesktop = window.turtleDesktop.onDesktopChanged((value) => {
      setDesktop(value)
      desktopRef.current = value
      settleOnBottom(value)
    })
    return () => { offSettings(); offDesktop() }
  }, [settleOnBottom])

  useEffect(() => {
    let cancelled = false
    const scan = async () => {
      const environment = desktopRef.current
      if (isDraggingRef.current || !settingsRef.current.detectScreenLines || !environment || modeRef.current !== 'bottom' || Date.now() - lastClimb.current < 12_000) return
      try {
        const detected = await window.turtleDesktop.scanVerticalLines()
        if (cancelled || detected.length === 0 || modeRef.current !== 'bottom') return
        const currentDisplay = displayForPoint(environment, positionRef.current)
        const available = detected
          .filter((rail) => rail.displayId === currentDisplay.id)
          .map((rail) => ({
            ...rail,
            localX: rail.x - environment.origin.x - TURTLE_WIDTH / 2,
            localTop: rail.top - environment.origin.y,
            localBottom: rail.bottom - environment.origin.y,
          }))
          .sort((a, b) => b.strength - a.strength)
        const rail = available[0]
        if (!rail) return
        setActiveRail(rail)
        setMode('approach')
        modeRef.current = 'approach'
        setTarget(bottomPoint(environment, positionRef.current, rail.localX))
      } catch {
        // Screen capture can be unavailable while Windows is locked; keep walking below.
      }
    }
    const firstScan = window.setTimeout(() => void scan(), 1800)
    const interval = window.setInterval(() => void scan(), 6500)
    return () => { cancelled = true; window.clearTimeout(firstScan); window.clearInterval(interval) }
  }, [])

  useEffect(() => {
    if (!desktop || mood === 'shy' || isDragging) return
    let frame = 0
    let arrivalTimer = 0
    let arrived = false
    const speed = { slow: 30, normal: 50, lively: 76 }[settings.speed]

    const arrive = () => {
      if (arrived) return
      arrived = true
      const current = positionRef.current
      if (mode === 'approach' && activeRail) {
        const display = displayForPoint(desktop, current)
        const area = localArea(display.workArea, desktop)
        const climbHeight = Math.min(390, Math.max(210, area.height * 0.36))
        setMode('climb')
        modeRef.current = 'climb'
        setTarget({ x: current.x, y: Math.max(activeRail.localTop + 30, current.y - climbHeight) })
        return
      }
      if (mode === 'climb') {
        setMood('happy')
        arrivalTimer = window.setTimeout(() => {
          setMood('walking')
          setMode('descend')
          modeRef.current = 'descend'
          setTarget(bottomPoint(desktop, positionRef.current, positionRef.current.x))
        }, 1400)
        return
      }
      if (mode === 'descend') {
        lastClimb.current = Date.now()
        setActiveRail(null)
        setMode('bottom')
        modeRef.current = 'bottom'
        arrivalTimer = window.setTimeout(() => setTarget(bottomPoint(desktop, positionRef.current)), 700)
        return
      }
      arrivalTimer = window.setTimeout(() => setTarget(bottomPoint(desktop, positionRef.current)), 900 + Math.random() * 1200)
    }

    const animate = (now: number) => {
      const elapsed = Math.min((now - lastTime.current) / 1000, 0.05)
      lastTime.current = now
      const current = positionRef.current
      const dx = target.x - current.x
      const dy = target.y - current.y
      const distance = Math.hypot(dx, dy)
      if (distance < 4) { arrive(); return }
      const desiredView = Math.abs(dx) >= Math.abs(dy)
        ? (dx >= 0 ? 'right' : 'left')
        : (dy >= 0 ? 'front' : 'back')
      setView((current) => current === desiredView ? current : desiredView)
      const next = { x: current.x + (dx / distance) * speed * elapsed, y: current.y + (dy / distance) * speed * elapsed }
      positionRef.current = next
      setPosition(next)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(frame); window.clearTimeout(arrivalTimer) }
  }, [activeRail, desktop, isDragging, mode, mood, settings.speed, target])

  const reactToTouch = useCallback(() => {
    const count = touches + 1
    setTouches(count)
    window.clearTimeout(moodTimer.current)
    window.clearTimeout(touchResetTimer.current)
    if (count >= 5) {
      setMood('shy')
      moodTimer.current = window.setTimeout(() => {
        setTouches(0)
        setMood('walking')
      }, 6000)
      return
    }
    const reaction = count === 1 ? 'happy' : count === 2 ? 'annoyed' : count === 3 ? 'angry' : 'sad'
    setMood(reaction)
    moodTimer.current = window.setTimeout(() => setMood('walking'), 1400)
    touchResetTimer.current = window.setTimeout(() => {
      setTouches(0)
      setMood('walking')
    }, 4500)
  }, [touches])

  const startDrag = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    window.turtleDesktop.setMouseInteractive(true)
    isDraggingRef.current = true
    didDrag.current = false
    dragStartedAt.current = { x: event.clientX, y: event.clientY }
    dragOffset.current = { x: event.clientX - positionRef.current.x, y: event.clientY - positionRef.current.y }
    setIsDragging(true)
    setMood((current) => current === 'shy' ? 'walking' : current)
    setActiveRail(null)
    setMode('bottom')
    modeRef.current = 'bottom'
  }, [])

  useEffect(() => {
    if (!isDragging) return
    const move = (event: MouseEvent) => {
      const raw = { x: event.clientX - dragOffset.current.x, y: event.clientY - dragOffset.current.y }
      const next = clampPoint(raw, desktopRef.current)
      const moved = Math.hypot(event.clientX - dragStartedAt.current.x, event.clientY - dragStartedAt.current.y)
      if (moved > 4) didDrag.current = true

      const dx = next.x - positionRef.current.x
      const dy = next.y - positionRef.current.y
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 1) setView(dx >= 0 ? 'right' : 'left')
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 1) setView(dy >= 0 ? 'front' : 'back')

      positionRef.current = next
      setPosition(next)
      setTarget(next)
    }
    const stop = () => {
      isDraggingRef.current = false
      setIsDragging(false)
      if (!didDrag.current) {
        reactToTouch()
      }
      window.turtleDesktop.setMouseInteractive(false)
      window.setTimeout(() => {
        const environment = desktopRef.current
        if (environment && !isDraggingRef.current && modeRef.current === 'bottom') {
          setTarget(bottomPoint(environment, positionRef.current, positionRef.current.x))
        }
      }, 650)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop, { once: true })
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
    }
  }, [isDragging, reactToTouch])

  const isMoving = !isDragging && mood !== 'shy' && Math.hypot(target.x - position.x, target.y - position.y) > 5

  return (
    <main className="overlay">
      <section
        className="turtle-zone"
        style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
        onMouseEnter={() => window.turtleDesktop.setMouseInteractive(true)}
        onMouseLeave={() => { if (!isDraggingRef.current) window.turtleDesktop.setMouseInteractive(false) }}
      >
        <button className="turtle-button" onMouseDown={startDrag} aria-label={`${settings.name} 쓰다듬기`}>
          <Turtle shellColor={settings.shellColor} skinColor={settings.skinColor} mood={mood} view={view} isMoving={isMoving} />
        </button>
        <button className="settings-button" onClick={() => window.turtleDesktop.openSettings()} aria-label="거북이 설정">⚙</button>
      </section>
    </main>
  )
}
