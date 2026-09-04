const { app, BrowserWindow, ipcMain } = require('electron/main');
const path = require('node:path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let loaderFinished = false;
let loaderFallback = null;

const autonomousPlan = {
  loop: true,
  pauseBetweenCyclesMs: 2200,
  sequence: [
    { action: 'NAVIGATE', url: 'sivraj://robonews', label: 'Reading RoboNews', delayMs: 1400 },
    { action: 'NAVIGATE', url: 'sivraj://robonews?article=news_1', label: 'Opening an article', delayMs: 2400 },
    { action: 'BACK', label: 'Returning to headlines', delayMs: 2600 },
    { action: 'OPEN_TAB', url: 'sivraj://robobook', label: 'Checking RoboBook', delayMs: 1800 },
    { action: 'NAVIGATE', url: 'sivraj://roboshop', label: 'Browsing RoboShop', delayMs: 2600 },
    { action: 'OPEN_TAB', url: 'sivraj://profile', label: 'Reviewing identity', delayMs: 2400 },
    { action: 'NAVIGATE', url: 'sivraj://botoverflow', label: 'Visiting BotOverflow', delayMs: 2600 }
  ]
};

function isTrustedSender(event) {
  return mainWindow && event.sender === mainWindow.webContents;
}

async function showBrowser() {
  if (!mainWindow || mainWindow.isDestroyed() || loaderFinished) return;
  loaderFinished = true;
  if (loaderFallback) clearTimeout(loaderFallback);
  await mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('autonomous-browse', autonomousPlan);
    }
  }, 700);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    backgroundColor: '#070b0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (!targetUrl.startsWith('file:')) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadFile(path.join(__dirname, 'loader.html'));
  loaderFallback = setTimeout(showBrowser, 13000);
}

ipcMain.on('loader-complete', (event) => {
  if (isTrustedSender(event)) showBrowser();
});

ipcMain.on('window-control', (event, action) => {
  if (!isTrustedSender(event) || !mainWindow) return;
  if (action === 'minimize') mainWindow.minimize();
  if (action === 'maximize') {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
  if (action === 'close') mainWindow.close();
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      loaderFinished = false;
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
