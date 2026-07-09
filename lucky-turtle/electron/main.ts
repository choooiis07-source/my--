import { app, BrowserWindow, desktopCapturer, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = fileURLToPath(new URL('.', import.meta.url))
const isDev = process.argv.includes('--dev')

type TurtleSettings = {
  name: string
  shellColor: string
  skinColor: string
  speed: 'slow' | 'normal' | 'lively'
  launchOnStartup: boolean
  detectScreenLines: boolean
  hasCompletedOnboarding: boolean
}

const defaults: TurtleSettings = {
  name: '토리',
  shellColor: '#74b66a',
  skinColor: '#b8df8b',
  speed: 'normal',
  launchOnStartup: false,
  detectScreenLines: false,
  hasCompletedOnboarding: false,
}

let overlayWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let tray: Tray | null = null
let overlayKeepAliveTimer: ReturnType<typeof setInterval> | null = null

if (!app.requestSingleInstanceLock()) app.quit()

function settingsPath() {
  return join(app.getPath('userData'), 'settings.json')
}

function readSettings(): TurtleSettings {
  try {
    if (existsSync(settingsPath())) {
      return { ...defaults, ...JSON.parse(readFileSync(settingsPath(), 'utf8')) }
    }
  } catch {
    // A malformed settings file should never stop the turtle from appearing.
  }
  return defaults
}

function saveSettings(value: TurtleSettings) {
  const saved = { ...value, hasCompletedOnboarding: true }
  writeFileSync(settingsPath(), JSON.stringify(saved, null, 2), 'utf8')
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: saved.launchOnStartup })
  overlayWindow?.webContents.send('settings:changed', saved)
}

function virtualDesktopBounds() {
  const displays = screen.getAllDisplays()
  const left = Math.min(...displays.map((display) => display.bounds.x))
  const top = Math.min(...displays.map((display) => display.bounds.y))
  const right = Math.max(...displays.map((display) => display.bounds.x + display.bounds.width))
  const bottom = Math.max(...displays.map((display) => display.bounds.y + display.bounds.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function desktopEnvironment() {
  const desktop = virtualDesktopBounds()
  return {
    origin: { x: desktop.x, y: desktop.y },
    displays: screen.getAllDisplays().map((display) => ({
      id: display.id,
      bounds: display.bounds,
      workArea: display.workArea,
      scaleFactor: display.scaleFactor,
    })),
  }
}

type VerticalRail = { displayId: number; x: number; top: number; bottom: number; strength: number }
type RailSegment = { top: number; bottom: number; hits: number; bottomHits: number; difference: number }

function detectVerticalRails(
  bitmap: Buffer,
  width: number,
  height: number,
  displayId: number,
  displayBounds: Electron.Rectangle,
  displayWorkArea: Electron.Rectangle,
): VerticalRail[] {
  const candidates: Array<{ x: number; top: number; bottom: number; score: number }> = []
  const sampleStep = 3
  const workTop = Math.max(0, Math.floor(((displayWorkArea.y - displayBounds.y) / displayBounds.height) * height))
  const workBottom = Math.min(height - 1, Math.ceil(((displayWorkArea.y + displayWorkArea.height - displayBounds.y) / displayBounds.height) * height))
  const workHeight = Math.max(1, workBottom - workTop)
  const startY = workTop + Math.floor(workHeight * 0.06)
  const bottomStart = workTop + Math.floor(workHeight * 0.7)
  const samples = Math.max(1, Math.floor((height - startY) / sampleStep))
  const bottomSamples = Math.max(1, Math.floor((workBottom - bottomStart) / sampleStep))
  const minSegmentHeight = workHeight * 0.38
  const requiredBottom = workBottom - workHeight * 0.16

  const luminance = (x: number, y: number) => {
    const offset = (y * width + x) * 4
    return bitmap[offset] * 0.114 + bitmap[offset + 1] * 0.587 + bitmap[offset + 2] * 0.299
  }

  for (let x = 2; x < width - 2; x += 2) {
    let currentStart = 0
    let currentEnd = 0
    let currentHits = 0
    let currentBottomHits = 0
    let currentDifference = 0
    let currentGap = 0
    const segments: RailSegment[] = []

    const finishSegment = () => {
      if (currentHits === 0) return null
      const segmentHeight = currentEnd - currentStart
      const segmentSamples = Math.max(1, Math.floor(segmentHeight / sampleStep))
      const density = currentHits / segmentSamples
      const bottomDensity = currentBottomHits / bottomSamples
      const averageDifference = currentDifference / Math.max(1, currentHits)
      const reachesWalkingLine = currentEnd >= requiredBottom
      if (
        segmentHeight >= minSegmentHeight &&
        density >= 0.5 &&
        bottomDensity >= 0.32 &&
        averageDifference >= 30 &&
        reachesWalkingLine
      ) {
        return {
          top: currentStart,
          bottom: currentEnd,
          hits: currentHits,
          bottomHits: currentBottomHits,
          difference: currentDifference,
        }
      }
      return null
    }

    for (let y = startY; y <= workBottom; y += sampleStep) {
      const difference = Math.max(
        Math.abs(luminance(x, y) - luminance(x - 1, y)),
        Math.abs(luminance(x + 1, y) - luminance(x, y)),
      )
      if (difference > 30) {
        if (currentHits === 0) currentStart = y
        currentEnd = y
        currentHits += 1
        currentDifference += difference
        currentGap = 0
        if (y >= bottomStart) currentBottomHits += 1
      } else if (currentHits > 0) {
        currentGap += 1
        if (currentGap > 2) {
          const segment = finishSegment()
          if (segment) segments.push(segment)
          currentStart = 0
          currentEnd = 0
          currentHits = 0
          currentBottomHits = 0
          currentDifference = 0
          currentGap = 0
        }
      }
    }
    const finalSegment = finishSegment()
    if (finalSegment) segments.push(finalSegment)
    const bestSegment = segments.sort((a, b) => b.hits - a.hits)[0]
    if (bestSegment) {
      const segmentHeight = bestSegment.bottom - bestSegment.top
      const continuity = bestSegment.hits / samples
      const reachesBottom = bestSegment.bottomHits / bottomSamples
      const heightScore = Math.min(1, segmentHeight / Math.max(1, workHeight))
      candidates.push({ x, top: bestSegment.top, bottom: bestSegment.bottom, score: continuity * 0.45 + reachesBottom * 0.25 + heightScore * 0.3 })
    }
  }

  const grouped: Array<{ x: number; top: number; bottom: number; score: number }> = []
  for (const candidate of candidates) {
    const last = grouped.at(-1)
    if (last && candidate.x - last.x <= 5) {
      if (candidate.score > last.score) Object.assign(last, candidate)
    } else {
      grouped.push({ ...candidate })
    }
  }

  return grouped
    .sort((a, b) => b.score - a.score)
    .filter((candidate, index, all) => all.slice(0, index).every((other) => Math.abs(other.x - candidate.x) > width * 0.055))
    .slice(0, 7)
    .map((candidate) => ({
      displayId,
      x: displayBounds.x + (candidate.x / width) * displayBounds.width,
      top: displayBounds.y + (candidate.top / height) * displayBounds.height,
      bottom: displayBounds.y + (candidate.bottom / height) * displayBounds.height,
      strength: candidate.score,
    }))
}

async function scanVerticalRails(): Promise<VerticalRail[]> {
  const displays = screen.getAllDisplays()
  const largest = displays.reduce((result, display) => ({
    width: Math.max(result.width, Math.ceil(display.bounds.width / 4)),
    height: Math.max(result.height, Math.ceil(display.bounds.height / 4)),
  }), { width: 320, height: 180 })
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: largest })
  return sources.flatMap((source) => {
    const display = displays.find((item) => String(item.id) === source.display_id)
    if (!display || source.thumbnail.isEmpty()) return []
    const size = source.thumbnail.getSize()
    return detectVerticalRails(source.thumbnail.toBitmap(), size.width, size.height, display.id, display.bounds, display.workArea)
  })
}

async function load(window: BrowserWindow, mode: 'overlay' | 'settings') {
  if (isDev) {
    await window.loadURL(`http://localhost:43127/?mode=${mode}`)
    return
  }
  await window.loadFile(join(dirname, '../dist/index.html'), { query: { mode } })
}

function keepOverlayOnTop() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setSkipTaskbar(true)
  if (!overlayWindow.isVisible()) overlayWindow.showInactive()
  overlayWindow.moveTop()
}

