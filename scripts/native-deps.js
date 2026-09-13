const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const targets = new Set(["darwin-arm64", "darwin-x64", "win32-arm64", "win32-x64"]);

function parseTarget(value) {
  if (!targets.has(value)) throw new Error(`Unsupported native target "${value || ""}".`);
  const [platform, arch] = value.split("-");
  return { platform, arch, key: value };
}

function binaryInfo(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.subarray(0, 2).toString("ascii") === "MZ") {
    const pe = bytes.readUInt32LE(0x3c);
    const machine = bytes.readUInt16LE(pe + 4);
    if (machine === 0xaa64) return { format: "pe", arch: "arm64" };
    if (machine === 0x8664) return { format: "pe", arch: "x64" };
    return { format: "pe", arch: `unknown-${machine.toString(16)}` };
  }
  if (bytes.length >= 8 && bytes.readUInt32LE(0) === 0xfeedfacf) {
    const cpu = bytes.readUInt32LE(4);
    if (cpu === 0x0100000c) return { format: "macho", arch: "arm64" };
    if (cpu === 0x01000007) return { format: "macho", arch: "x64" };
    return { format: "macho", arch: `unknown-${cpu.toString(16)}` };
  }
  if (bytes.length >= 20 && bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
    const machine = bytes.readUInt16LE(18);
    if (machine === 0xb7) return { format: "elf", arch: "arm64" };
    if (machine === 0x3e) return { format: "elf", arch: "x64" };
  }
  return { format: "unknown", arch: "unknown" };
}

function assertNativeTarget(file, expected) {
  if (!fs.existsSync(file)) throw new Error(`Missing native module: ${file}`);
  const [platform, arch] = expected.split("-");
  const actual = binaryInfo(file);
  const format = platform === "win32" ? "pe" : platform === "darwin" ? "macho" : "elf";
  if (actual.format !== format || actual.arch !== arch) {
    throw new Error(`Wrong native module: expected ${format}-${arch}, found ${actual.format}-${actual.arch} at ${file}`);
  }
}

module.exports = { assertNativeTarget, binaryInfo, parseTarget, projectRoot };
