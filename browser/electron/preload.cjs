const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  loaderComplete: () => ipcRenderer.send('loader-complete'),
  windowControl: (action) => {
    if (['minimize', 'maximize', 'close'].includes(action)) {
      ipcRenderer.send('window-control', action);
    }
  },
  onAutonomousBrowse: (callback) => {
    ipcRenderer.on('autonomous-browse', (_event, plan) => callback(plan));
  }
});
