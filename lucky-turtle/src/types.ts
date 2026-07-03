export type TurtleSettings = {
  name: string
  shellColor: string
  skinColor: string
  speed: 'slow' | 'normal' | 'lively'
  launchOnStartup: boolean
  detectScreenLines: boolean
  hasCompletedOnboarding: boolean
}

export type Rectangle = { x: number; y: number; width: number; height: number }

export type DesktopEnvironment = {
  origin: { x: number; y: number }
  displays: Array<{
    id: number
    bounds: Rectangle
    workArea: Rectangle
    scaleFactor: number
  }>
}

export type VerticalRail = {
  displayId: number
  x: number
  top: number
  bottom: number
  strength: number
}

declare global {
  interface Window {
    turtleDesktop: {
      getSettings(): Promise<TurtleSettings>
      saveSettings(settings: TurtleSettings): Promise<void>
      getDesktop(): Promise<DesktopEnvironment>
      scanVerticalLines(): Promise<VerticalRail[]>
      setMouseInteractive(interactive: boolean): void
      openSettings(): void
      quit(): void
      onSettingsChanged(callback: (settings: TurtleSettings) => void): () => void
      onDesktopChanged(callback: (desktop: DesktopEnvironment) => void): () => void
    }
  }
}
