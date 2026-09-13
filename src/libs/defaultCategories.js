export const DEFAULT_CATEGORIES = [
  ["Debit", "lucide:House", "Rent", "#FF5733"],
  ["Debit", "lucide:Shirt", "Apparel", "#33FF57"],
  ["Debit", "lucide:Utensils", "Food", "#FF33A1"],
  ["Debit", "lucide:ShoppingBag", "Shopping", "#8C33FF"],
  ["Debit", "lucide:Zap", "Utilities", "#33FFA1"],
  ["Debit", "lucide:HeartPulse", "Health Care", "#A133FF"],
  ["Debit", "lucide:Sparkles", "Personal Care", "#FF8C33"],
  ["Debit", "lucide:Clapperboard", "Entertainment", "#33FF8C"],
  ["Debit", "lucide:Car", "Transportation", "#3357FF"],
  ["Debit", "lucide:CircleEllipsis", "Miscellaneous", "#FF338C"],
  ["Debit", "lucide:CreditCard", "Credit Card", "#5a82e1"],
  ["Credit", "lucide:WalletCards", "Salary", "#33FF8C"],
  ["Credit", "lucide:Users", "Friends", "#8CFF33"],
  ["Credit", "lucide:ArrowDownToLine", "External", "#FF8333"],
  ["Credit", "lucide:Landmark", "Interest", "#5a82e1"],
  ["Credit", "lucide:CircleEllipsis", "Miscellaneous", "#33A1FF"],
  ["Debit", "lucide:Repeat2", "Self", "#5a82e1"],
  ["Credit", "lucide:Repeat2", "Self", "#5a82e1"],
  ["Investment", "lucide:TrendingUp", "Investments", "#5a82e1"],
  ["Investment", "lucide:TrendingDown", "Investment redemption", "#e15b5b"],
  ["Investment", "lucide:CircleEllipsis", "Miscellaneous", "#A133FF"],
];

export async function ensureDefaultCategories(db) {
  const ids = [];
  for (const [type, imgpath, name, fill] of DEFAULT_CATEGORIES) {
    let row = await db.get("SELECT categoryid FROM categories WHERE type=? AND lower(name)=lower(?) ORDER BY categoryid LIMIT 1", [type, name]);
    if (!row) {
      const result = await db.run("INSERT INTO categories(type,imgpath,name,fill) VALUES(?,?,?,?)", [type, imgpath, name, fill]);
      row = { categoryid: result.lastID };
    }
    ids.push(row.categoryid);
  }
  return ids;
}