function createOverlay() {
  const bounds = virtualDesktopBounds()
  overlayWindow = new BrowserWindow({
    ...bounds,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  overlayWindow.on('show', keepOverlayOnTop)
  overlayWindow.on('restore', keepOverlayOnTop)
  overlayWindow.on('blur', keepOverlayOnTop)
  void load(overlayWindow, 'overlay')
  if (overlayKeepAliveTimer) clearInterval(overlayKeepAliveTimer)
  overlayKeepAliveTimer = setInterval(keepOverlayOnTop, 2500)
  keepOverlayOnTop()
  overlayWindow.on('closed', () => {
    if (overlayKeepAliveTimer) clearInterval(overlayKeepAliveTimer)
    overlayKeepAliveTimer = null
    overlayWindow = null
  })
}

function createSettings() {
  if (settingsWindow) {
    settingsWindow.show()
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 420,
    height: 650,
    minWidth: 380,
    minHeight: 560,
    title: '행운의 거북이 설정',
    backgroundColor: '#f8f5e8',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  void load(settingsWindow, 'settings')
  settingsWindow.on('closed', () => { settingsWindow = null })
}

function createTray() {
  const iconPath = isDev
    ? join(process.cwd(), 'public', 'assets', 'turtle-3d-front.png')
    : join(process.resourcesPath, 'tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32 })
  tray = new Tray(icon)
  tray.setToolTip('행운의 거북이')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '환경설정 열기', click: () => createSettings() },
    { type: 'separator' },
    { label: '거북이 쉬게 하기', click: () => app.quit() },
  ]))
  tray.on('double-click', () => createSettings())
}

function syncDesktop() {
  if (!overlayWindow) return
  overlayWindow.setBounds(virtualDesktopBounds())
  keepOverlayOnTop()
  overlayWindow.webContents.send('desktop:changed', desktopEnvironment())
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.luckyturtle.desktop')
  ipcMain.handle('settings:get', () => readSettings())
  ipcMain.handle('settings:save', (_event, value: TurtleSettings) => saveSettings(value))
  ipcMain.handle('desktop:get', () => desktopEnvironment())
  ipcMain.handle('desktop:scan-vertical-lines', () => readSettings().detectScreenLines ? scanVerticalRails() : [])
  ipcMain.on('overlay:mouse', (_event, interactive: boolean) => {
    overlayWindow?.setIgnoreMouseEvents(!interactive, interactive ? undefined : { forward: true })
  })
  ipcMain.on('settings:open', () => createSettings())
  ipcMain.on('app:quit', () => app.quit())

  createOverlay()
  createTray()
  if (!readSettings().hasCompletedOnboarding) createSettings()
  screen.on('display-added', syncDesktop)
  screen.on('display-removed', syncDesktop)
  screen.on('display-metrics-changed', syncDesktop)
})

app.on('second-instance', () => createSettings())

// Keep the background companion alive even when its settings window closes.
app.on('window-all-closed', () => {})
