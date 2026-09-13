const fs = require("node:fs");
const path = require("node:path");
const { auditPackagedApp } = require("./verify-package-size");

const root = path.resolve(__dirname, "..");
const arch = process.argv[2];
if (!new Set(["arm64", "x64"]).has(arch)) throw new Error("Usage: node verify-macos-package.js <arm64|x64>");

const output = arch === "arm64" ? "mac-arm64" : "mac";
const app = path.join(root, "dist-electron", output, "MoneyPot.app");
if (!fs.existsSync(app)) throw new Error(`Packaged macOS application is missing: ${app}`);

const appRoot = path.join(app, "Contents", "Resources", "app");
const main = path.join(appRoot, "electron", "main.js");
if (!fs.existsSync(main)) throw new Error("Packaged MoneyPot is missing its Electron entry point.");

const result = auditPackagedApp(appRoot);
console.log(`macOS package audit passed: ${arch}, ${result.sizeMiB} MiB app payload, PIN runtime present.`);
