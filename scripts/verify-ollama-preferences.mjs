import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openDatabase } from "../src/libs/betterSqlite3.mjs";
import { ensureOllamaPreferenceColumns } from "../src/lib/userPreferencesSchema.mjs";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "moneypot-ollama-prefs-"));
const filename = path.join(directory, "collection.db");

try {
  let db = await openDatabase(filename);
  await db.exec(`
    CREATE TABLE user_preferences (
      userid INTEGER PRIMARY KEY,
      default_bank TEXT DEFAULT '',
      banks TEXT DEFAULT '[]',
      pin_enabled INTEGER NOT NULL DEFAULT 0,
      pin_prompted INTEGER NOT NULL DEFAULT 0,
      pin_hash TEXT NOT NULL DEFAULT '',
      pin_failed_attempts INTEGER NOT NULL DEFAULT 0,
      pin_locked_until INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO user_preferences
      (userid,default_bank,banks,pin_enabled,pin_prompted,pin_hash)
    VALUES(1,'Primary','["Primary"]',1,1,'existing-pin-hash');
  `);

  const migratedColumns = await ensureOllamaPreferenceColumns(db);
  assert.equal(migratedColumns.has("ollama_url"), true);
  assert.equal(migratedColumns.has("ollama_model"), true);
  assert.deepEqual(await db.get(`
    SELECT default_bank,banks,pin_enabled,pin_hash,ollama_url,ollama_model
    FROM user_preferences WHERE userid=1
  `), {
    default_bank: "Primary",
    banks: '["Primary"]',
    pin_enabled: 1,
    pin_hash: "existing-pin-hash",
    ollama_url: "http://127.0.0.1:11434",
    ollama_model: "llama3.2",
  });

  await db.run("UPDATE user_preferences SET ollama_model=? WHERE userid=1", ["qwen2.5:7b"]);
  await ensureOllamaPreferenceColumns(db);
  await db.close();

  db = await openDatabase(filename);
  assert.equal((await db.get("SELECT ollama_model FROM user_preferences WHERE userid=1")).ollama_model, "qwen2.5:7b");
  await db.close();
  console.log("Ollama preferences verified: existing data migration, idempotency, and model persistence.");
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
