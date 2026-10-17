const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('techstory', {
  platform: () => ipcRenderer.invoke('ts:platform'),
  toggleFullscreen: () => ipcRenderer.invoke('ts:fullscreen')
})
