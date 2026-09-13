const FALLBACKS = {
  Debit: "Miscellaneous",
  Credit: "Miscellaneous",
  Investment: "Miscellaneous",
};

const FALLBACK_COLORS = {
  Debit: "#FF338C",
  Credit: "#33A1FF",
  Investment: "#A133FF",
};

export function fallbackCategory(type) {
  return FALLBACKS[type] || "Miscellaneous";
}

export async function ensureUserCategory(db, userid, type, rawName) {
  const name = String(rawName || "").trim() || fallbackCategory(type);
  let category = await db.get(`
    SELECT c.categoryid
    FROM categories c
    JOIN users_category_link l ON l.categorykid=c.categoryid
    WHERE l.userid=? AND c.type=? AND lower(c.name)=lower(?)
    ORDER BY c.categoryid LIMIT 1
  `, [userid, type, name]);
  if (category) return { categoryid: category.categoryid, name };

  category = await db.get(
    "SELECT categoryid FROM categories WHERE type=? AND lower(name)=lower(?) ORDER BY categoryid LIMIT 1",
    [type, name]
  );
  if (!category) {
    const result = await db.run(
      "INSERT INTO categories(type,imgpath,name,fill) VALUES(?,?,?,?)",
      [type, "lucide:CircleEllipsis", name, FALLBACK_COLORS[type] || "#888888"]
    );
    category = { categoryid: result.lastID };
  }
  await db.run(
    "INSERT OR IGNORE INTO users_category_link(userid,categorykid) VALUES(?,?)",
    [userid, category.categoryid]
  );
  return { categoryid: category.categoryid, name };
}

export async function repairTransactionCategoryLinks(db) {
  const rows = await db.all(`
    SELECT l.userid,t.transid,t.type,t.category,t.description,t.date,t.amount,t.bank_name,
      (SELECT COUNT(*) FROM users_transcation_link other WHERE other.transid=t.transid) AS link_count
    FROM users_transcation_link l
    JOIN transactions t ON t.transid=l.transid
    ORDER BY l.userid,t.transid
  `);
  let repaired = 0;
  await db.exec("BEGIN IMMEDIATE");
  try {
    for (const row of rows) {
      const category = String(row.category || "").trim() || fallbackCategory(row.type);
      if (category !== row.category) {
        if (Number(row.link_count) > 1) {
          const result = await db.run(
            `INSERT INTO transactions(type,category,description,date,amount,bank_name)
             VALUES(?,?,?,?,?,?)`,
            [row.type, category, row.description, row.date, row.amount, row.bank_name]
          );
          await db.run(
            "UPDATE users_transcation_link SET transid=? WHERE userid=? AND transid=?",
            [result.lastID, row.userid, row.transid]
          );
        } else {
          await db.run("UPDATE transactions SET category=? WHERE transid=?", [category, row.transid]);
        }
        repaired += 1;
      }

      if (category.toLowerCase() === "opening balance") continue;

      const existing = await db.get(`
        SELECT 1 FROM categories c
        JOIN users_category_link l ON l.categorykid=c.categoryid
        WHERE l.userid=? AND c.type=? AND lower(c.name)=lower(?) LIMIT 1
      `, [row.userid, row.type, category]);
      if (!existing) {
        await ensureUserCategory(db, row.userid, row.type, category);
        repaired += 1;
      }
    }
    await db.run(`
      DELETE FROM transactions
      WHERE NOT EXISTS (
        SELECT 1 FROM users_transcation_link l WHERE l.transid=transactions.transid
      )
    `);
    await db.exec("COMMIT");
    return repaired;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
