import Database from "better-sqlite3";

function invoke(statement, method, params) {
  if (Array.isArray(params)) return statement[method](...params);
  if (params == null) return statement[method]();
  return statement[method](params);
}

// Routes keep their async contract while SQL is executed by one synchronous
// better-sqlite3 connection. This isolates the engine from application logic.
export async function openDatabase(filename) {
  const connection = new Database(filename);
  return {
    async run(sql, params = []) {
      const result = invoke(connection.prepare(sql), "run", params);
      return { lastID: Number(result.lastInsertRowid), changes: result.changes };
    },
    async get(sql, params = []) {
      return invoke(connection.prepare(sql), "get", params);
    },
    async all(sql, params = []) {
      return invoke(connection.prepare(sql), "all", params);
    },
    async exec(sql) {
      connection.exec(sql);
    },
    async close() {
      if (connection.open) connection.close();
    },
  };
}
