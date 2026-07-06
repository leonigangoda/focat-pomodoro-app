const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  minimize:      ()      => ipcRenderer.send('win:minimize'),
  close:         ()      => ipcRenderer.send('win:close'),
  saveApiKey:    (key)   => ipcRenderer.invoke('apikey:save', key),
  hasApiKey:     ()      => ipcRenderer.invoke('apikey:exists'),
  saveName:      (name)  => ipcRenderer.invoke('name:save', name),
  loadName:      ()      => ipcRenderer.invoke('name:load'),
  loadTasks:     ()      => ipcRenderer.invoke('tasks:load'),
  saveTasks:     (data)  => ipcRenderer.invoke('tasks:save', data),
  loadEvents:    ()      => ipcRenderer.invoke('events:load'),
  saveEvents:    (data)  => ipcRenderer.invoke('events:save', data),
  loadSettings:  ()      => ipcRenderer.invoke('settings:load'),
  saveSettings:  (s)     => ipcRenderer.invoke('settings:save', s),
  decomposeTask: (task, deadline)  => ipcRenderer.invoke('ai:decompose', { task, deadline }),
  notifyDone:    (title) => ipcRenderer.invoke('notify:done', { title }),
})
