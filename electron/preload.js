const { contextBridge } = require("electron");

const platformClass = {
  darwin: "electron-macos",
  win32: "electron-windows",
  linux: "electron-linux",
}[process.platform];

contextBridge.exposeInMainWorld("moneyPotDesktop", {
  platform: process.platform,
});

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("electron-shell");
  if (platformClass) document.documentElement.classList.add(platformClass);
});
