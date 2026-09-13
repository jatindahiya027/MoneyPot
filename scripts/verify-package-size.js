const fs = require("node:fs");
const path = require("node:path");

const MAX_APP_PAYLOAD_BYTES = 180 * 1024 * 1024;

function directorySize(root) {
  let bytes = 0;
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (entry.isFile()) bytes += fs.statSync(full).size;
    }
  }
  return bytes;
}

function hasFiles(root) {
  if (!fs.existsSync(root)) return false;
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isFile()) return true;
      if (entry.isDirectory()) pending.push(path.join(current, entry.name));
    }
  }
  return false;
}

function treeContains(root, text) {
  if (!fs.existsSync(root)) return false;
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (entry.isFile() && entry.name.endsWith(".js") && fs.readFileSync(full, "utf8").includes(text)) return true;
    }
  }
  return false;
}

function auditPackagedApp(appRoot) {
  const required = [
    path.join(appRoot, "electron", "main.js"),
    path.join(appRoot, ".next", "standalone", "server.js"),
    path.join(appRoot, ".next", "standalone", ".next", "static"),
    path.join(appRoot, ".next", "standalone", "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node"),
  ];
  for (const file of required) {
    if (!fs.existsSync(file)) throw new Error(`Optimized package is missing required runtime content: ${file}`);
  }

  const nextRuntime = path.join(appRoot, ".next", "standalone", ".next");
  if (!treeContains(path.join(nextRuntime, "server", "app", "api"), "pin_failed_attempts")) {
    throw new Error("Packaged app is missing the PIN authentication API runtime.");
  }
  if (!treeContains(path.join(nextRuntime, "static", "chunks", "app"), "Quick unlock")) {
    throw new Error("Packaged app is missing the quick-unlock PIN UI.");
  }

  const forbidden = [
    path.join(appRoot, "node_modules"),
    path.join(appRoot, ".next", "cache"),
    path.join(appRoot, ".next", "standalone", ".next", "cache"),
  ];
  for (const file of forbidden) {
    if (fs.existsSync(file)) throw new Error(`Optimized package contains forbidden build content: ${file}`);
  }

  const uploads = path.join(appRoot, ".next", "standalone", "public", "uploads");
  if (hasFiles(uploads)) throw new Error(`Packaged builds must not contain development uploads: ${uploads}`);

  const bytes = directorySize(appRoot);
  if (bytes > MAX_APP_PAYLOAD_BYTES) {
    throw new Error(`Packaged app payload is ${(bytes / 1024 / 1024).toFixed(1)} MiB; maximum is ${MAX_APP_PAYLOAD_BYTES / 1024 / 1024} MiB.`);
  }
  return { bytes, sizeMiB: (bytes / 1024 / 1024).toFixed(1) };
}

if (require.main === module) {
  const appRoot = process.argv[2];
  if (!appRoot) throw new Error("Usage: node scripts/verify-package-size.js <path-to-packaged-resources/app>");
  const result = auditPackagedApp(path.resolve(appRoot));
  console.log(`Optimized package audit passed: ${result.sizeMiB} MiB app payload.`);
}

module.exports = { MAX_APP_PAYLOAD_BYTES, auditPackagedApp, directorySize };
