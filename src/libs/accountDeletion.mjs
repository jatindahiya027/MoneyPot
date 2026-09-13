async function deleteIfTableExists(db, table, userid) {
  const exists = await db.get(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
    [table]
  );
  if (exists) await db.run(`DELETE FROM ${table} WHERE userid=?`, [userid]);
}

export async function deleteUserData(db, userid) {
  await db.exec("BEGIN IMMEDIATE");
  try {
    await db.run(`
      DELETE FROM transactions
      WHERE transid IN (SELECT transid FROM users_transcation_link WHERE userid=?)
        AND NOT EXISTS (
          SELECT 1 FROM users_transcation_link other
          WHERE other.transid=transactions.transid AND other.userid<>?
        )
    `, [userid, userid]);
    await db.run("DELETE FROM users_transcation_link WHERE userid=?", [userid]);
    await db.run("DELETE FROM users_category_link WHERE userid=?", [userid]);
    for (const table of ["budget", "savings_goals", "reset_tokens", "user_preferences", "recurring"]) {
      await deleteIfTableExists(db, table, userid);
    }
    await db.run("DELETE FROM users WHERE userid=?", [userid]);
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
