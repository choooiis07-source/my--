import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('turtleDesktop', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
  getDesktop: () => ipcRenderer.invoke('desktop:get'),
  scanVerticalLines: () => ipcRenderer.invoke('desktop:scan-vertical-lines'),
  setMouseInteractive: (interactive: boolean) => ipcRenderer.send('overlay:mouse', interactive),
  openSettings: () => ipcRenderer.send('settings:open'),
  quit: () => ipcRenderer.send('app:quit'),
  onSettingsChanged: (callback: (settings: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown) => callback(settings)
    ipcRenderer.on('settings:changed', handler)
    return () => ipcRenderer.removeListener('settings:changed', handler)
  },
  onDesktopChanged: (callback: (desktop: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, desktop: unknown) => callback(desktop)
    ipcRenderer.on('desktop:changed', handler)
    return () => ipcRenderer.removeListener('desktop:changed', handler)
  },
})
