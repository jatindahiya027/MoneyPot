const { app, BrowserWindow, Menu, nativeTheme, shell, dialog, utilityProcess } = require("electron");
const { createServer } = require("node:net");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

let server;
let desktopOrigin;

app.commandLine.appendSwitch("force-dark-mode");
nativeTheme.themeSource = "dark";

function configureDesktopData() {
  const dataDir = app.getPath("userData");
  fs.mkdirSync(dataDir, { recursive: true });
  process.env.MONEYPOT_DATA_DIR = dataDir;
  process.env.MONEYPOT_ASSET_DIR = app.isPackaged
    ? path.join(app.getAppPath(), ".next", "standalone", "public")
    : path.join(app.getAppPath(), "public");
  process.env.MONEYPOT_DESKTOP = "1";

  const database = path.join(dataDir, "collection.db");
  // The database layer creates and migrates this file when the local server
  // starts. Never seed it from the application bundle: packaged builds must
  // not contain developer or user data.

  if (!process.env.JWT_SECRET_KEY) {
    const secretFile = path.join(dataDir, ".jwt-secret");
    if (!fs.existsSync(secretFile)) {
      fs.writeFileSync(secretFile, crypto.randomBytes(48).toString("hex"), { mode: 0o600 });
    }
    process.env.JWT_SECRET_KEY = fs.readFileSync(secretFile, "utf8").trim();
  }
  return database;
}

async function availablePort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });
  const address = reservation.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  if (!port) throw new Error("Could not reserve a local port for MoneyPot.");
  return port;
}

async function waitForDatabase(origin, child, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (child.killed) throw new Error("MoneyPot's local server stopped during startup.");
    try {
      const response = await fetch(`${origin}/api/health/database`);
      const state = await response.json();
      if (!response.ok || !state.ok) {
        throw new Error(state.error || `Database schema initialization failed (${response.status}).`);
      }
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`MoneyPot's local server did not become ready: ${lastError?.message || "startup timed out"}`);
}

async function startNextServer() {
  const runtimeDir = path.join(app.getAppPath(), ".next", "standalone");
  const entry = path.join(runtimeDir, "server.js");
  if (!fs.existsSync(entry)) throw new Error(`Packaged server runtime is missing: ${entry}`);
  const port = await availablePort();
  // The server is available only on the local loopback interface.
  const origin = `http://localhost:${port}`;
  server = utilityProcess.fork(entry, [], {
    cwd: runtimeDir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
    },
    serviceName: "MoneyPot local server",
    stdio: "pipe",
  });
  server.stdout?.on("data", (data) => process.stdout.write(`[server] ${data}`));
  server.stderr?.on("data", (data) => process.stderr.write(`[server] ${data}`));
  const exited = new Promise((_, reject) => {
    server.once("exit", (code) => reject(new Error(`MoneyPot's local server exited during startup (${code}).`)));
  });
  await Promise.race([waitForDatabase(origin, server), exited]);
  return origin;
}

async function createWindow() {
  if (!desktopOrigin) {
    desktopOrigin = app.isPackaged
      ? await startNextServer()
      : "http://localhost:3031";
  }
  const origin = desktopOrigin;

  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: "#0b0d10",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : process.platform === "win32" ? "hidden" : "default",
    titleBarOverlay: process.platform === "win32" ? { color: "#0b0d10", symbolColor: "#e8f4f5", height: 40 } : undefined,
    trafficLightPosition: process.platform === "darwin" ? { x: 16, y: 16 } : undefined,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());
  const isTrustedOrigin = (value) => {
    try { return new URL(value).origin === new URL(origin).origin; }
    catch { return false; }
  };
  const openExternalHttpUrl = (value) => {
    try {
      const target = new URL(value);
      if (target.protocol === "http:" || target.protocol === "https:") shell.openExternal(target.href);
    } catch {}
  };
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isTrustedOrigin(url)) openExternalHttpUrl(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedOrigin(url)) {
      event.preventDefault();
      openExternalHttpUrl(url);
    }
  });
  await window.loadURL(origin);
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  configureDesktopData();
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  console.error(error);
  const logPath = path.join(app.getPath("userData"), "startup-error.log");
  try { fs.writeFileSync(logPath, `${new Date().toISOString()}\n${error.stack || error}\n`); } catch {}
  dialog.showErrorBox("MoneyPot could not start", `${error.message}\n\nDiagnostic log: ${logPath}`);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => server?.kill());
