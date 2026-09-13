import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import nativeDeps from "./native-deps.js";

const arch = process.argv[2];
const directoryOnly = process.argv.includes("--dir");
const expected = `win32-${arch}`;
const root = path.resolve(`dist-electron/win-${arch === "x64" ? "" : `${arch}-`}unpacked`);

async function findNativeModules(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await findNativeModules(target));
    else if (entry.name.endsWith(".node")) found.push(target);
  }
  return found;
}

const modules = await findNativeModules(root);
for (const file of modules) {
  nativeDeps.assertNativeTarget(file, expected);
}
const executable = await readFile(path.join(root, "MoneyPot.exe"));
if (executable.subarray(0, 2).toString("ascii") !== "MZ") throw new Error("Packaged MoneyPot executable is not a Windows PE binary.");
const databases = [];
async function findDatabases(directory) {
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await findDatabases(target);
    else if (/\.db(?:-(?:shm|wal))?$/.test(entry.name)) databases.push(target);
  }
}
await findDatabases(path.join(root, "resources", "app"));
if (databases.length) throw new Error(`Windows package contains private database files: ${databases.join(", ")}`);

if (!directoryOnly) {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  if (packageJson.build?.nsis?.useZip && packageJson.build?.nsis?.differentialPackage !== false) {
    throw new Error("NSIS useZip requires differentialPackage=false; otherwise Electron Builder embeds a 7z payload with a .zip name.");
  }
  const installer = path.resolve(`dist-electron/MoneyPot-${packageJson.version}-Windows-${arch}.exe`);
  const installerBytes = await readFile(installer);
  if (installerBytes.subarray(0, 2).toString("ascii") !== "MZ") throw new Error("Generated Windows installer is not a PE executable.");
  if ((await stat(installer)).size < 1_000_000) throw new Error("Generated Windows installer is unexpectedly small.");
}

console.log(`Windows ${arch} package verified: ${directoryOnly ? "app" : "installer and app"} executable ${directoryOnly ? "is" : "are"} PE/COFF, ${modules.length} native module(s) are compatible, and no database is bundled.`);
