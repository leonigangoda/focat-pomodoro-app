const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('focat', {
  onShow: (callback) => {
    ipcRenderer.on('notif:show', (_event, data) => callback(data))
  },
  clicked: () => ipcRenderer.send('notif:clicked'),
  dismissed: () => ipcRenderer.send('notif:dismissed'),
})
