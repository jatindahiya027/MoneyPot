import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

async function importSource(relativePath) {
  const source = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

async function missing(relativePath) {
  try { await access(new URL(`../${relativePath}`, import.meta.url)); return false; }
  catch { return true; }
}

const validation = await importSource("src/libs/transactionValidation.js");
assert.equal(validation.parseTransactionDate("2024-02-29"), "2024-02-29");
assert.equal(validation.parseTransactionDate("2025-02-29"), null);
assert.equal(validation.parseTransactionDate("31/04/2026"), null);
assert.equal(validation.parseTransactionDate("2026-99-99"), null);
assert.equal(validation.normalizeTransactionAmount("Investment", "Investment redemption", 250), -250);
assert.equal(validation.normalizeTransactionAmount("Debit", "Food", -1), null);

const ollama = await importSource("src/libs/ollama.js");
const request = value => ({ headers: { get: name => name === "X-Ollama-Url" ? value : null } });
assert.equal(ollama.getOllamaOrigin(request("http://127.0.0.1:11434")), "http://127.0.0.1:11434");
assert.throws(() => ollama.getOllamaOrigin(request("http://169.254.169.254")), /not allowed/);
assert.throws(() => ollama.getOllamaOrigin(request("http://localhost:11434/api/tags")), /origin/);

assert.equal(await missing("Dockerfile"), true);
assert.equal(await missing("docker-compose.yml"), true);
assert.equal(await missing("src/app/api/recurring/route.js"), true);
assert.equal(await missing("src/app/protected/recurring.js"), true);
assert.equal(await missing("src/app/api/ai-debug/route.js"), true);

const clientToken = await readFile(new URL("../src/libs/clientToken.js", import.meta.url), "utf8");
assert.doesNotMatch(clientToken, /localStorage\.setItem\s*\(\s*KEY/);
const session = await readFile(new URL("../src/libs/session.js", import.meta.url), "utf8");
assert.doesNotMatch(session, /success:\s*true,\s*token/);
const upload = await readFile(new URL("../src/app/api/upload/route.js", import.meta.url), "utf8");
assert.match(upload, /authenticateRequest/);
assert.match(upload, /MAX_FILE_BYTES/);
const exportRoute = await readFile(new URL("../src/app/api/export/route.js", import.meta.url), "utf8");
assert.match(exportRoute, /spreadsheetSafe/);
const electron = await readFile(new URL("../electron/main.js", import.meta.url), "utf8");
assert.match(electron, /new URL\(value\)\.origin === new URL\(origin\)\.origin/);

const login = await readFile(new URL("../src/app/api/login/route.js", import.meta.url), "utf8");
assert.match(login, /const DUMMY_HASH = "\$2a\$12\$/);
assert.match(login, /lower\(mail\)=\?/);
const profiles = await readFile(new URL("../src/app/api/pin/profiles/route.js", import.meta.url), "utf8");
assert.match(profiles, /mail_hint: maskEmail/);
assert.doesNotMatch(profiles, /profiles\.map\(profile => \(\{ \.\.\.profile/);
const preferences = await readFile(new URL("../src/app/api/preferences/route.js", import.meta.url), "utf8");
assert.doesNotMatch(preferences, /findOllamaModels/);
const categoryTotals = await readFile(new URL("../src/app/api/cattotal/route.js", import.meta.url), "utf8");
assert.doesNotMatch(categoryTotals, /JOIN categories c ON c\.name = t\.category/);
const transfers = await readFile(new URL("../src/app/protected/transfers.js", import.meta.url), "utf8");
assert.match(transfers, /failed and remain editable/);
const standalone = await readFile(new URL("../scripts/test-standalone.js", import.meta.url), "utf8");
assert.ok(standalone.indexOf("try {") < standalone.indexOf("prepare-native-deps.js"));
for (const route of ["budget", "goals", "banktrend", "creditdebit", "transtable"]) {
  const source = await readFile(new URL(`../src/app/api/${route}/route.js`, import.meta.url), "utf8");
  assert.doesNotMatch(source, /const UNAUTH/);
}

console.log("Security boundaries and transaction validation verified.");
