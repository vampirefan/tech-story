/**
 * Electron 主进程。
 * 课堂交付形态：双击即开的桌面应用（file:// + hash router）。
 *
 * 额外支持无头截图自检（R3-R7 视觉验证用）：
 *   electron . --shot=out.png --shot-url=http://localhost:5199/#/globe --shot-sel=".globe-loading.is-done" --shot-wait=2500
 */
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const DEV_URL = process.env.VITE_DEV_SERVER_URL || ''
const arg = (name) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

const shotFile = arg('shot')
const shotUrl = arg('shot-url')
const shotSel = arg('shot-sel') || ''
const shotWait = +(arg('shot-wait') || 2200)
const shotEval = arg('shot-eval')

let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1100,
    minHeight: 640,
    show: false,
    backgroundColor: '#03060f',
    title: '人类科技文明演进',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  })

  win.once('ready-to-show', () => win.show())
  if (shotFile) win.setSize(1600, 900)

  // 课堂投影常用：F11 全屏
  win.webContents.on('before-input-event', (e, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      win.setFullScreen(!win.isFullScreen())
    }
    if (input.key === 'F12' && input.type === 'keyDown' && (DEV_URL || process.env.TS_DEVTOOLS === '1')) {
      win.webContents.toggleDevTools()
    }
  })

  // 外链一律交给系统浏览器，避免课堂里跳出去回不来
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (DEV_URL || shotUrl) win.loadURL(shotUrl || DEV_URL)
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

async function runShot() {
  const wc = win.webContents
  await new Promise(res => (wc.isLoading() ? wc.once('did-finish-load', res) : res()))
  const deadline = Date.now() + 90000
  const expr = shotSel
    ? `!!document.querySelector(${JSON.stringify(shotSel)})`
    : `document.readyState === 'complete'`
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let ok = false
    try { ok = await wc.executeJavaScript(expr) } catch { ok = false }
    if (ok || Date.now() > deadline) break
    await new Promise(r => setTimeout(r, 350))
  }
  await new Promise(r => setTimeout(r, shotWait))
  if (shotEval) {
    try { console.log('[eval]', JSON.stringify(await wc.executeJavaScript(shotEval))) }
    catch (e) { console.log('[eval] error', String(e)) }
  }
  const img = await wc.capturePage()
  fs.writeFileSync(shotFile, img.toPNG())
  console.log('[shot]', shotFile, img.getSize().width + 'x' + img.getSize().height)
  app.quit()
}

if (!app.requestSingleInstanceLock() && !shotFile) {
  app.quit()
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    ipcMain.handle('ts:fullscreen', () => { win.setFullScreen(!win.isFullScreen()); return win.isFullScreen() })
    ipcMain.handle('ts:platform', () => ({ platform: process.platform, version: app.getVersion() }))
    createWindow()
    if (shotFile) win.once('ready-to-show', () => { void runShot() })
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
