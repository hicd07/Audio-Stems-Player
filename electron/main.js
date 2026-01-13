const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple compatibility with existing logic
      webSecurity: false // Allow loading local resources if needed
    },
    title: "Simple Clip Launcher",
    backgroundColor: '#030712'
  });

  // In production, load the built file. In dev, you might want to load localhost.
  // Here we assume build.
  win.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // Remove menu for app-like feel
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});