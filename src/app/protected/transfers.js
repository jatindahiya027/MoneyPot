"use client";
import { getToken, clearToken } from "@/libs/clientToken";
import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
// ─── Toast ────────────────────────────────────────────────────

// ─── Auto-categorization rule engine ──────────────────────────
// Matches bank statement narrations/descriptions to MoneyPot categories.
// Rules are checked top-to-bottom; first match wins.
// Each rule: { pattern: RegExp, category: string, type?: "Debit"|"Credit" }
const AUTO_CAT_RULES = [
  // ── Credits / Income ───────────────────────────────────────
  { pattern: /\bSALARY\b|\bSAL\b|PAYROLL|WAGES/i,                         category: "Salary",        type: "Credit" },
  { pattern: /NEFT\s*CR|IMPS\s*CR|RTGS\s*CR/i,                             category: "External",      type: "Credit" },
  { pattern: /INTEREST\s*PAID|INTEREST\s*CR|SAVINGS\s*INTEREST/i,          category: "External",      type: "Credit" },
  { pattern: /REFUND|CASHBACK|REVERSAL/i,                                      category: "External",      type: "Credit" },
  { pattern: /DIVIDEND/i,                                                       category: "External",      type: "Credit" },

  // ── Food & Dining ──────────────────────────────────────────
  { pattern: /SWIGGY|ZOMATO|FOODPANDA|DUNZO|BLINKIT|ZEPTO/i,                  category: "Food" },
  { pattern: /DOMINOS|PIZZA\s*HUT|KFC|MCDONALDS|BURGER\s*KING|SUBWAY/i,     category: "Food" },
  { pattern: /STARBUCKS|CAFE\s*COFFEE|BARISTA|CHAAYOS/i,                      category: "Food" },
  { pattern: /\bRESTAURANT\b|\bCAFE\b|\bDHABA\b|\bHOTEL\b.*FOOD/i,   category: "Food" },
  { pattern: /BIGBASKET|GROFERS|INSTAMART|BLINKIT|\bGROCER/i,                 category: "Food" },
  { pattern: /DMART|RELIANCE\s*FRESH|RELIANCE\s*SMART|MORE\s*RETAIL/i,     category: "Food" },
  { pattern: /NATURE'S\s*BASKET|LULU\s*HYPERMARKET|STAR\s*BAZAAR/i,        category: "Food" },

  // ── Shopping / E-commerce ──────────────────────────────────
  { pattern: /AMAZON|FLIPKART|MEESHO|SNAPDEAL|MYNTRA|AJIO/i,                  category: "Shopping" },
  { pattern: /NYKAA|PURPLLE|BEAUTY/i,                                          category: "Shopping" },
  { pattern: /IKEA|PEPPERFRY|URBAN\s*LADDER/i,                                category: "Shopping" },
  { pattern: /DECATHLON|SPORTS|LIFESTYLE\s*STORES|SHOPPERS\s*STOP/i,        category: "Shopping" },
  { pattern: /WESTSIDE|PANTALOONS|CENTRAL|MAX\s*FASHION/i,                   category: "Shopping" },
  { pattern: /\bPOS\b.*MART|\bPOS\b.*STORE|\bPOS\b.*SHOP/i,             category: "Shopping" },

  // ── Transportation ─────────────────────────────────────────
  { pattern: /UBER|OLA\s*CABS|RAPIDO|MERU|TAXI|AUTORICKSHAW/i,               category: "Transportation" },
  { pattern: /IRCTC|INDIAN\s*RAILWAY|RAIL\s*TICKET/i,                       category: "Transportation" },
  { pattern: /INDIGO|AIR\s*INDIA|SPICEJET|GOAIR|VISTARA|AKASA/i,            category: "Transportation" },
  { pattern: /MAKEMYTRIP|YATRA|CLEARTRIP|IXIGO|GOIBIBO/i,                     category: "Transportation" },
  { pattern: /PETROL|DIESEL|FUEL|HPCL|BPCL|IOCL|INDIAN\s*OIL/i,            category: "Transportation" },
  { pattern: /FASTAG|TOLL|NHAI/i,                                              category: "Transportation" },
  { pattern: /METRO|BMTC|BEST\s*BUS|DTC\s*BUS/i,                           category: "Transportation" },

  // ── Entertainment ──────────────────────────────────────────
  { pattern: /NETFLIX|PRIME\s*VIDEO|HOTSTAR|DISNEY|SONYLIV|ZEE5/i,           category: "Entertainment" },
  { pattern: /SPOTIFY|GAANA|WYNK|JIOSAAVN|APPLE\s*MUSIC/i,                  category: "Entertainment" },
  { pattern: /BOOKMYSHOW|PVR|INOX|CINEPOLIS/i,                                category: "Entertainment" },
  { pattern: /YOUTUBE\s*PREMIUM|GOOGLE\s*ONE|APPLE\s*TV/i,                category: "Entertainment" },
  { pattern: /PLAYSTATION|XBOX|STEAM|GAMING/i,                                category: "Entertainment" },
  { pattern: /\bOTT\b|SUBSCRIPTION.*STREAM|STREAM.*SUBSCRIPTION/i,         category: "Entertainment" },

  // ── Utilities & Bills ──────────────────────────────────────
  { pattern: /ELECTRICITY|BESCOM|MSEDCL|BSES|TATA\s*POWER|ADANI\s*ELEC/i, category: "Utilities" },
  { pattern: /WATER\s*BILL|BWSSB|MCGM\s*WATER|JMC\s*WATER/i,             category: "Utilities" },
  { pattern: /AIRTEL|JIO|VODAFONE|BSNL|VI\b|IDEA|RELIANCE\s*JIO/i,        category: "Utilities" },
  { pattern: /BROADBAND|INTERNET\s*BILL|FIBER|ACT\s*FIBERNET|HATHWAY/i,   category: "Utilities" },
  { pattern: /PIPED\s*GAS|MAHANAGAR\s*GAS|INDRAPRASTHA\s*GAS|IGL\b/i,   category: "Utilities" },
  { pattern: /BBMP|MUNICIPALITY|PROPERTY\s*TAX|HOUSE\s*TAX/i,             category: "Utilities" },
  { pattern: /LPG|INDANE|HP\s*GAS|BHARAT\s*GAS/i,                         category: "Utilities" },

  // ── Health & Medical ──────────────────────────────────────
  { pattern: /APOLLO|MEDPLUS|1MG|PHARMEASY|NETMEDS|TATA\s*1MG/i,           category: "Health Care" },
  { pattern: /PRACTO|LYBRATE|DOCTOR|CLINIC|HOSPITAL|NURSING\s*HOME/i,      category: "Health Care" },
  { pattern: /PHARMACY|CHEMIST|MEDICAL\s*STORE/i,                           category: "Health Care" },
  { pattern: /DIAGNOSTIC|LAB\s*TEST|PATHOLOGY|THYROCARE|LALPATHLAB/i,      category: "Health Care" },
  { pattern: /INSURANCE.*HEALTH|HEALTH.*INSURANCE|MEDICLAIM/i,               category: "Health Care" },
  { pattern: /STAR\s*HEALTH|NIVA\s*BUPA|CARE\s*HEALTH|HDFC\s*ERGO/i,   category: "Health Care" },

  // ── Personal Care ─────────────────────────────────────────
  { pattern: /SALON|HAIR\s*CUT|BARBER|SPA|MASSAGE|GROOMING/i,              category: "Personal Care" },
  { pattern: /LAUNDRY|DRY\s*CLEAN|URBAN\s*DHOBI|DHOBILITE/i,              category: "Personal Care" },
  { pattern: /GYM|FITNESS|CULT\.FIT|CURE\.FIT|GOLD'S\s*GYM|ANYTIME/i,   category: "Personal Care" },
  { pattern: /YOGA|PILATES|MEDITATION|MINDFULNESS/i,                         category: "Personal Care" },

  // ── Rent & Housing ────────────────────────────────────────
  { pattern: /RENT\b|RENTAL|LANDLORD|HOUSE\s*RENT/i,                      category: "Rent" },
  { pattern: /HOUSING\s*LOAN|HOME\s*LOAN|EMI.*HOME|LICHFL|HDFC\s*LTD/i, category: "Rent" },
  { pattern: /SOCIETY\s*MAINTENANCE|MAINTENANCE\s*CHARGES|FLAT\s*MAINT/i, category: "Rent" },
  { pattern: /NOBROKER|MAGICBRICKS|99ACRES|HOUSING\.COM/i,                 category: "Rent" },

  // ── Apparel ───────────────────────────────────────────────
  { pattern: /H&M|ZARA|UNIQLO|LEVIS|PETER\s*ENGLAND|RAYMOND/i,            category: "Apparel" },
  { pattern: /RELIANCE\s*TRENDS|V-MART|MAX\s*FASHION|BRAND\s*FACTORY/i, category: "Apparel" },

  // ── Miscellaneous / Transfers ─────────────────────────────
  { pattern: /ATM\s*WDL|CASH\s*WDL|ATM\s*WITHDRAWAL|CASH\s*WITHDRAWAL/i, category: "Miscellaneous" },
  { pattern: /CREDIT\s*CARD.*PAYMENT|CC\s*PAYMENT|AMEX.*PAYMENT/i,        category: "Miscellaneous" },
  { pattern: /PAID\s*VIA\s*CRED|CRED\s*APP|CRED\s*PAYMENT/i,            category: "Miscellaneous" },
  { pattern: /NEFT\s*DR|RTGS\s*DR|IMPS\s*DR/i,                           category: "Miscellaneous" },

  // ── Food — from real statements (Canara/Axis format) ────────────
  { pattern: /HungerBox|Hungerbox|HUNGERBOX/i,                               category: "Food" },
  { pattern: /EatClub|Eat\s*Club/i,                                          category: "Food" },
  { pattern: /bbinstant|BB\s*INSTANT/i,                                      category: "Food" },
  { pattern: /OYE\s*PUNJABI|THE\s*PUNJABIYAT|NAVTARA\s*KITCHEN/i,         category: "Food" },
  { pattern: /PAV\s*MANTRA|Taaza\s*Kitchen|Dais\s*kitchen/i,              category: "Food" },
  { pattern: /ANKIT\s*JUICE|BLUE\s*TOKAI|RETREAT\s*CAFE|ARMANI\s*FOOD/i, category: "Food" },
  { pattern: /JAI\s*BHAVANI|CP\s*Cafe|UDIPIS|M\s*S\s*UNOS\s*FOOD/i,   category: "Food" },
  { pattern: /VIJETHA\s*SUPER|Ratnadeep\s*Super|SAMPOORNA\s*SUPER/i,      category: "Food" },
  { pattern: /LAKSHMI\s*VINAYAKA|M\s*S\s*SRI\s*TIRUMALA|BOLLI/i,        category: "Food" },
  { pattern: /Ice\s*Cream|KARACHI\s*BAKERY|Mehfil\s*Takeaway/i,           category: "Food" },
  { pattern: /RELIANCE\s*RETAIL|Reliance\s*Retail/i,                       category: "Food" },
  { pattern: /BIG\s*BASKET|BIGBASKET/i,                                      category: "Food" },
  { pattern: /\bBlinkit\b|\bBLINKIT\b|\bZEPTO\b|zeptonow|\bZepto\b/i, category: "Food" },
  { pattern: /Bundl\s*Technologies|Swiggy\s*Instamart/i,                   category: "Food" },

  // ── Entertainment — from real statements ─────────────────────
  { pattern: /BIGTREE\s*ENTERTAINMENT|BIGTRE/i,                             category: "Entertainment" },
  { pattern: /PVR\s*INOX|PVR\s*FOODS|PVR\s*CINEMAS/i,                   category: "Entertainment" },
  { pattern: /District\s*app|District\b/i,                                 category: "Entertainment" },
  { pattern: /Times\s*Internet|TIMES\s*PRIME/i,                            category: "Entertainment" },
  { pattern: /GOOGLE\s*INDIA\s*DIGITAL|Google\s*Play|Google\s*Pl/i,     category: "Entertainment" },
  { pattern: /Spotify|SPOTIFY/i,                                              category: "Entertainment" },

  // ── Transportation — from real statements ────────────────────
  { pattern: /\bRapido\b/i,                                                  category: "Transportation" },
  { pattern: /UBER\s*INDIA|UBER\s*SYSTEMS/i,                               category: "Transportation" },
  { pattern: /TSRTC|TELANGANA\s*STATE\s*ROAD|TSRTC\s*iTIMs/i,            category: "Transportation" },
  { pattern: /Delhi\s*Metro|DELHI\s*METRO\s*RAIL|\bDMRC\b/i,           category: "Transportation" },
  { pattern: /\bixigo\b|IXIGO/i,                                            category: "Transportation" },
  { pattern: /\bGoibibo\b|TRAVELOGY/i,                                      category: "Transportation" },
  { pattern: /\bIndigo\b|AIR\s*INDIA\s*LIMITED/i,                        category: "Transportation" },
  { pattern: /VENKATADRI\s*FUEL|FUEL\s*PNT/i,                             category: "Transportation" },

  // ── Health Care — from real statements ───────────────────────
  { pattern: /IQ\s*PHARMACY|IQ\s*CLINICS/i,                               category: "Health Care" },
  { pattern: /M\s*S\s*CARE\s*PHARMACY|M\/S\.CARE\s*PHARMACY/i,       category: "Health Care" },
  { pattern: /TATA\s*1MG|TATA\s*1\s*MG/i,                               category: "Health Care" },
  { pattern: /PURE\s*O\s*NATURAL|PAWAN\s*HEALTH/i,                       category: "Health Care" },

  // ── Shopping — from real statements ──────────────────────────
  { pattern: /\bAJIO\b/i,                                                   category: "Shopping" },
  { pattern: /Tata\s*Cliq|TATA\s*CLIQ/i,                                  category: "Shopping" },
  { pattern: /MEESHO\s*TECHNOLOGIES|\bMEESHO\b/i,                        category: "Shopping" },
  { pattern: /BATA\s*INDIA/i,                                               category: "Shopping" },
  { pattern: /Flipkart\s*Payments/i,                                        category: "Shopping" },
  { pattern: /PAYTM\s*ECOMMERCE|One97\s*Communications/i,                 category: "Shopping" },
  { pattern: /\bDealskart\b/i,                                              category: "Shopping" },
  { pattern: /Dreamplug\s*Service/i,                                        category: "Shopping" },

  // ── Utilities — from real statements ─────────────────────────
  { pattern: /UHBVN|Haryana\s*Electricity|UHBVN\s*Haryana/i,             category: "Utilities" },
  { pattern: /CSHBCK\/BILPAY|MBBPay/i,                                     category: "Utilities" },
  { pattern: /Airtel\s*Prepaid|WWW\s*AIRTEL|AIRTEL\s*PAYMENTS.*Prepai/i, category: "Utilities" },
  { pattern: /\bVi\b.*mobile|Vi\s*prepaid|^\/P2M\/.*\/Vi\s+/i,      category: "Utilities" },

  // ── Rent — from real statements ──────────────────────────────
  { pattern: /BLISS\s*CO\s*LIVING|VIBGYOR\s*ACCOMMODATION/i,             category: "Rent" },
  { pattern: /Rent\s*mon|rent\s*mon/i,                                     category: "Rent" },

  // ── Personal Care — from real statements ─────────────────────
  { pattern: /mens\s*beau|beauty\s*salon|CHESSMEN\s*ASSOC/i,             category: "Personal Care" },

  // ── Miscellaneous / Finance ───────────────────────────────────
  { pattern: /\bCRED\s*Club\b|CRED\s*Club/i,                            category: "Miscellaneous" },
  { pattern: /KreditBee|KREDITBEE/i,                                         category: "Miscellaneous" },
  { pattern: /CREDIT\s*INFORMATION\s*BU|CIBIL/i,                          category: "Miscellaneous" },
  { pattern: /NSDL\s*E\s*GOV\s*PAN|NSDL.*PAN/i,                         category: "Miscellaneous" },
  { pattern: /Dr\s*Card\s*Charges|CARD\s*CHARGES/i,                      category: "Miscellaneous" },
  { pattern: /SMS\s*Alerts\s*Chrgs|SMS\s*ALERTS/i,                       category: "Miscellaneous" },
  { pattern: /Groww\s*Invest|MUTUAL\s*FUNDS\s*ICCL|UTI\s*MF|DSP\s*MUTUAL|HDFC\s*MUTUAL/i, category: "Miscellaneous" },
  { pattern: /IFT\/CB|NEFT\/CITIN|NEFT\/HDFCH/i,                        category: "External",     type: "Credit" },
  { pattern: /SB:\d+:Int\.Pd/i,                                            category: "External",     type: "Credit" },
  { pattern: /UPIP2PREC|UPILITE/i,                                           category: "External",     type: "Credit" },
  { pattern: /Amazon\s*Pa.*Refund|SwiggyRe/i,                              category: "External",     type: "Credit" },

  // ── Canara Bank format: UPI/P2M/REF/MERCHANT/remark/BANK ─────
  // The merchant is in the 4th slash-separated segment. We extract it inline.
  // These rules match the raw PARTICULARS string from Canara statements.
  { pattern: /\/P2M\/[^\/]+\/ZOMATO/i,                                  category: "Food" },
  { pattern: /\/P2M\/[^\/]+\/Swiggy|SWIGGY/i,                          category: "Food" },
  { pattern: /\/P2M\/[^\/]+\/Dominos|DOMINOS/i,                         category: "Food" },
  { pattern: /\/P2M\/[^\/]+\/Amazon\s*Pay/i,                           category: "Shopping" },
  { pattern: /\/P2M\/[^\/]+\/UBER/i,                                     category: "Transportation" },
  { pattern: /\/P2M\/[^\/]+\/Rapido/i,                                   category: "Transportation" },
  { pattern: /\/P2M\/[^\/]+\/BOOKMYSHOW/i,                              category: "Entertainment" },

  // ── Confirmed merchant identities from web research ─────────────

  // Jubilant FoodWorks = Domino's Pizza India master franchisee
  // Appears as "Jubilant" in UPI P2A narrations for Domino's direct orders
  { pattern: /\bJubilant\b/i,                                               category: "Food" },

  // One97 Communications = Paytm parent company
  // Appears when paying via Paytm wallet, Paytm recharge, or Paytm merchants
  { pattern: /ONE97\s*COM|One97\s*Com/i,                                   category: "Miscellaneous" },

  // Google Pay appears as "Google Pa" in truncated Canara Bank narrations
  { pattern: /Google\s*Pa\b/i,                                              category: "Miscellaneous" },

  // ── Confirmed personal names from transaction patterns ────────
  // These are repeat contacts in Jatin's statements — categorized by
  // transaction pattern: credits only = money received back = Friends,
  // small irregular amounts = splitting bills = Friends

  // ── Personal names — confirmed by account holder ────────────────

  // Friends (confirmed)
  { pattern: /PRIYA\s*VERMA|PRIYA\s*VER/i,                                category: "Friends" },
  { pattern: /ABHIGYAN/i,                                                    category: "Friends" },
  { pattern: /SANKA\s*POTHANA|SANKA\s*POT/i,                              category: "Friends" },
  { pattern: /NIDHI\s*DAH|NIDHI\s*DAHIYA/i,                               category: "Friends" },

  // PG owners — pay rent to them
  { pattern: /ANUSHA\s*SANNAPAREDDY/i,                                      category: "Rent" },
  { pattern: /RAJAMOHAN\s*REDDY/i,                                          category: "Rent" },

  // Swimming pool / sports facility
  { pattern: /NAGAPURI\s*CHANDRA/i,                                         category: "Personal Care" },

  // Misc: Ola/Uber drivers, small shop owners, others
  { pattern: /SAINATH\s*GAWALI/i,                                           category: "Miscellaneous" },
  { pattern: /KARUNA\s*REDDY/i,                                             category: "Miscellaneous" },
  { pattern: /CHESSMEN\s*ASSOC/i,                                           category: "Miscellaneous" },
  { pattern: /YARAVA\s*SEKHAR/i,                                            category: "Miscellaneous" },
  { pattern: /\bNARENDRA\s*\/|NARENDRA\s*\//i,                          category: "Miscellaneous" },

  // ── Indian Clearing Corp (ICICI) = salary/payroll credit ────────
  { pattern: /Indian\s*Cl[\s\/]|INDIAN\s*CLEARING/i,                     category: "Salary",        type: "Credit" },

  // ── BharatPe merchant (small vendor, no way to know category) ────
  { pattern: /BharatPe\s*Merchant/i,                                        category: "Miscellaneous" },

  // ── UPI peer transfers (last resort) ─────────────────────────────
  // HDFC format: UPI-NAME-VPA@BANK-...
  { pattern: /^UPI-[A-Z\s]+-[\d]+@/i,                                      category: "Friends" },
  { pattern: /^UPI-/i,                                                        category: "Miscellaneous" },
  // Canara format: /UPI/P2A/... or UPI/P2A/...
  { pattern: /(?:^\/?)UPI\/P2A\//i,                                        category: "Friends" },
  { pattern: /(?:^\/?)UPI\/P2M\//i,                                        category: "Miscellaneous" },
];

/**
 * Attempt to auto-assign a MoneyPot category from a bank narration string.
 * Returns null if no rule matches (caller should keep defaultCategory).
 */
function autoCategorize(description, type) {
  if (!description) return null;
  const d = String(description).trim();

  // For Canara Bank format (e.g. UPI/P2M/509121/MERCHANT NAME /remark/BANK)
  // extract the merchant segment so existing rules match both HDFC and Canara
  let merchantName = d;
  const canaraMatch = d.match(/(?:^\/?)?UPI\/P2[AM]\/[^\/]+\/([^\/]{2,}?)\s*\//i);
  if (canaraMatch) {
    merchantName = (canaraMatch[1] || "").trim();
  }

  for (const rule of AUTO_CAT_RULES) {
    if (rule.type && rule.type !== type) continue;
    // Test both the full description and the extracted merchant name
    if (rule.pattern.test(d) || (merchantName !== d && rule.pattern.test(merchantName))) {
      return rule.category;
    }
  }
  return null;
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast-${type}`}>
      <span>{type === "success" ? "✓" : "✗"}</span>
      {message}
    </div>
  );
}

// ─── Single Transaction Form ──────────────────────────────────
function TransactionForm({ onSubmit, onClose, initialData, categories, title }) {
  const [selectedType, setSelectedType] = useState(initialData?.type || "Debit");
  const [bankName, setBankName] = useState(initialData?.bank_name || "");

  return (
    <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="form-modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={onSubmit}>
          <input type="hidden" name="id" value={initialData?.transid || ""} />
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" name="type" value={selectedType}
                onChange={e => setSelectedType(e.target.value)}>
                <option value="Debit">Debit</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" name="category" defaultValue={initialData?.category || ""}>
                {categories.filter(c => c.type === selectedType).map((c, i) => (
                  <option key={i} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" name="date"
                defaultValue={initialData?.date || new Date().toISOString().split("T")[0]} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" name="amount" step="0.01"
                placeholder="0.00" defaultValue={initialData?.amount || ""} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <textarea className="form-textarea" name="description" rows={3}
              placeholder="Optional description…" defaultValue={initialData?.description || ""} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bank / Account</label>
            <input type="hidden" name="bank_name" value={bankName} />
            <BankSelector value={bankName} onChange={setBankName} placeholder="Select or type bank name…" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {initialData ? "Save changes" : "Add transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Bulk Entry Form ──────────────────────────────────────────
function BulkForm({ onClose, onSuccess, categories }) {
  const emptyRow = () => ({ type: "Debit", category: "", description: "", date: new Date().toISOString().split("T")[0], amount: "", bank_name: "" });
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [globalBank, setGlobalBank] = useState("");

  // Apply a bank to all rows at once
  const applyBankToAll = (bank) => {
    setGlobalBank(bank);
    setRows(prev => prev.map(r => ({ ...r, bank_name: bank })));
  };

  const updateRow = (i, field, value) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    const token = getToken();
    const validRows = rows.filter(r => r.amount && r.date).map(r => ({
      ...r,
      date: normalizeBulkDate(r.date),
    }));
    if (!validRows.length) return;
    setLoading(true);
    try {
      // Single batched request instead of N sequential fetches
      const res = await fetch("/api/bulktransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      if (data.success) onSuccess(data.inserted);
      else console.error("Bulk insert error:", data.error);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="form-modal form-modal-wide">
        <div className="modal-header">
          <span className="modal-title">Bulk Entry</span>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
          Enter multiple transactions at once. Rows with empty amount/date will be skipped.
        </p>
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>🏦 Apply bank to all rows:</label>
          <div style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
            <BankSelector value={globalBank} onChange={applyBankToAll}
              placeholder="Select bank for all rows…" />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>or set individually per row below</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="bulk-table">
            <thead>
              <tr>
                <th>Type</th><th>Category</th><th>Date</th>
                <th>Amount (₹)</th><th>Description</th><th>Bank</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td style={{ minWidth: 100 }}>
                    <select className="bulk-select" value={row.type}
                      onChange={e => updateRow(i, "type", e.target.value)}>
                      <option value="Debit">Debit</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </td>
                  <td style={{ minWidth: 130 }}>
                    <select className="bulk-select" value={row.category}
                      onChange={e => updateRow(i, "category", e.target.value)}>
                      <option value="">— select —</option>
                      {categories.filter(c => c.type === row.type).map((c, ci) => (
                        <option key={ci} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ minWidth: 140 }}>
                    <input className="bulk-input" type="date" value={row.date}
                      onChange={e => updateRow(i, "date", e.target.value)} />
                  </td>
                  <td style={{ minWidth: 110 }}>
                    <input className="bulk-input" type="number" step="0.01"
                      placeholder="0.00" value={row.amount}
                      onChange={e => updateRow(i, "amount", e.target.value)} />
                  </td>
                  <td style={{ minWidth: 180 }}>
                    <input className="bulk-input" type="text" placeholder="Description"
                      value={row.description}
                      onChange={e => updateRow(i, "description", e.target.value)} />
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <BankSelector
                      value={row.bank_name}
                      onChange={bank => updateRow(i, "bank_name", bank)}
                      placeholder="Bank…"
                    />
                  </td>
                  <td style={{ width: 36 }}>
                    <button className="btn-ghost btn-danger-ghost" onClick={() => removeRow(i)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn-secondary" style={{ marginTop: 12 }} onClick={addRow}>
          + Add row
        </button>
        <div className="form-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : `Submit ${rows.filter(r => r.amount && r.date).length} rows`}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Date Normalizer ──────────────────────────────────────────
// Converts any date string into YYYY-MM-DD, handles:
//   DD-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY, DD MMM YYYY,
//   YYYY-MM-DD, D/M/YY, M/D/YY, etc.
function normalizeDate(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD-MM-YYYY or DD/MM/YYYY (Indian bank default — day first)
  const dmyFull = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyFull) {
    const [, d, m, y] = dmyFull;
    // Disambiguate: if first part > 12 it must be day; if second part > 12 it's day/month/year reversed
    const p1 = parseInt(d), p2 = parseInt(m);
    if (p1 > 12) {
      // definitely DD/MM/YYYY
      return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
    // For Indian banks assume DD/MM/YYYY
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }

  // DD-MM-YY or D/M/YY (2-digit year)
  const dmyShort = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (dmyShort) {
    const [, d, m, yy] = dmyShort;
    const year = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`;
    const p1 = parseInt(d);
    if (p1 > 12) {
      return `${year}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
    // assume DD/MM/YY for Indian banks
    return `${year}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }

  // MM/DD/YYYY (explicit US format — only used when we know it's US)
  // We don't assume this — handled by caller passing { usFormat: true }

  // DD MMM YYYY  e.g. 01 Feb 2026
  const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const dmy3 = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (dmy3) {
    const [, d, mon, y] = dmy3;
    const m = months[mon.toLowerCase()];
    if (m) return `${y}-${String(m).padStart(2,"0")}-${d.padStart(2,"0")}`;
  }

  // Try JS Date as last resort (unreliable for ambiguous formats but catches ISO-like)
  const jsDate = new Date(s);
  if (!isNaN(jsDate)) {
    return jsDate.toISOString().split("T")[0];
  }

  return s; // return as-is if nothing matched
}

// Normalize when we KNOW it's MM/DD/YYYY (CSV with US date format)
function normalizeDateUS(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  const mdyFull = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdyFull) {
    const [, m, d, y] = mdyFull;
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  const mdyShort = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (mdyShort) {
    const [, m, d, yy] = mdyShort;
    const year = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`;
    return `${year}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return normalizeDate(raw);
}

// normalizeBulkDate: for manual bulk-entry inputs — tries US format (M/D/YYYY) since
// that is what a user typing "2/17/2027" most likely means, then falls back to auto.
function normalizeBulkDate(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  // Already YYYY-MM-DD (what date picker produces) — return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // If second segment > 12 → first must be month (MM/DD)
  const parts = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (parts) {
    const [, a, b, yraw] = parts;
    const year = yraw.length === 2 ? (parseInt(yraw) >= 50 ? "19" + yraw : "20" + yraw) : yraw;
    if (parseInt(b) > 12) {
      // a=month, b=day (MM/DD/YYYY)
      return `${year}-${a.padStart(2,"0")}-${b.padStart(2,"0")}`;
    }
    if (parseInt(a) > 12) {
      // a=day, b=month (DD/MM/YYYY)
      return `${year}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`;
    }
    // Ambiguous — assume MM/DD (US) for manual bulk entry
    return `${year}-${a.padStart(2,"0")}-${b.padStart(2,"0")}`;
  }
  return normalizeDate(raw);
}


// ─── Import Bank Statement (CSV / Excel / PDF) ────────────────

// ── Date normalizer: always returns YYYY-MM-DD
// Handles DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY (Indian banks — Axis/HDFC)
function parseBankDate(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY (4-digit year)
  const full = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (full) {
    const [, d, m, y] = full;
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  // DD/MM/YY (2-digit year — HDFC uses this)
  const short = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (short) {
    const [, d, m, yy] = short;
    const year = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`;
    return `${year}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  // Fallback JS date
  const js = new Date(s);
  if (!isNaN(js)) return js.toISOString().split("T")[0];
  return s;
}

// ── Date format options presented to user
const DATE_FORMAT_OPTIONS = [
  { value: "auto",       label: "Auto-detect",               example: "any format" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY  (Indian banks)", example: "25/01/2024" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY  (US format)",    example: "01/25/2024" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD  (ISO / Excel)",  example: "2024-01-25" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY",                 example: "25-01-2024" },
  { value: "DD MMM YYYY",label: "DD MMM YYYY",                example: "25 Jan 2024" },
  { value: "MMM DD YYYY",label: "MMM DD, YYYY  (US long)",    example: "Jan 25, 2024" },
  { value: "DD/MM/YY",   label: "DD/MM/YY  (short year)",     example: "25/01/24" },
];

// ── Parse a raw date string using a user-selected format token
function parseDateWithFormat(raw, fmt) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";

  if (fmt === "auto") return parseBankDate(s);

  if (fmt === "YYYY-MM-DD") {
    // Already ISO, or let parseBankDate handle it
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return parseBankDate(s);
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
  if (fmt === "DD/MM/YYYY" || fmt === "DD-MM-YYYY" || fmt === "DD/MM/YY") {
    const m4 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m4) {
      const [, d, mo, yraw] = m4;
      const y = yraw.length === 2 ? (parseInt(yraw) >= 50 ? "19"+yraw : "20"+yraw) : yraw;
      return `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
  }

  // MM/DD/YYYY
  if (fmt === "MM/DD/YYYY") {
    const m4 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m4) {
      const [, mo, d, yraw] = m4;
      const y = yraw.length === 2 ? (parseInt(yraw) >= 50 ? "19"+yraw : "20"+yraw) : yraw;
      return `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
  }

  // DD MMM YYYY  e.g. 25 Jan 2024
  if (fmt === "DD MMM YYYY") {
    const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[,\s]+(\d{4})$/);
    if (m) {
      const mo = months[m[2].toLowerCase()];
      if (mo) return `${m[3]}-${String(mo).padStart(2,"0")}-${m[1].padStart(2,"0")}`;
    }
  }

  // MMM DD YYYY  e.g. Jan 25, 2024
  if (fmt === "MMM DD YYYY") {
    const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const m = s.match(/^([A-Za-z]{3})\s+(\d{1,2})[,\s]+(\d{4})$/);
    if (m) {
      const mo = months[m[1].toLowerCase()];
      if (mo) return `${m[3]}-${String(mo).padStart(2,"0")}-${m[2].padStart(2,"0")}`;
    }
  }

  // Fallback
  return parseBankDate(s);
}

// ── Amount cleaner: strips ₹, commas, spaces
function cleanAmount(raw) {
  if (!raw) return 0;
  return parseFloat(String(raw).replace(/[₹,\s]/g, "")) || 0;
}

// ══════════════════════════════════════════════════════════════
// AXIS BANK PDF PARSER
// Layout (from real coordinate analysis):
//   Date x≈30          | DD-MM-YYYY format
//   Description x≈85   | multi-line, continuation also at x≈85
//   Withdrawals x≈292-325
//   Deposits    x≈367-399
//   Balance     x≈442-455
// ══════════════════════════════════════════════════════════════
async function parseAxisPDF(pdf) {
  const transactions = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Group items by Y (rounded to nearest 2px for stability)
    const byY = {};
    content.items.forEach(item => {
      if (!item.str.trim()) return;
      const y = Math.round(item.transform[5] / 2) * 2;
      const x = Math.round(item.transform[4]);
      if (!byY[y]) byY[y] = [];
      byY[y].push({ x, text: item.str.trim() });
    });

    // Column X boundaries derived from real data:
    // date: x < 80
    // description: 80 <= x < 280
    // withdrawal: 280 <= x < 360
    // deposit: 360 <= x < 435
    // balance: 435 <= x
    const classify = (x) => {
      if (x < 80) return "date";
      if (x < 280) return "desc";
      if (x < 360) return "withdrawal";
      if (x < 435) return "deposit";
      return "balance";
    };

    const isDateLike = (text) => /^\d{2}[-\/]\d{2}[-\/]\d{2,4}$/.test(text.trim());

    // Sort rows top-to-bottom (descending Y in PDF coords = top of page first)
    const sortedYs = Object.keys(byY).map(Number).sort((a, b) => b - a);

    let currentTx = null;

    for (const y of sortedYs) {
      const items = byY[y].sort((a, b) => a.x - b.x);

      // Build cell map for this row
      const cells = { date: [], desc: [], withdrawal: [], deposit: [], balance: [] };
      items.forEach(item => {
        const col = classify(item.x);
        cells[col].push(item.text);
      });

      const dateText = cells.date.join(" ").trim();
      const descText = cells.desc.join(" ").trim();

      // Skip header/footer rows
      if (/txn date|transaction|withdrawals|deposits|balance|opening balance|closing balance|legends|disclaimer|axis bank/i.test(descText + dateText)) {
        continue;
      }

      if (isDateLike(dateText)) {
        // New transaction row
        if (currentTx) transactions.push(currentTx);
        const withdrawal = cleanAmount(cells.withdrawal.join(""));
        const deposit = cleanAmount(cells.deposit.join(""));
        currentTx = {
          date: parseBankDate(dateText),
          _rawDate: dateText,
          description: descText,
          amount: withdrawal > 0 ? withdrawal : deposit,
          type: withdrawal > 0 ? "Debit" : deposit > 0 ? "Credit" : null,
        };
      } else if (currentTx && descText && !dateText) {
        // Continuation line — append to description
        currentTx.description = (currentTx.description + " " + descText).trim();
        // Also check if this line has an amount (some credit rows have deposit on continuation)
        if (!currentTx.type) {
          const w = cleanAmount(cells.withdrawal.join(""));
          const d = cleanAmount(cells.deposit.join(""));
          if (w > 0) { currentTx.amount = w; currentTx.type = "Debit"; }
          else if (d > 0) { currentTx.amount = d; currentTx.type = "Credit"; }
        }
      }
    }
    if (currentTx) transactions.push(currentTx);
  }

  // Filter valid rows and set default type
  return transactions.filter(tx => tx.date && tx.amount > 0).map(tx => ({
    ...tx,
    type: tx.type || "Debit",
  }));
}

// ══════════════════════════════════════════════════════════════
// HDFC BANK PDF PARSER
// Layout (from real coordinate analysis):
//   Date x≈34           | DD/MM/YY format (2-digit year!)
//   Narration x≈72      | main line (and continuation lines!)
//   Narration cont x≈68 | continuation — slightly left-indented
//   Ref x≈289
//   Value Dt x≈362
//   Withdrawal x≈405-470 (right-aligned, so actual numbers are ~438-470)
//   Deposit x≈491-548   (right-aligned, actual numbers ~516-548)
//   Balance x≈564-615
// ══════════════════════════════════════════════════════════════
async function parseHdfcPDF(pdf) {
  const transactions = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    const byY = {};
    content.items.forEach(item => {
      if (!item.str.trim()) return;
      const y = Math.round(item.transform[5] / 2) * 2;
      const x = Math.round(item.transform[4]);
      if (!byY[y]) byY[y] = [];
      byY[y].push({ x, text: item.str.trim() });
    });

    // HDFC column classification:
    // date: x < 65
    // narration: 65 <= x < 280  (includes x=68 and x=72 continuation lines)
    // ref: 280 <= x < 355
    // value_date: 355 <= x < 400
    // withdrawal: 400 <= x < 485
    // deposit: 485 <= x < 560
    // balance: 560 <= x
    const classify = (x) => {
      if (x < 65) return "date";
      if (x < 280) return "narration";
      if (x < 355) return "ref";
      if (x < 400) return "value_date";
      if (x < 485) return "withdrawal";
      if (x < 560) return "deposit";
      return "balance";
    };

    const isDateLike = (text) => /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(text.trim());
    const isRefLike = (text) => /^[0-9A-Z]{10,}$/.test(text.trim());

    const sortedYs = Object.keys(byY).map(Number).sort((a, b) => b - a);

    let currentTx = null;
    let headerFound = false;

    for (const y of sortedYs) {
      const items = byY[y].sort((a, b) => a.x - b.x);
      const cells = { date: [], narration: [], ref: [], value_date: [], withdrawal: [], deposit: [], balance: [] };
      items.forEach(item => {
        const col = classify(item.x);
        cells[col].push(item.text);
      });

      const dateText = cells.date.join(" ").trim();
      const narText = cells.narration.join(" ").trim();
      const allText = items.map(i => i.text).join(" ");

      // Detect header row
      if (/narration|withdrawal amt|deposit amt/i.test(allText)) {
        headerFound = true;
        continue;
      }

      if (!headerFound) continue;

      // Skip summary/footer rows
      if (/statement summary|opening balance|generated on|page no|hdfc bank limited|closing bal|^this is/i.test(allText)) {
        continue;
      }

      // Skip rows of asterisks
      if (/^\*+$/.test(narText)) continue;

      if (isDateLike(dateText)) {
        // New transaction row
        if (currentTx) transactions.push(currentTx);
        const withdrawal = cleanAmount(cells.withdrawal.join(""));
        const deposit = cleanAmount(cells.deposit.join(""));
        currentTx = {
          date: parseBankDate(dateText),
          _rawDate: dateText,
          description: narText,
          ref: cells.ref.join(" ").trim(),
          amount: withdrawal > 0 ? withdrawal : deposit,
          type: withdrawal > 0 ? "Debit" : deposit > 0 ? "Credit" : null,
        };
      } else if (currentTx && !dateText) {
        // Continuation line — narration only (no date, no amounts)
        // These can be at x=68 or x=72 or x=74 — all caught by narration column (x < 280)
        if (narText && !isRefLike(narText)) {
          currentTx.description = (currentTx.description + " " + narText).trim();
        }
        // If amounts appear on continuation (unusual but safe)
        if (!currentTx.type) {
          const w = cleanAmount(cells.withdrawal.join(""));
          const d = cleanAmount(cells.deposit.join(""));
          if (w > 0) { currentTx.amount = w; currentTx.type = "Debit"; }
          else if (d > 0) { currentTx.amount = d; currentTx.type = "Credit"; }
        }
      }
    }
    if (currentTx) transactions.push(currentTx);
  }

  return transactions.filter(tx => tx.date && tx.amount > 0).map(tx => ({
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    type: tx.type || "Debit",
  }));
}

// ══════════════════════════════════════════════════════════════
// GENERIC PDF PARSER (fallback for unknown banks)
// Uses positional column detection with header row as guide
// ══════════════════════════════════════════════════════════════
async function parseGenericPDF(pdf) {
  let allItems = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    content.items.forEach(item => {
      if (!item.str.trim()) return;
      allItems.push({
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        text: item.str.trim(),
        page: p,
      });
    });
  }

  // Group by Y
  const byY = {};
  allItems.forEach(item => {
    const yk = `${item.page}_${Math.round(item.y / 2) * 2}`;
    if (!byY[yk]) byY[yk] = [];
    byY[yk].push(item);
  });

  // Find header row
  const headerKws = ["date", "amount", "narration", "description", "withdrawal", "deposit", "debit", "credit", "balance"];
  let headerKey = null;
  let headerItems = [];
  for (const [key, items] of Object.entries(byY)) {
    const joined = items.map(i => i.text).join(" ").toLowerCase();
    if (headerKws.filter(k => joined.includes(k)).length >= 2) {
      headerKey = key;
      headerItems = items.sort((a, b) => a.x - b.x);
      break;
    }
  }

  if (!headerKey || headerItems.length < 2) return null; // signal fallback to manual mapping

  // Build column boundaries
  const colNames = headerItems.map(i => i.text.toLowerCase().trim());
  const colXs = headerItems.map(i => i.x);
  const colBoundaries = colXs.map((x, i) => i < colXs.length - 1 ? (x + colXs[i + 1]) / 2 : 99999);

  const getCol = (x) => {
    for (let i = 0; i < colBoundaries.length; i++) {
      if (x <= colBoundaries[i]) return i;
    }
    return colBoundaries.length - 1;
  };

  // Build rows after header
  const isDateLike = (t) => /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(t);
  const transactions = [];
  let currentTx = null;
  let pastHeader = false;

  const sortedKeys = Object.keys(byY).sort((a, b) => {
    const [pa, ya] = a.split("_").map(Number);
    const [pb, yb] = b.split("_").map(Number);
    if (pa !== pb) return pa - pb;
    return yb - ya;
  });

  for (const key of sortedKeys) {
    if (key === headerKey) { pastHeader = true; continue; }
    if (!pastHeader) continue;

    const items = byY[key].sort((a, b) => a.x - b.x);
    const cells = new Array(colNames.length).fill("");
    items.forEach(item => {
      const col = getCol(item.x);
      if (col < cells.length) cells[col] = cells[col] ? cells[col] + " " + item.text : item.text;
    });
    cells.forEach((c, i) => cells[i] = c.trim());

    const col0 = cells[0];
    if (isDateLike(col0)) {
      if (currentTx) transactions.push(currentTx);
      // detect withdrawal/deposit columns
      let withdrawal = 0, deposit = 0, type = "Debit";
      const wIdx = colNames.findIndex(c => c.includes("withdraw") || c.includes("debit"));
      const dIdx = colNames.findIndex(c => c.includes("deposit") || c.includes("credit"));
      const aIdx = colNames.findIndex(c => c.includes("amount") && wIdx === -1);
      if (wIdx >= 0) withdrawal = cleanAmount(cells[wIdx]);
      if (dIdx >= 0) deposit = cleanAmount(cells[dIdx]);
      const amount = withdrawal > 0 ? withdrawal : deposit > 0 ? deposit : cleanAmount(cells[aIdx] || "");
      type = withdrawal > 0 ? "Debit" : "Credit";
      const descIdx = colNames.findIndex(c => c.includes("narration") || c.includes("description") || c.includes("particulars") || c.includes("transaction"));
      currentTx = {
        date: parseBankDate(col0),
        _rawDate: col0,
        description: descIdx >= 0 ? cells[descIdx] : cells[1] || "",
        amount,
        type,
      };
    } else if (currentTx && col0 === "" && cells.some(c => c)) {
      currentTx.description = (currentTx.description + " " + cells.filter(c => c).join(" ")).trim();
    }
  }
  if (currentTx) transactions.push(currentTx);
  return transactions.filter(tx => tx.date && tx.amount > 0);
}

// ── Detect bank from PDF metadata / first-page text
function detectBank(firstPageText) {
  const t = firstPageText.toLowerCase();
  if (t.includes("axis bank")) return "axis";
  if (t.includes("hdfc bank")) return "hdfc";
  if (t.includes("state bank") || t.includes("sbi")) return "sbi";
  if (t.includes("icici")) return "icici";
  return "generic";
}

function ImportModal({ onClose, onSuccess, categories }) {
  const [step, setStep] = useState("upload");
  const [parsedRows, setParsedRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [splitMode, setSplitMode] = useState(false);
  const [mapping, setMapping] = useState({
    date: "", amount: "", withdrawal: "", deposit: "", description: "", type: ""
  });
  const [defaultType, setDefaultType] = useState("Debit");
  const [defaultCategory, setDefaultCategory] = useState("");
  const [importBank, setImportBank] = useState("");
  const [preview, setPreview] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [parseError, setParseError] = useState("");
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [workbook, setWorkbook] = useState(null);
  // For auto-parsed PDFs (bank-specific) we skip the mapping step
  const [autoParsed, setAutoParsed] = useState(null); // null | array of transactions
  const [detectedBank, setDetectedBank] = useState("");
  // Date format chosen by user for this file
  const [dateFormat, setDateFormat] = useState("auto");

  const STEPS = ["upload", "map", "preview"];

  // ── Auto-detect column names for CSV/Excel
  const autoDetect = (hdrs) => {
    const detect = (patterns) =>
      hdrs.find(h => patterns.some(p => h.toLowerCase().includes(p))) || "";
    const withdrawal = detect(["withdrawal", "debit amt", "dr amt", "debit amount", "withdrawals", "paid out"]);
    const deposit = detect(["deposit", "credit amt", "cr amt", "credit amount", "deposits", "paid in"]);
    const isSplit = !!(withdrawal && deposit);
    setSplitMode(isSplit);
    return {
      date: detect(["txn date", "transaction date", "date", "value dt", "value date"]),
      withdrawal,
      deposit,
      amount: isSplit ? "" : detect(["amount", "value", "sum", "txn amount"]),
      description: detect(["narration", "description", "transaction", "particulars", "details", "memo"]),
      type: isSplit ? "" : detect(["type", "dr/cr", "transaction type"]),
    };
  };

  // ── Process 2D array into row objects (for CSV/Excel)
  const processRows = (data) => {
    if (!data || data.length < 2) { setParseError("File appears to have no data rows."); return; }
    // Find first row that looks like a header (has 2+ non-empty cells with text, not just numbers)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(data.length, 30); i++) {
      const row = data[i];
      const textCells = row.filter(c => c && !/^[\*\-=]+$/.test(String(c)) && isNaN(Number(String(c).replace(/[,\s]/g, ""))));
      if (textCells.length >= 3) { headerIdx = i; break; }
    }
    const hdrs = data[headerIdx].map(h => String(h ?? "").trim());
    // Skip separator rows (rows full of asterisks/dashes)
    const rows = data.slice(headerIdx + 1)
      .filter(row => {
        const vals = row.map(c => String(c ?? "").trim());
        const allStars = vals.every(v => /^[\*\-=\s]*$/.test(v));
        return !allStars && vals.some(v => v !== "");
      })
      .map(row => {
        const obj = {};
        hdrs.forEach((h, i) => obj[h] = String(row[i] ?? "").trim());
        return obj;
      });
    setHeaders(hdrs);
    setParsedRows(rows);
    setMapping(autoDetect(hdrs));
    setParseError("");
    setStep("map");
  };

  // ── CSV parser (handles quoted fields)
  const parseCSVText = (text) => {
    const lines = text.trim().split(/\r?\n/);
    const parseRow = (line) => {
      const cells = [];
      let cur = "", inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      cells.push(cur.trim());
      return cells;
    };
    return lines.map(parseRow);
  };

  // ── Excel/XLS parser
  const parseExcel = async (file) => {
    try {
      setLoading(true);
      const XLSX = await import("xlsx");
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true, raw: false });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      setSelectedSheet(0);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false, dateNF: "dd/mm/yyyy" });
      setLoading(false);
      processRows(data);
    } catch (e) {
      setLoading(false);
      setParseError("Could not read Excel file: " + e.message);
    }
  };

  const switchSheet = async (idx) => {
    if (!workbook) return;
    const XLSX = await import("xlsx");
    setSelectedSheet(idx);
    const ws = workbook.Sheets[workbook.SheetNames[idx]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false, dateNF: "dd/mm/yyyy" });
    processRows(data);
  };

  // ── PDF parser — routes to bank-specific or generic
  const parsePDF = async (file) => {
    try {
      setLoading(true);
      setParseError("");

      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

      // Read first page text to detect bank
      const p1 = await pdf.getPage(1);
      const p1content = await p1.getTextContent();
      const p1text = p1content.items.map(i => i.str).join(" ");
      const bank = detectBank(p1text);
      setDetectedBank(bank);

      let transactions = [];

      if (bank === "axis") {
        transactions = await parseAxisPDF(pdf);
      } else if (bank === "hdfc") {
        transactions = await parseHdfcPDF(pdf);
      } else {
        // Try generic, fall back to manual mapping
        const result = await parseGenericPDF(pdf);
        if (result && result.length > 0) {
          transactions = result;
        } else {
          setLoading(false);
          setParseError("Could not auto-detect bank format. Try exporting as CSV or Excel instead.");
          return;
        }
      }

      setLoading(false);

      if (!transactions.length) {
        setParseError(`No transactions found in PDF. Bank detected: ${bank}. Ensure this is a transaction statement (not a summary page).`);
        return;
      }

      // Skip mapping step for auto-parsed PDFs — go straight to preview
      setAutoParsed(transactions);
      const previewRows = transactions.map(tx => ({
        ...tx,
        category: autoCategorize(tx.description, tx.type) || defaultCategory,
        bank_name: importBank,
      }));
      setPreview(previewRows);
      setStep("preview");
    } catch (e) {
      setLoading(false);
      setParseError("Could not read PDF: " + e.message);
      console.error(e);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    setParseError("");
    setStep("upload");
    setParsedRows([]);
    setHeaders([]);
    setAutoParsed(null);
    setDateFormat("auto");
    setImportBank("");
    setFileInfo({ name: file.name, type: file.type });
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv" || file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => processRows(parseCSVText(e.target.result));
      reader.readAsText(file);
    } else if (["xlsx","xls","xlsb","ods"].includes(ext)) {
      parseExcel(file);
    } else if (ext === "pdf" || file.type === "application/pdf") {
      parsePDF(file);
    } else {
      setParseError(`Unsupported file ".${ext}". Use CSV, Excel, or PDF.`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ── Build preview from manual column mapping (CSV/Excel path)
  const buildPreview = () => {
    const rows = parsedRows.map(row => {
      let amount = 0, type = defaultType;
      if (splitMode && (mapping.withdrawal || mapping.deposit)) {
        const w = cleanAmount(row[mapping.withdrawal]);
        const d = cleanAmount(row[mapping.deposit]);
        if (w > 0) { amount = w; type = "Debit"; }
        else if (d > 0) { amount = d; type = "Credit"; }
        else return null;
      } else {
        amount = Math.abs(cleanAmount(row[mapping.amount]));
        if (!amount) return null;
        if (mapping.type && row[mapping.type]) {
          type = /cr|credit|\bin\b/i.test(row[mapping.type]) ? "Credit" : "Debit";
        }
      }
      const rawDate = row[mapping.date] || "";
      const date = parseDateWithFormat(rawDate, dateFormat);
      if (!date) return null;
      const desc = row[mapping.description] || "";
      const autocat = autoCategorize(desc, type);
      return { date, amount, type, description: desc, category: autocat || defaultCategory, bank_name: importBank };
    }).filter(Boolean);
    setPreview(rows);
    setStep("preview");
  };

  const handleImport = async () => {
    const token = getToken();
    setLoading(true);
    try {
      for (const row of preview) {
        // eslint-disable-next-line no-unused-vars
        const { _rawDate, ...cleanRow } = row;
        await fetch("/api/entertransaction", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(cleanRow),
        });
      }
      onSuccess(preview.length);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const FileIcon = ({ name }) => {
    const ext = (name || "").split(".").pop().toLowerCase();
    if (ext === "pdf") return <span style={{ fontSize: 28 }}>📕</span>;
    if (["xlsx","xls","ods"].includes(ext)) return <span style={{ fontSize: 28 }}>📗</span>;
    return <span style={{ fontSize: 28 }}>📄</span>;
  };

  const bankLabel = { axis: "Axis Bank", hdfc: "HDFC Bank", sbi: "SBI", icici: "ICICI", generic: "Bank" };

  return (
    <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="form-modal form-modal-wide">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step !== "upload" && (
              <button className="btn-ghost" onClick={() => {
                if (autoParsed && step === "preview") { setStep("upload"); setAutoParsed(null); }
                else setStep(step === "preview" ? "map" : "upload");
              }}>←</button>
            )}
            <span className="modal-title">Import Bank Statement</span>
            {detectedBank && step !== "upload" && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(90,130,225,0.15)", color: "#7099f0" }}>
                {bankLabel[detectedBank] || detectedBank}
              </span>
            )}
          </div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Step indicator — hide "Map Columns" for auto-parsed PDFs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
          {(autoParsed ? ["Upload File", "Preview & Import"] : ["Upload File", "Map Columns", "Preview & Import"]).map((s, i) => {
            const stepKey = autoParsed ? ["upload","preview"][i] : ["upload","map","preview"][i];
            const done = STEPS.indexOf(step) > STEPS.indexOf(stepKey);
            const active = step === stepKey;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                  background: done || active ? "var(--accent)" : "var(--bg-card)",
                  color: done || active ? "white" : "var(--text-muted)",
                  transition: "all 0.2s",
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 12, color: active ? "azure" : "var(--text-muted)" }}>{s}</span>
                {i < (autoParsed ? 1 : 2) && <span style={{ color: "#333", margin: "0 2px" }}>›</span>}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Upload ── */}
        {step === "upload" && (
          <>
            <div
              className={`import-dropzone ${dragging ? "drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("bank-file-input").click()}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>{loading ? "⏳" : "📂"}</div>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>
                {loading ? "Parsing file…" : "Drop your bank statement here"}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>or click to browse</p>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "CSV", color: "rgba(74,222,128,0.15)", text: "#4ade80" },
                  { label: "XLSX / XLS", color: "rgba(90,130,225,0.15)", text: "#7099f0" },
                  { label: "PDF", color: "rgba(248,113,113,0.15)", text: "#f87171" },
                ].map(({ label, color, text }) => (
                  <span key={label} style={{ background: color, color: text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{label}</span>
                ))}
              </div>
              <input id="bank-file-input" type="file" accept=".csv,.xlsx,.xls,.xlsb,.ods,.pdf"
                style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            </div>

            {parseError && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, fontSize: 13, color: "#f87171" }}>
                ⚠ {parseError}
              </div>
            )}

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { icon: "📄", fmt: "CSV", tip: "Universal format — works with all banks. Download from internet banking." },
                { icon: "📗", fmt: "Excel (.xlsx / .xls)", tip: "HDFC, ICICI and most portals. Multi-sheet supported. Skips header rows automatically." },
                { icon: "📕", fmt: "PDF (Auto)", tip: "Axis Bank & HDFC Bank fully supported — auto-parsed, no column mapping needed. Other banks use generic parser." },
              ].map(({ icon, fmt, tip }) => (
                <div key={fmt} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{fmt}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{tip}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── STEP 2: Map Columns (CSV/Excel only) ── */}
        {step === "map" && !autoParsed && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              {fileInfo && <FileIcon name={fileInfo.name} />}
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{fileInfo?.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {parsedRows.length} rows · {headers.length} columns
                  {splitMode && <span style={{ marginLeft: 8, color: "#7099f0", fontWeight: 600 }}>· Split Withdrawal/Deposit mode</span>}
                </p>
              </div>
            </div>

            {sheetNames.length > 1 && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Sheet</label>
                <select className="form-select" value={selectedSheet} onChange={e => switchSheet(Number(e.target.value))}>
                  {sheetNames.map((n, i) => <option key={i} value={i}>{n}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <input type="checkbox" id="splitmode" checked={splitMode} onChange={e => setSplitMode(e.target.checked)} style={{ width: 15, height: 15 }} />
              <label htmlFor="splitmode" style={{ fontSize: 13, cursor: "pointer" }}>
                <strong>Split Withdrawal/Deposit mode</strong>
                <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>— separate debit/credit columns (Axis, HDFC style)</span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Date column *</label>
                <select className="form-select" value={mapping.date} onChange={e => setMapping(p => ({ ...p, date: e.target.value }))}>
                  <option value="">— not mapped —</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                </select>
                {mapping.date && parsedRows[0]?.[mapping.date] && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Sample: {parsedRows[0][mapping.date]}</span>
                )}
              </div>

              {/* ── Date Format Selector ── */}
              <div className="form-group" style={{ gridColumn: "1 / -1", background: "rgba(112,153,240,0.07)", border: "1px solid rgba(112,153,240,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  📅 Date Format in this file
                </label>
                <select className="form-select" value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
                  {DATE_FORMAT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label} — e.g. {o.example}</option>
                  ))}
                </select>
                {mapping.date && parsedRows[0]?.[mapping.date] && (() => {
                  const raw = parsedRows[0][mapping.date];
                  const parsed = parseDateWithFormat(raw, dateFormat);
                  return (
                    <span style={{ fontSize: 11, marginTop: 6, display: "block" }}>
                      Raw: <strong style={{ color: "var(--text-muted)" }}>{raw}</strong>
                      <span style={{ margin: "0 6px", color: "#555" }}>→</span>
                      <strong style={{ color: parsed && parsed !== raw ? "#4ade80" : parsed ? "#aaa" : "#f87171" }}>
                        {parsed || "⚠ Could not parse — try a different format"}
                      </strong>
                    </span>
                  );
                })()}
              </div>

              {splitMode ? (<>
                <div className="form-group">
                  <label className="form-label">Withdrawal / Debit column *</label>
                  <select className="form-select" value={mapping.withdrawal} onChange={e => setMapping(p => ({ ...p, withdrawal: e.target.value }))}>
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                  </select>
                  {mapping.withdrawal && parsedRows[0]?.[mapping.withdrawal] && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Sample: {parsedRows[0][mapping.withdrawal]}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Deposit / Credit column *</label>
                  <select className="form-select" value={mapping.deposit} onChange={e => setMapping(p => ({ ...p, deposit: e.target.value }))}>
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                  </select>
                  {mapping.deposit && parsedRows[0]?.[mapping.deposit] && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Sample: {parsedRows[0][mapping.deposit]}</span>
                  )}
                </div>
              </>) : (<>
                <div className="form-group">
                  <label className="form-label">Amount column *</label>
                  <select className="form-select" value={mapping.amount} onChange={e => setMapping(p => ({ ...p, amount: e.target.value }))}>
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                  </select>
                  {mapping.amount && parsedRows[0]?.[mapping.amount] && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Sample: {parsedRows[0][mapping.amount]}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Type column (Dr/Cr)</label>
                  <select className="form-select" value={mapping.type} onChange={e => setMapping(p => ({ ...p, type: e.target.value }))}>
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                  </select>
                </div>
              </>)}

              <div className="form-group">
                <label className="form-label">Description / Narration</label>
                <select className="form-select" value={mapping.description} onChange={e => setMapping(p => ({ ...p, description: e.target.value }))}>
                  <option value="">— not mapped —</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                </select>
                {mapping.description && parsedRows[0]?.[mapping.description] && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Sample: {parsedRows[0][mapping.description]}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Default Category</label>
                <select className="form-select" value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)}>
                  <option value="">— none —</option>
                  {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">🏦 Bank / Account <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
                <BankSelector value={importBank} onChange={setImportBank}
                  placeholder="Select bank for these transactions…" />
              </div>
            </div>

            {!splitMode && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Default Transaction Type</label>
                <select className="form-select" value={defaultType} onChange={e => setDefaultType(e.target.value)}>
                  <option value="Debit">Debit (Expense)</option>
                  <option value="Credit">Credit (Income)</option>
                </select>
              </div>
            )}

            <details style={{ marginBottom: 4 }}>
              <summary style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer", userSelect: "none" }}>
                Show raw data preview (first 3 rows)
              </summary>
              <div style={{ overflowX: "auto", marginTop: 8, borderRadius: 8, border: "1px solid var(--border)" }}>
                <table style={{ borderCollapse: "collapse", fontSize: 11, whiteSpace: "nowrap" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-card)" }}>
                      {headers.map((h, i) => (
                        <th key={i} style={{ padding: "6px 10px", color: "#555", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h || `Col ${i+1}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 3).map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        {headers.map((h, ci) => (
                          <td key={ci} style={{ padding: "6px 10px", color: "#999", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <div className="form-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={buildPreview}
                disabled={!mapping.date || (!splitMode && !mapping.amount) || (splitMode && !mapping.withdrawal && !mapping.deposit)}>
                Preview →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Preview ── */}
        {step === "preview" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                <strong style={{ color: "azure" }}>{preview.length}</strong> transactions ready to import
                {autoParsed && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: "#7099f0" }}>
                    · Auto-parsed from {bankLabel[detectedBank] || "bank"} PDF
                  </span>
                )}
              </p>
              <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                <span style={{ color: "var(--success)" }}>↑ {preview.filter(r => r.type === "Credit").length} credits</span>
                <span style={{ color: "var(--danger)" }}>↓ {preview.filter(r => r.type === "Debit").length} debits</span>
              </div>
            </div>

            {/* Category override for auto-parsed PDFs */}
            {autoParsed && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Assign Category (optional)</label>
                  <select className="form-select" value={defaultCategory}
                    onChange={e => {
                      setDefaultCategory(e.target.value);
                      // Re-apply: auto-categorized rows keep their category; others get the fallback
                      setPreview(prev => prev.map(r => ({ ...r, category: autoCategorize(r.description, r.type) || e.target.value })));
                    }}>
                    <option value="">— none —</option>
                    {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">🏦 Bank / Account</label>
                  <BankSelector value={importBank} onChange={bank => {
                    setImportBank(bank);
                    setPreview(prev => prev.map(r => ({ ...r, bank_name: bank })));
                  }} placeholder="Select bank for these transactions…" />
                </div>
                <div className="form-group" style={{ marginBottom: 0, background: "rgba(112,153,240,0.07)", border: "1px solid rgba(112,153,240,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                  <label className="form-label" style={{ marginBottom: 6 }}>📅 Date Format in PDF</label>
                  <select className="form-select" value={dateFormat}
                    onChange={e => {
                      const fmt = e.target.value;
                      setDateFormat(fmt);
                      // Re-parse all dates from autoParsed raw dates using the new format
                      setPreview(prev => prev.map((r, i) => {
                        const rawDate = autoParsed[i]?._rawDate || r.date;
                        const reparsed = parseDateWithFormat(rawDate, fmt);
                        return { ...r, date: reparsed || r.date };
                      }));
                    }}>
                    {DATE_FORMAT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {preview[0]?.date && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                      First date: <strong style={{ color: "#4ade80" }}>{preview[0].date}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {(() => {
              const autoCatCount = preview.filter(r => autoCategorize(r.description, r.type) !== null).length;
              const uncatCount = preview.filter(r => !r.category).length;
              return autoCatCount > 0 ? (
                <div style={{ fontSize: 12, padding: "7px 12px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, marginBottom: 10, color: "#22c55e", fontWeight: 500 }}>
                  Auto-categorized {autoCatCount} of {preview.length} transactions
                  {uncatCount > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {uncatCount} still need a category — use the dropdown above</span>}
                </div>
              ) : null;
            })()}
            <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--bg-card)" }}>
                    {["DATE", "TYPE", "AMOUNT", "DESCRIPTION", "CATEGORY"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#555", fontWeight: 600, position: "sticky", top: 0, background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "8px 12px", color: "#bbb", fontFamily: "DM Mono, monospace", fontSize: 11 }}>{row.date}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span className={`badge badge-${row.type?.toLowerCase()}`}>{row.type}</span>
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "DM Mono, monospace", fontWeight: 600, color: row.type === "Credit" ? "var(--success)" : "var(--danger)" }}>
                        ₹{(row.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "8px 12px", color: "#999", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.description}>{row.description || "—"}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11 }}>
                        {row.category ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ color: "var(--text-primary)" }}>{row.category}</span>
                            {autoCategorize(row.description, row.type) === row.category && (
                              <span style={{ fontSize: 9, fontWeight: 600, background: "rgba(34,197,94,0.15)", color: "#22c55e", padding: "1px 5px", borderRadius: 4, letterSpacing: "0.3px" }}>AUTO</span>
                            )}
                          </span>
                        ) : <span style={{ color: "#666" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleImport} disabled={loading || preview.length === 0}>
                {loading ? "Importing…" : `Import ${preview.length} transactions`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
// ─── India bank list (RBI scheduled + payments + small finance) ───────────
const INDIA_BANKS = [
  "Abhyudaya Bank","ANZ Bank","AU Small Finance Bank","Airtel Payments Bank",
  "American Express Bank","Axis Bank","BNP Paribas","Bandhan Bank",
  "Bank of Baroda","Bank of India","Bank of Maharashtra","Barclays Bank",
  "CSB Bank","Canara Bank","Capital Small Finance Bank","Central Bank of India",
  "Citibank","City Union Bank","DBS Bank","DCB Bank","Deutsche Bank",
  "Dhanlaxmi Bank","ESAF Small Finance Bank","Equitas Small Finance Bank",
  "Federal Bank","Fino Payments Bank","HDFC Bank","HSBC Bank",
  "ICICI Bank","IDBI Bank","IDFC First Bank","India Post Payments Bank",
  "Indian Bank","Indian Overseas Bank","IndusInd Bank","JP Morgan Chase Bank",
  "Jammu & Kashmir Bank","Jana Small Finance Bank","Jio Payments Bank",
  "Karnataka Bank","Karur Vysya Bank","Kotak Mahindra Bank",
  "NSDL Payments Bank","Nainital Bank","North East Small Finance Bank",
  "Paytm Payments Bank","Punjab National Bank","Punjab and Sind Bank",
  "RBL Bank","Saraswat Bank","Shivalik Small Finance Bank","South Indian Bank",
  "Standard Chartered Bank","State Bank of India","Suryoday Small Finance Bank",
  "TJSB Sahakari Bank","Tamilnad Mercantile Bank","UCO Bank",
  "Ujjivan Small Finance Bank","Union Bank of India","Unity Small Finance Bank",
  "Utkarsh Small Finance Bank","Yes Bank",
];

// Searchable bank selector component
function BankSelector({ value, onChange, placeholder = "Select or type bank name…" }) {
  const [query, setQuery] = React.useState(value || "");
  const [open, setOpen] = React.useState(false);

  const filtered = query.length < 1
    ? INDIA_BANKS
    : INDIA_BANKS.filter(b => b.toLowerCase().includes(query.toLowerCase()));

  const select = (bank) => {
    setQuery(bank);
    onChange(bank);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        className="form-input"
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
          background: "var(--bg-primary)", border: "1px solid var(--border)",
          borderRadius: 8, maxHeight: 200, overflowY: "auto", marginTop: 2,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}>
          {filtered.map(b => (
            <div key={b}
              onMouseDown={() => select(b)}
              style={{
                padding: "8px 12px", fontSize: 13, cursor: "pointer",
                color: "var(--text-primary)",
                background: b === query ? "var(--bg-secondary)" : "transparent",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"}
              onMouseLeave={e => e.currentTarget.style.background = b === query ? "var(--bg-secondary)" : "transparent"}
            >
              {b}
            </div>
          ))}
          {query && !INDIA_BANKS.find(b => b.toLowerCase() === query.toLowerCase()) && (
            <div
              onMouseDown={() => select(query)}
              style={{
                padding: "8px 12px", fontSize: 13, cursor: "pointer",
                color: "var(--text-muted)", borderTop: "1px solid var(--border)",
              }}
            >
              Use "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Main Transfers Component ─────────────────────────────────
export default function Transfers(props) {
  const hasFetchedData = useRef(false);
  const [markdown, setMarkdown] = useState("Fetching AI insights…");
  const [aiExpanded, setAiExpanded] = useState(false);
  const [modal, setModal] = useState(null); // null | "add" | "bulk" | "import"
  // Inline edit state
  const [inlineEdit, setInlineEdit] = useState(null); // transid being edited
  const [inlineForm, setInlineForm] = useState({});   // draft values
  // Bulk delete state
  const [selected, setSelected] = useState(new Set()); // selected transids

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const getdata = () => {
    const token = getToken();
    if (!token) return;
    const endpoints = [
      { url: "/api/transactions", setState: props.settrans },
      { url: "/api/creditdebit", setState: props.setcreditdebit },
      { url: "/api/cattotal", setState: props.setCatamount },
      { url: "/api/transtable", setState: props.setTranstable },
    ];
    endpoints.forEach(({ url, setState }) => {
      fetch(url, { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json()).then(setState).catch(console.error);
    });
  };

  // AI is loaded lazily on first expand of the AI Insights panel

  // ── filtered & sorted data
  const displayed = useMemo(() => {
    let data = [...(props.trans || [])];
    if (filterType !== "all") data = data.filter(t => t.type === filterType);
    if (filterCategory !== "all") data = data.filter(t => t.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(t =>
        String(t.transid).includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q) ||
        String(t.amount).includes(q) ||
        (t.date || "").includes(q)
      );
    }
    data.sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (sortField === "amount") {
        av = parseFloat(av); bv = parseFloat(bv);
      } else if (sortField === "date") {
        // Dates are stored as YYYY-MM-DD — lexicographic sort is chronologically correct
        av = av || ""; bv = bv || "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [props.trans, search, filterType, filterCategory, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const pageData = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.2, fontSize: 10 }}> ↕</span>;
    return <span style={{ fontSize: 10, color: "var(--accent)" }}> {sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  // ── submit handlers
  const handleAdd = async (e) => {
    e.preventDefault();
    const token = getToken();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/entertransaction", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const { success } = await res.json();
    if (success) { getdata(); setModal(null); showToast("Transaction added"); }
    else showToast("Failed to add transaction", "error");
  };

  // Inline edit: save changed row
  const handleInlineSave = async (transid) => {
    const token = getToken();
    const body = { ...inlineForm, id: transid };
    const res = await fetch("/api/edittransaction", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const { success } = await res.json();
    if (success) { getdata(); setInlineEdit(null); setInlineForm({}); showToast("Transaction updated"); }
    else showToast("Failed to update", "error");
  };

  // Open inline edit — populate form from the row data directly (no extra API call)
  const openInlineEdit = (item) => {
    setInlineEdit(item.transid);
    setInlineForm({
      type: item.type,
      category: item.category,
      description: item.description || "",
      date: item.date,
      amount: item.amount,
      bank_name: item.bank_name || "",
    });
  };

  const handleDelete = async (transid) => {
    if (!confirm("Delete this transaction?")) return;
    const token = getToken();
    const res = await fetch("/api/deletetransaction", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: transid }),
    });
    const { success } = await res.json();
    if (success) { getdata(); showToast("Transaction deleted"); }
    else showToast("Failed to delete", "error");
  };

  // Bulk delete selected transactions
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected transaction${selected.size > 1 ? "s" : ""}?`)) return;
    const token = getToken();
    let deleted = 0;
    for (const transid of selected) {
      const res = await fetch("/api/deletetransaction", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: transid }),
      });
      const { success } = await res.json();
      if (success) deleted++;
    }
    setSelected(new Set());
    getdata();
    showToast(`Deleted ${deleted} transaction${deleted > 1 ? "s" : ""}`);
  };

  // Select all visible (current page)
  const toggleSelectAll = () => {
    if (pageData.every(r => selected.has(r.transid))) {
      setSelected(prev => { const n = new Set(prev); pageData.forEach(r => n.delete(r.transid)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); pageData.forEach(r => n.add(r.transid)); return n; });
    }
  };

  const uniqueCategories = useMemo(() => [...new Set((props.cate || []).map(c => c.name))], [props.cate]);

  return (
    <div className="transdiv">
      {/* Header */}
      <div className="trans-header">
        <h1 className="page-title">Transfers</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {selected.size > 0 && (
            <button className="btn-secondary" style={{ color: "var(--danger)", borderColor: "var(--danger)", fontSize: 13 }}
              onClick={handleBulkDelete}>
              🗑 Delete {selected.size} selected
            </button>
          )}
          <button className="btn-secondary" onClick={() => setModal("import")}>
            <span>📥</span> Import
          </button>
          <button className="btn-secondary" onClick={() => setModal("bulk")}>
            <span>⊞</span> Bulk Entry
          </button>
          <button className="btn-primary" onClick={() => setModal("add")}>
            + Add
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="search-filter-bar">
        <div className="search-wrapper">
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input className="search-input" type="text" placeholder="Search by description, category, amount…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="filter-select" value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}>
          <option value="all">All types</option>
          <option value="Debit">Debit</option>
          <option value="Credit">Credit</option>
        </select>
        <select className="filter-select" value={filterCategory}
          onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
          <option value="all">All categories</option>
          {uniqueCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
        {(search || filterType !== "all" || filterCategory !== "all") && (
          <button className="btn-secondary" style={{ fontSize: 12, padding: "8px 10px" }}
            onClick={() => { setSearch(""); setFilterType("all"); setFilterCategory("all"); setPage(1); }}>
            Clear filters
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
          {displayed.length} result{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="tableenclosure">
        {displayed.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📊</div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No transactions found</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>Try adjusting your filters or add a new transaction</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="th thsticky" style={{ width: 36, textAlign: "center" }}>
                  <input type="checkbox"
                    checked={pageData.length > 0 && pageData.every(r => selected.has(r.transid))}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: "var(--accent)" }}
                    title="Select all on this page"
                  />
                </th>
                <th className="th thsticky" style={{ width: 56, cursor: "pointer" }} onClick={() => toggleSort("transid")}>
                  ID<SortIcon field="transid" />
                </th>
                <th className="th thsticky" style={{ cursor: "pointer" }} onClick={() => toggleSort("type")}>
                  TYPE<SortIcon field="type" />
                </th>
                <th className="th thsticky" style={{ cursor: "pointer" }} onClick={() => toggleSort("category")}>
                  CATEGORY<SortIcon field="category" />
                </th>
                <th className="th thsticky">DESCRIPTION</th>
                <th className="th thsticky" style={{ cursor: "pointer" }} onClick={() => toggleSort("amount")}>
                  AMOUNT<SortIcon field="amount" />
                </th>
                <th className="th thsticky" style={{ cursor: "pointer" }} onClick={() => toggleSort("date")}>
                  DATE<SortIcon field="date" />
                </th>
                <th className="th thsticky" style={{ cursor: "pointer" }} onClick={() => toggleSort("bank_name")}>
                  BANK<SortIcon field="bank_name" />
                </th>
                <th className="th thsticky" style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((item, i) => {
                const isEditing = inlineEdit === item.transid;
                const isSelected = selected.has(item.transid);
                const editingType = isEditing ? (inlineForm.type || item.type) : item.type;
                return (
                  <tr key={i} style={{ background: isSelected ? "rgba(99,153,34,0.06)" : isEditing ? "var(--bg-secondary)" : "" }}>
                    {/* Checkbox */}
                    <td className="th" style={{ textAlign: "center", width: 36 }}>
                      <input type="checkbox" checked={isSelected}
                        onChange={() => setSelected(prev => {
                          const n = new Set(prev);
                          n.has(item.transid) ? n.delete(item.transid) : n.add(item.transid);
                          return n;
                        })}
                        style={{ cursor: "pointer", accentColor: "var(--accent)" }}
                      />
                    </td>
                    {/* ID */}
                    <td className="th" style={{ color: "#555", fontFamily: "DM Mono, monospace", fontSize: 11 }}>
                      #{item.transid}
                    </td>
                    {/* Type */}
                    <td className="th">
                      {isEditing ? (
                        <select className="bulk-select" value={inlineForm.type}
                          onChange={e => setInlineForm(f => ({ ...f, type: e.target.value, category: "" }))}
                          style={{ fontSize: 12, padding: "3px 6px", height: 28 }}>
                          <option value="Debit">Debit</option>
                          <option value="Credit">Credit</option>
                        </select>
                      ) : (
                        <span className={`badge badge-${item.type?.toLowerCase()}`}>{item.type}</span>
                      )}
                    </td>
                    {/* Category */}
                    <td className="th" style={{ color: "#ccc" }}>
                      {isEditing ? (
                        <select className="bulk-select" value={inlineForm.category}
                          onChange={e => setInlineForm(f => ({ ...f, category: e.target.value }))}
                          style={{ fontSize: 12, padding: "3px 6px", height: 28, minWidth: 110 }}>
                          <option value="">— select —</option>
                          {(props.cate || []).filter(c => c.type === editingType).map((c, ci) => (
                            <option key={ci} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      ) : item.category}
                    </td>
                    {/* Description */}
                    <td className="th">
                      {isEditing ? (
                        <input className="bulk-input" type="text" value={inlineForm.description}
                          onChange={e => setInlineForm(f => ({ ...f, description: e.target.value }))}
                          style={{ fontSize: 12, padding: "3px 6px", height: 28, minWidth: 160 }}
                          placeholder="Description…"
                        />
                      ) : (
                        <div className="cell-container" title={item.description}>{item.description || "—"}</div>
                      )}
                    </td>
                    {/* Amount */}
                    <td className="th amount-cell" style={{ color: item.type === "Credit" ? "var(--success)" : "var(--danger)" }}>
                      {isEditing ? (
                        <input className="bulk-input" type="number" min="0" step="0.01" value={inlineForm.amount}
                          onChange={e => setInlineForm(f => ({ ...f, amount: e.target.value }))}
                          style={{ fontSize: 12, padding: "3px 6px", height: 28, width: 90 }}
                        />
                      ) : `₹${parseFloat(item.amount || 0).toFixed(2)}`}
                    </td>
                    {/* Date */}
                    <td className="th" style={{ color: "#999", fontFamily: "DM Mono, monospace", fontSize: 12 }}>
                      {isEditing ? (
                        <input className="bulk-input" type="date" value={inlineForm.date}
                          onChange={e => setInlineForm(f => ({ ...f, date: e.target.value }))}
                          style={{ fontSize: 12, padding: "3px 6px", height: 28 }}
                        />
                      ) : item.date}
                    </td>
                    {/* Bank */}
                    <td className="th" style={{ color: "#666", fontSize: 12, maxWidth: 120 }}>
                      {isEditing ? (
                        <BankSelector
                          value={inlineForm.bank_name || ""}
                          onChange={bank => setInlineForm(f => ({ ...f, bank_name: bank }))}
                          placeholder="Bank…"
                        />
                      ) : (
                        <span title={item.bank_name} style={{
                          display: "block", overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap", maxWidth: 110,
                          color: item.bank_name ? "var(--text-primary)" : "var(--text-muted)",
                          fontSize: 11,
                        }}>
                          {item.bank_name || "—"}
                        </span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="th">
                      <div className="editbutton">
                        {isEditing ? (
                          <>
                            <button className="btn-ghost" title="Save" style={{ color: "var(--success)" }}
                              onClick={() => handleInlineSave(item.transid)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </button>
                            <button className="btn-ghost" title="Cancel"
                              onClick={() => { setInlineEdit(null); setInlineForm({}); }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn-ghost" title="Edit" onClick={() => openInlineEdit(item)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="btn-ghost btn-danger-ghost" title="Delete" onClick={() => handleDelete(item.transid)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayed.length)} of {displayed.length}
            {selected.size > 0 && <span style={{ marginLeft: 10, color: "var(--accent)", fontWeight: 500 }}>{selected.size} selected</span>}
          </span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page - 2 + i;
              if (pg < 1 || pg > totalPages) return null;
              return (
                <button key={pg} className={`page-btn ${pg === page ? "active" : ""}`}
                  onClick={() => setPage(pg)}>{pg}</button>
              );
            })}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      {/* AI Insights — collapsed by default, click header to expand */}
      <div className="aigen-section">
        <div className={`aigen-card${aiExpanded ? " aigen-expanded" : ""}`}>
          <div className="aigen-header" onClick={() => {
            setAiExpanded(e => {
              // On first expand, trigger fetch if still showing placeholder
              if (!e && markdown === "Fetching AI insights…") {
                const token = getToken();
                setMarkdown("⏳ Analysing your transactions…");
                fetch("/api/ai", { method: "GET", headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Ollama-Url":   localStorage.getItem("ollama_url")   || "http://localhost:11434",
                    "X-Ollama-Model": localStorage.getItem("ollama_model") || "llama3.2",
                  } })
                  .then(async r => {
                    const text = await r.text();
                    let d;
                    try { d = JSON.parse(text); } catch { d = text; }
                    if (typeof d === "object" && d !== null && d.error) setMarkdown("⚠️ " + d.error);
                    else if (typeof d === "string" && d.trim()) setMarkdown(d);
                    else setMarkdown("⚠️ Empty response. Check Settings → AI / Ollama.");
                  })
                  .catch(() => setMarkdown("⚠️ Could not reach Ollama."));
              }
              return !e;
            });
          }}>
            <span className="aigen-title">✦ AI Insights</span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {aiExpanded && (
                <button className="btn-ghost" style={{ fontSize:11, width:"auto", padding:"3px 9px" }}
                  onClick={e => {
                    e.stopPropagation();
                    const token = getToken();
                    setMarkdown("⏳ Analysing your transactions…");
                    fetch("/api/ai", { method: "GET", headers: {
                        Authorization: `Bearer ${token}`,
                        "X-Ollama-Url":   localStorage.getItem("ollama_url")   || "http://localhost:11434",
                        "X-Ollama-Model": localStorage.getItem("ollama_model") || "llama3.2",
                      } })
                      .then(async r => {
                        const text = await r.text();
                        let d;
                        try { d = JSON.parse(text); } catch { d = text; }
                        if (typeof d === "object" && d !== null && d.error) setMarkdown("⚠️ " + d.error);
                        else if (typeof d === "string" && d.trim()) setMarkdown(d);
                        else setMarkdown("⚠️ Empty response. Check Settings → AI / Ollama.");
                      })
                      .catch(() => setMarkdown("⚠️ Could not reach Ollama."));
                  }}>↺ Refresh</button>
              )}
              <span className="aigen-chevron">▼</span>
            </div>
          </div>
          <div className="aigenerated">
            <div><ReactMarkdown>{markdown}</ReactMarkdown></div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === "add" && (
        <TransactionForm title="Add Transaction" categories={props.cate || []}
          onSubmit={handleAdd} onClose={() => setModal(null)} />
      )}
      {modal === "edit" && editData && (
        {/* Edit is now inline — this modal case is no longer used */}
      )}
      {modal === "bulk" && (
        <BulkForm categories={props.cate || []} onClose={() => setModal(null)}
          onSuccess={(n) => { getdata(); setModal(null); showToast(`${n} transactions added`); }} />
      )}
      {modal === "import" && (
        <ImportModal categories={props.cate || []} onClose={() => setModal(null)}
          onSuccess={(n) => { getdata(); setModal(null); showToast(`${n} transactions imported`); }} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}