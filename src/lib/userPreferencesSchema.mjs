export async function ensureOllamaPreferenceColumns(db) {
  let columns = await db.all("PRAGMA table_info(user_preferences)");
  let names = new Set(columns.map(column => column.name));
  if (!names.has("ollama_url")) {
    await db.run("ALTER TABLE user_preferences ADD COLUMN ollama_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434'");
  }
  if (!names.has("ollama_model")) {
    await db.run("ALTER TABLE user_preferences ADD COLUMN ollama_model TEXT NOT NULL DEFAULT 'llama3.2'");
  }
  columns = await db.all("PRAGMA table_info(user_preferences)");
  names = new Set(columns.map(column => column.name));
  return names;
}
