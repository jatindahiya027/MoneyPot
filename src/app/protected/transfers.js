"use client";
import { getToken } from "@/libs/clientToken";
import { useModalFocus } from "@/hooks/useModalFocus";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { AlertTriangle, ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, BarChart3, Building2, Check, Edit3, File, FileSpreadsheet, FileText, FolderOpen, Loader2, Search, TableCellsSplit, Trash2, X } from "lucide-react";
import DatePicker from "@/components/ui/date-picker";
import { AnimatePresence, easeOut, motion } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { hasSignedAmounts, inferImportedTransactionType, parseStatementAmount } from "@/lib/importTransactionType.mjs";
import { parseCSVText } from "@/lib/csv.mjs";
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
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      <span>{type === "success" ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}</span>
      {message}
    </div>
  );
}

// ─── Single Transaction Form ──────────────────────────────────
function TransactionForm({ onSubmit, onClose, initialData, categories, title }) {
  const modalRef = useModalFocus(onClose);
  const [selectedType, setSelectedType] = useState(initialData?.type || "Debit");
  const [bankName, setBankName] = useState(() => initialData?.bank_name || (typeof window !== "undefined" ? localStorage.getItem("moneypot_default_bank") : "") || "");

  return (
    <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={modalRef} tabIndex={-1} className="form-modal transaction-workflow" role="dialog" aria-modal="true" aria-labelledby="transaction-form-title">
        <div className="transaction-workflow-header">
          <div>
            <h2 className="modal-title" id="transaction-form-title">{title}</h2>
            <p>{initialData ? "Update the transaction details below." : "Record one debit, credit, or investment."}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close transaction form"><X aria-hidden="true" /></Button>
        </div>
        <form className="transaction-workflow-form" onSubmit={onSubmit}>
          <input type="hidden" name="id" value={initialData?.transid || ""} />
          <div className="transaction-workflow-body transaction-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="transaction-type">Type</label>
              <select className="form-select" id="transaction-type" name="type" value={selectedType}
                onChange={e => setSelectedType(e.target.value)}>
                <option value="Debit">Debit</option>
                <option value="Credit">Credit</option>
                <option value="Investment">Investment</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="transaction-category">Category</label>
              <select className="form-select" id="transaction-category" name="category" defaultValue={initialData?.category || ""}>
                {categories.filter(c => c.type === selectedType).map((c, i) => (
                  <option key={i} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="transaction-date">Date</label>
              <DatePicker id="transaction-date" ariaLabel="Transaction date" className="form-input" name="date"
                defaultValue={initialData?.date || new Date().toISOString().split("T")[0]} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="transaction-amount">Amount (₹)</label>
              <input className="form-input" id="transaction-amount" type="number" name="amount" min="0" step="0.01"
                placeholder="0.00" defaultValue={initialData?.amount != null ? Math.abs(Number(initialData.amount)) : ""} />
            </div>
          <div className="form-group transaction-field-wide">
            <label className="form-label" htmlFor="transaction-description">Description</label>
            <textarea className="form-textarea" id="transaction-description" name="description" rows={3} maxLength={300}
              placeholder="Optional description…" defaultValue={initialData?.description || ""} />
          </div>
          <div className="form-group transaction-field-wide">
            <label className="form-label" htmlFor="transaction-bank">Bank / Account</label>
            <input type="hidden" name="bank_name" value={bankName} />
            <BankSelector inputId="transaction-bank" value={bankName} onChange={setBankName} placeholder="Select or type bank name…" />
          </div>
          </div>
          <div className="transaction-workflow-actions">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">
              {initialData ? "Save changes" : "Add transaction"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Bulk Entry Form ──────────────────────────────────────────
function BulkForm({ onClose, onSuccess, categories }) {
  const modalRef = useModalFocus(onClose);
  const nextRowId = useRef(0);
  const emptyRow = () => ({ rowId: ++nextRowId.current, type: "Debit", category: "", description: "", date: new Date().toISOString().split("T")[0], amount: "", bank_name: "" });
  const [rows, setRows] = useState(() => [emptyRow(), emptyRow(), emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [globalBank, setGlobalBank] = useState(() => typeof window !== "undefined" ? localStorage.getItem("moneypot_default_bank") || "" : "");

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
      type: r.type,
      category: r.category,
      description: r.description,
      date: normalizeBulkDate(r.date),
      amount: r.amount,
      bank_name: r.bank_name,
    }));
    if (!validRows.length) return;
    setBulkError("");
    setLoading(true);
    try {
      // Single batched request instead of N sequential fetches
      const res = await fetch("/api/bulktransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const detail = data.errors?.slice(0, 3).map(item => `Row ${item.row}: ${item.error}`).join(" ");
        throw new Error(detail || data.error || "Bulk entry failed.");
      }
      onSuccess(data.inserted);
    } catch (error) { setBulkError(error?.message || "Bulk entry failed. No transactions were added."); }
    finally { setLoading(false); }
  };

  return (
    <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={modalRef} tabIndex={-1} className="form-modal form-modal-wide transaction-workflow transaction-workflow-wide" role="dialog" aria-modal="true" aria-labelledby="bulk-entry-title">
        <div className="transaction-workflow-header">
          <div>
            <h2 className="modal-title" id="bulk-entry-title">Bulk entry</h2>
            <p>Add several transactions in one pass. Incomplete rows are ignored.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close bulk entry"><X aria-hidden="true" /></Button>
        </div>
        <div className="transaction-workflow-body bulk-workflow-body">
        {bulkError && <div className="form-error" role="alert">{bulkError}</div>}
        <div className="bulk-defaults">
          <label><Building2 aria-hidden="true" /> Default bank for these rows</label>
          <div className="bulk-default-bank">
            <BankSelector value={globalBank} onChange={applyBankToAll}
              placeholder="Select bank for all rows…" />
          </div>
          <span>You can override it per row.</span>
        </div>
        <div className="bulk-table-wrap">
          <table className="bulk-table">
            <thead>
              <tr>
                <th className="bulk-row-number">#</th><th>Type</th><th>Category</th><th>Date</th>
                <th>Amount (₹)</th><th>Description</th><th>Bank</th><th></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
              {rows.map((row, i) => (
                <motion.tr key={row.rowId} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18, ease: easeOut }}>
                  <td className="bulk-row-number">{i + 1}</td>
                  <td style={{ minWidth: 100 }}>
                    <select className="bulk-select" aria-label={`Type for row ${i + 1}`} value={row.type}
                      onChange={e => updateRow(i, "type", e.target.value)}>
                      <option value="Debit">Debit</option>
                      <option value="Credit">Credit</option>
                      <option value="Investment">Investment</option>
                    </select>
                  </td>
                  <td style={{ minWidth: 130 }}>
                    <select className="bulk-select" aria-label={`Category for row ${i + 1}`} value={row.category}
                      onChange={e => updateRow(i, "category", e.target.value)}>
                      <option value="">— select —</option>
                      {categories.filter(c => c.type === row.type).map((c, ci) => (
                        <option key={ci} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ minWidth: 140 }}>
                    <DatePicker className="bulk-input" ariaLabel={`Date for row ${i + 1}`} value={row.date}
                      onChange={e => updateRow(i, "date", e.target.value)} />
                  </td>
                  <td style={{ minWidth: 110 }}>
                    <input className="bulk-input" aria-label={`Amount for row ${i + 1}`} type="number" min="0" step="0.01"
                      placeholder="0.00" value={row.amount}
                      onChange={e => updateRow(i, "amount", e.target.value)} />
                  </td>
                  <td style={{ minWidth: 180 }}>
                    <input className="bulk-input" aria-label={`Description for row ${i + 1}`} type="text" maxLength={300} placeholder="Description"
                      value={row.description}
                      onChange={e => updateRow(i, "description", e.target.value)} />
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <BankSelector
                      ariaLabel={`Bank for row ${i + 1}`}
                      value={row.bank_name}
                      onChange={bank => updateRow(i, "bank_name", bank)}
                      placeholder="Bank…"
                    />
                  </td>
                  <td style={{ width: 36 }}>
                    <Button type="button" variant="ghost" size="icon" className="btn-danger-ghost" onClick={() => removeRow(i)} aria-label={`Remove row ${i + 1}`}><X aria-hidden="true" /></Button>
                  </td>
                </motion.tr>
              ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <div className="bulk-workflow-tools">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add row</Button>
          <span>{rows.filter(r => r.amount && r.date).length} ready to save</span>
        </div>
        </div>
        <div className="transaction-workflow-actions">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || !rows.some(r => r.amount && r.date)}>
            {loading ? <><Loader2 className="animate-spin" aria-hidden="true" />Saving</> : `Save ${rows.filter(r => r.amount && r.date).length} transactions`}
          </Button>
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
    const p1 = parseInt(d);
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
  return parseStatementAmount(raw);
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
      let withdrawal = 0, deposit = 0;
      const wIdx = colNames.findIndex(c => c.includes("withdraw") || c.includes("debit"));
      const dIdx = colNames.findIndex(c => c.includes("deposit") || c.includes("credit"));
      const aIdx = colNames.findIndex(c => c.includes("amount") && wIdx === -1);
      const tIdx = colNames.findIndex(c => c === "type" || c.includes("dr/cr") || c.includes("transaction type"));
      const descIdx = colNames.findIndex(c => c.includes("narration") || c.includes("description") || c.includes("particulars") || c.includes("transaction"));
      if (wIdx >= 0) withdrawal = cleanAmount(cells[wIdx]);
      if (dIdx >= 0) deposit = cleanAmount(cells[dIdx]);
      const rawAmount = cells[aIdx] || "";
      const description = descIdx >= 0 ? cells[descIdx] : cells[1] || "";
      const amount = Math.abs(withdrawal || deposit || cleanAmount(rawAmount));
      const type = inferImportedTransactionType({
        withdrawal,
        deposit,
        typeValue: tIdx >= 0 ? cells[tIdx] : "",
        amountValue: rawAmount,
        description,
        fallback: "Debit",
      });
      currentTx = {
        date: parseBankDate(col0),
        _rawDate: col0,
        description,
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
  const modalRef = useModalFocus(onClose);
  const categoryFor = (description, type, fallback = "") => {
    const suggested = autoCategorize(description, type);
    const allowed = categories.filter(category => category.type === type);
    return allowed.find(category => category.name === suggested)?.name
      || allowed.find(category => category.name === fallback)?.name
      || allowed[0]?.name
      || "";
  };

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
      type: isSplit ? "" : detect(["transaction type", "type", "dr/cr", "cr/dr", "debit/credit", "credit/debit", "indicator"]),
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
        category: categoryFor(tx.description, tx.type, defaultCategory),
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
    const signedAmountColumn = !splitMode && mapping.amount
      ? hasSignedAmounts(parsedRows.map(row => row[mapping.amount]))
      : false;
    const rows = parsedRows.map(row => {
      let amount = 0, type = defaultType;
      if (splitMode && (mapping.withdrawal || mapping.deposit)) {
        const w = Math.abs(cleanAmount(row[mapping.withdrawal]));
        const d = Math.abs(cleanAmount(row[mapping.deposit]));
        if (w > 0) { amount = w; type = "Debit"; }
        else if (d > 0) { amount = d; type = "Credit"; }
        else return null;
      } else {
        const rawAmount = row[mapping.amount];
        amount = Math.abs(cleanAmount(rawAmount));
        if (!amount) return null;
        type = inferImportedTransactionType({
          typeValue: mapping.type ? row[mapping.type] : "",
          amountValue: rawAmount,
          signedAmountColumn,
          description: mapping.description ? row[mapping.description] : "",
          fallback: defaultType,
        });
      }
      const rawDate = row[mapping.date] || "";
      const date = parseDateWithFormat(rawDate, dateFormat);
      if (!date) return null;
      const desc = row[mapping.description] || "";
      return { date, amount, type, description: desc, category: categoryFor(desc, type, defaultCategory), bank_name: importBank };
    }).filter(Boolean);
    setPreview(rows);
    setStep("preview");
  };

  const handleImport = async () => {
    const token = getToken();
    setLoading(true);
    setParseError("");
    try {
      const rows = preview.map(({ _rawDate, ...row }) => row);
      const response = await fetch("/api/bulktransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        const detail = data.errors?.slice(0, 3).map(item => `Row ${item.row}: ${item.error}`).join(" ");
        throw new Error(detail || data.error || "Import failed.");
      }
      onSuccess(data.inserted);
    } catch (error) {
      setParseError(error?.message || "Import failed. No transactions were added.");
    } finally {
      setLoading(false);
    }
  };

  const FileIcon = ({ name }) => {
    const ext = (name || "").split(".").pop().toLowerCase();
    if (ext === "pdf") return <FileText size={28} color="#f87171" aria-hidden="true" />;
    if (["xlsx","xls","ods"].includes(ext)) return <FileSpreadsheet size={28} color="#4ade80" aria-hidden="true" />;
    return <File size={28} color="var(--text-muted)" aria-hidden="true" />;
  };

  const bankLabel = { axis: "Axis Bank", hdfc: "HDFC Bank", sbi: "SBI", icici: "ICICI", generic: "Bank" };

  return (
    <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={modalRef} tabIndex={-1} className="form-modal form-modal-wide transaction-workflow transaction-workflow-wide import-workflow" role="dialog" aria-modal="true" aria-labelledby="import-statement-title">
        <div className="transaction-workflow-header">
          <div className="import-workflow-title">
            {step !== "upload" && (
              <Button type="button" variant="ghost" size="icon" aria-label="Go to previous import step" onClick={() => {
                if (autoParsed && step === "preview") { setStep("upload"); setAutoParsed(null); }
                else setStep(step === "preview" ? "map" : "upload");
              }}><ArrowLeft aria-hidden="true" /></Button>
            )}
            <div>
              <h2 className="modal-title" id="import-statement-title">Import bank statement</h2>
              <p>Upload, review, and import transactions without changing the source file.</p>
            </div>
            {detectedBank && step !== "upload" && (
              <span className="import-bank-badge">
                {bankLabel[detectedBank] || detectedBank}
              </span>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close statement import"><X aria-hidden="true" /></Button>
        </div>
        <div className="transaction-workflow-body import-workflow-body">

        {/* Step indicator — hide "Map Columns" for auto-parsed PDFs */}
        <div className="transaction-workflow-steps" aria-label="Import progress">
          {(autoParsed ? ["Upload File", "Preview & Import"] : ["Upload File", "Map Columns", "Preview & Import"]).map((s, i) => {
            const stepKey = autoParsed ? ["upload","preview"][i] : ["upload","map","preview"][i];
            const done = STEPS.indexOf(step) > STEPS.indexOf(stepKey);
            const active = step === stepKey;
            return (
              <div className={`transaction-workflow-step${active ? " active" : ""}${done ? " done" : ""}`} key={i}>
                <div>
                  {done ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : i + 1}
                </div>
                <span>{s}</span>
                {i < (autoParsed ? 1 : 2) && <i aria-hidden="true" />}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Upload ── */}
        {step === "upload" && (
          <>
            <div
              className={`import-dropzone ${dragging ? "drag-over" : ""}`}
              role="button"
              tabIndex={0}
              aria-controls="bank-file-input"
              aria-label="Choose or drop a bank statement"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("bank-file-input").click()}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  document.getElementById("bank-file-input").click();
                }
              }}
            >
              <div className="import-dropzone-icon">{loading ? <Loader2 size={40} className="spin-icon" aria-hidden="true" /> : <FolderOpen size={40} aria-hidden="true" />}</div>
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
                <AlertTriangle size={14} aria-hidden="true" /> {parseError}
              </div>
            )}

            <div className="import-format-grid">
              {[
                { Icon: File, fmt: "CSV", tip: "Universal format — works with all banks. Download from internet banking." },
                { Icon: FileSpreadsheet, fmt: "Excel (.xlsx / .xls)", tip: "HDFC, ICICI and most portals. Multi-sheet supported. Skips header rows automatically." },
                { Icon: FileText, fmt: "PDF (Auto)", tip: "Axis Bank & HDFC Bank fully supported — auto-parsed, no column mapping needed. Other banks use generic parser." },
              ].map(({ Icon, fmt, tip }) => (
                <div key={fmt} className="import-format-item">
                  <Icon size={20} style={{ marginBottom: 6 }} aria-hidden="true" />
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
                <label className="form-label" htmlFor="import-sheet">Sheet</label>
                <select className="form-select" id="import-sheet" value={selectedSheet} onChange={e => switchSheet(Number(e.target.value))}>
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
                <label className="form-label" htmlFor="import-date-column">Date column *</label>
                <select className="form-select" id="import-date-column" value={mapping.date} onChange={e => setMapping(p => ({ ...p, date: e.target.value }))}>
                  <option value="">— not mapped —</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                </select>
                {mapping.date && parsedRows[0]?.[mapping.date] && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Sample: {parsedRows[0][mapping.date]}</span>
                )}
              </div>

              {/* ── Date Format Selector ── */}
              <div className="form-group" style={{ gridColumn: "1 / -1", background: "rgba(112,153,240,0.07)", border: "1px solid rgba(112,153,240,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                <label className="form-label" htmlFor="import-date-format" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  📅 Date Format in this file
                </label>
                <select className="form-select" id="import-date-format" value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
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
                      <ArrowRight size={12} style={{ margin: "0 6px", color: "var(--text-muted)", verticalAlign: -2 }} aria-hidden="true" />
                      <strong style={{ color: parsed && parsed !== raw ? "#4ade80" : parsed ? "#aaa" : "#f87171" }}>
                        {parsed || "Could not parse - try a different format"}
                      </strong>
                    </span>
                  );
                })()}
              </div>

              {splitMode ? (<>
                <div className="form-group">
                  <label className="form-label" htmlFor="import-withdrawal-column">Withdrawal / Debit column *</label>
                  <select className="form-select" id="import-withdrawal-column" value={mapping.withdrawal} onChange={e => setMapping(p => ({ ...p, withdrawal: e.target.value }))}>
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                  </select>
                  {mapping.withdrawal && parsedRows[0]?.[mapping.withdrawal] && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Sample: {parsedRows[0][mapping.withdrawal]}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="import-deposit-column">Deposit / Credit column *</label>
                  <select className="form-select" id="import-deposit-column" value={mapping.deposit} onChange={e => setMapping(p => ({ ...p, deposit: e.target.value }))}>
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                  </select>
                  {mapping.deposit && parsedRows[0]?.[mapping.deposit] && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Sample: {parsedRows[0][mapping.deposit]}</span>
                  )}
                </div>
              </>) : (<>
                <div className="form-group">
                  <label className="form-label" htmlFor="import-amount-column">Amount column *</label>
                  <select className="form-select" id="import-amount-column" value={mapping.amount} onChange={e => setMapping(p => ({ ...p, amount: e.target.value }))}>
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                  </select>
                  {mapping.amount && parsedRows[0]?.[mapping.amount] && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Sample: {parsedRows[0][mapping.amount]}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="import-type-column">Type column (Dr/Cr)</label>
                  <select className="form-select" id="import-type-column" value={mapping.type} onChange={e => setMapping(p => ({ ...p, type: e.target.value }))}>
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                  </select>
                </div>
              </>)}

              <div className="form-group">
                <label className="form-label" htmlFor="import-description-column">Description / Narration</label>
                <select className="form-select" id="import-description-column" value={mapping.description} onChange={e => setMapping(p => ({ ...p, description: e.target.value }))}>
                  <option value="">— not mapped —</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h || `Col ${i+1}`}</option>)}
                </select>
                {mapping.description && parsedRows[0]?.[mapping.description] && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Sample: {parsedRows[0][mapping.description]}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="import-default-category">Default Category</label>
                <select className="form-select" id="import-default-category" value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)}>
                  <option value="">— none —</option>
                  {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label" htmlFor="import-bank">Bank / Account <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
                <BankSelector inputId="import-bank" value={importBank} onChange={setImportBank}
                  placeholder="Select bank for these transactions…" />
              </div>
            </div>

            {!splitMode && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="import-default-type">Fallback Transaction Type</label>
                <select className="form-select" id="import-default-type" value={defaultType} onChange={e => setDefaultType(e.target.value)}>
                  <option value="Debit">Debit (Expense)</option>
                  <option value="Credit">Credit (Income)</option>
                  <option value="Investment">Investment</option>
                </select>
                <span style={{ fontSize:11, color:"var(--text-muted)", marginTop:5, display:"block" }}>
                  Used only when Dr/Cr columns, signed amounts, and narration do not identify the type automatically.
                </span>
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
                        <th key={i} style={{ padding: "6px 10px", color: "var(--text-muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h || `Col ${i+1}`}</th>
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

            <div className="form-actions transaction-workflow-actions">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="button" onClick={buildPreview}
                disabled={!mapping.date || (!splitMode && !mapping.amount) || (splitMode && !mapping.withdrawal && !mapping.deposit)}>
                Preview →
              </Button>
            </div>
          </>
        )}

        {/* ── STEP 3: Preview ── */}
        {step === "preview" && (
          <>
            {parseError && (
              <div className="form-error" role="alert" style={{ marginBottom: 12 }}>
                <AlertTriangle size={14} aria-hidden="true" /> {parseError}
              </div>
            )}
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
                <span style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: 3 }}><ArrowUp size={13} aria-hidden="true" /> {preview.filter(r => r.type === "Credit").length} credits</span>
                <span style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 3 }}><ArrowDown size={13} aria-hidden="true" /> {preview.filter(r => r.type === "Debit").length} debits</span>
              </div>
            </div>

            {/* Category override for auto-parsed PDFs */}
            {autoParsed && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="pdf-default-category">Assign Category (optional)</label>
                  <select className="form-select" id="pdf-default-category" value={defaultCategory}
                    onChange={e => {
                      setDefaultCategory(e.target.value);
                      // Re-apply: auto-categorized rows keep their category; others get the fallback
                      setPreview(prev => prev.map(r => ({ ...r, category: categoryFor(r.description, r.type, e.target.value) })));
                    }}>
                    <option value="">— none —</option>
                    {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="pdf-import-bank">Bank / Account</label>
                  <BankSelector inputId="pdf-import-bank" value={importBank} onChange={bank => {
                    setImportBank(bank);
                    setPreview(prev => prev.map(r => ({ ...r, bank_name: bank })));
                  }} placeholder="Select bank for these transactions…" />
                </div>
                <div className="form-group" style={{ marginBottom: 0, background: "rgba(112,153,240,0.07)", border: "1px solid rgba(112,153,240,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                  <label className="form-label" htmlFor="pdf-date-format" style={{ marginBottom: 6 }}>Date format in PDF</label>
                  <select className="form-select" id="pdf-date-format" value={dateFormat}
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
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, position: "sticky", top: 0, background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>{h}</th>
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
                        ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions transaction-workflow-actions">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="button" onClick={handleImport} disabled={loading || preview.length === 0}>
                {loading ? <><Loader2 className="animate-spin" aria-hidden="true" />Importing</> : `Import ${preview.length} transactions`}
              </Button>
            </div>
          </>
        )}
        </div>
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
function BankSelector({ value, onChange, placeholder = "Select or type bank name…", inputId, ariaLabel = "Bank or account" }) {
  const listId = React.useId();
  const configuredBanks = React.useMemo(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("moneypot_banks") || "[]"); } catch { return []; }
  }, []);
  const availableBanks = configuredBanks.length ? configuredBanks : INDIA_BANKS;
  const [query, setQuery] = React.useState(value || (typeof window !== "undefined" ? localStorage.getItem("moneypot_default_bank") : "") || "");
  React.useEffect(() => { if (value !== undefined && value !== query) setQuery(value || ""); }, [value, query]);

  return (
    <div>
      <input
        id={inputId}
        aria-label={inputId ? undefined : ariaLabel}
        className="form-input"
        type="text"
        list={listId}
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
        autoComplete="off"
        maxLength={80}
      />
      <datalist id={listId}>{availableBanks.map(bank => <option key={bank} value={bank} />)}</datalist>
    </div>
  );
}


// ─── Main Transfers Component ─────────────────────────────────
export default function Transfers(props) {
  const [modal, setModal] = useState(null); // null | "add" | "bulk" | "import"
  // Inline edit state
  const [editingIds, setEditingIds] = useState(new Set()); // transids being edited
  const [inlineForms, setInlineForms] = useState({});      // draft values keyed by transid
  const [bulkSaving, setBulkSaving] = useState(false);
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
    fetch("/api/bootstrap", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => {
        props.settrans(data.transactions || []);
        props.setcreditdebit(data.creditdebit || []);
        props.setCatamount(data.catamount || []);
        props.setTranstable(data.transtables || []);
      }).catch(console.error);
  };

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
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.2, marginLeft: 4, verticalAlign: -2 }} aria-hidden="true" />;
    const Icon = sortDir === "asc" ? ArrowUp : ArrowDown;
    return <Icon size={12} color="var(--accent)" style={{ marginLeft: 4, verticalAlign: -2 }} aria-hidden="true" />;
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

  const makeInlineDraft = (item) => ({
    type: item.type,
    category: item.category,
    description: item.description || "",
    date: item.date,
    amount: item.type === "Investment" && /redemption/i.test(item.category || "") ? Math.abs(Number(item.amount)) : item.amount,
    bank_name: item.bank_name || "",
  });

  const updateInlineForm = (transid, updater) => {
    setInlineForms(prev => {
      const current = prev[transid] || {};
      const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      return { ...prev, [transid]: next };
    });
  };

  const closeInlineEdit = (transid) => {
    setEditingIds(prev => {
      const next = new Set(prev);
      next.delete(transid);
      return next;
    });
    setInlineForms(prev => {
      const next = { ...prev };
      delete next[transid];
      return next;
    });
  };

  // Inline edit: save changed row
  const handleInlineSave = async (transid) => {
    const token = getToken();
    const body = { ...(inlineForms[transid] || {}), id: transid };
    const res = await fetch("/api/edittransaction", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    const { success } = data;
    if (success) { getdata(); closeInlineEdit(transid); showToast("Transaction updated"); }
    else showToast(data.user || data.error || "Failed to update", "error");
  };

  // Open inline edit — populate form from the row data directly (no extra API call)
  const openInlineEdit = (item) => {
    setEditingIds(prev => {
      const next = new Set(prev);
      next.add(item.transid);
      return next;
    });
    setInlineForms(prev => ({ ...prev, [item.transid]: makeInlineDraft(item) }));
  };

  const openBulkEdit = () => {
    if (selected.size === 0) return;
    const selectedRows = (props.trans || []).filter(item => selected.has(item.transid));
    setEditingIds(prev => {
      const next = new Set(prev);
      selectedRows.forEach(item => next.add(item.transid));
      return next;
    });
    setInlineForms(prev => {
      const next = { ...prev };
      selectedRows.forEach(item => {
        if (!next[item.transid]) next[item.transid] = makeInlineDraft(item);
      });
      return next;
    });
  };

  const cancelBulkEdit = () => {
    setEditingIds(prev => {
      const next = new Set(prev);
      selected.forEach(transid => next.delete(transid));
      return next;
    });
    setInlineForms(prev => {
      const next = { ...prev };
      selected.forEach(transid => delete next[transid]);
      return next;
    });
  };

  const handleBulkEditSave = async () => {
    const idsToSave = Array.from(selected).filter(transid => editingIds.has(transid));
    if (idsToSave.length === 0) return;
    const token = getToken();
    setBulkSaving(true);
    let saved = 0;
    const failed = new Map();
    try {
      for (const transid of idsToSave) {
        try {
          const res = await fetch("/api/edittransaction", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...(inlineForms[transid] || {}), id: transid }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) saved += 1;
          else failed.set(transid, data.user || data.error || `Update failed (${res.status})`);
        } catch (error) {
          failed.set(transid, error?.message || "Network error");
        }
      }
      if (saved) getdata();
      setEditingIds(prev => {
        const next = new Set(prev);
        idsToSave.forEach(transid => { if (!failed.has(transid)) next.delete(transid); });
        return next;
      });
      setInlineForms(prev => {
        const next = { ...prev };
        idsToSave.forEach(transid => { if (!failed.has(transid)) delete next[transid]; });
        return next;
      });
      if (failed.size) {
        const firstError = failed.values().next().value;
        showToast(`Saved ${saved}; ${failed.size} failed and remain editable. ${firstError}`, "error");
      } else {
        showToast(`Saved ${saved} transaction${saved === 1 ? "" : "s"}`);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to save selected edits", "error");
    } finally {
      setBulkSaving(false);
    }
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
    const failed = new Set();
    for (const transid of selected) {
      try {
        const res = await fetch("/api/deletetransaction", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: transid }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) deleted += 1;
        else failed.add(transid);
      } catch {
        failed.add(transid);
      }
    }
    setSelected(failed);
    setEditingIds(prev => new Set([...prev].filter(id => failed.has(id))));
    setInlineForms(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => failed.has(Number(id)))));
    if (deleted) getdata();
    showToast(
      failed.size ? `Deleted ${deleted}; ${failed.size} failed and remain selected.` : `Deleted ${deleted} transaction${deleted === 1 ? "" : "s"}`,
      failed.size ? "error" : "success"
    );
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
  const selectedEditingCount = Array.from(selected).filter(transid => editingIds.has(transid)).length;

  return (
    <div className="transdiv">
      {/* Header */}
      <div className="trans-header">
        <h1 className="page-title">Transfers</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {selected.size > 0 && (
            <>
              {selectedEditingCount > 0 ? (
                <>
                  <button className="btn-secondary" style={{ color: "var(--success)", borderColor: "rgba(74,222,128,0.45)", fontSize: 13 }}
                    onClick={handleBulkEditSave} disabled={bulkSaving}>
                    {bulkSaving ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                    {bulkSaving ? "Saving..." : `Save ${selectedEditingCount} edits`}
                  </button>
                  <button className="btn-secondary" style={{ fontSize: 13 }}
                    onClick={cancelBulkEdit} disabled={bulkSaving}>
                    <X size={14} aria-hidden="true" /> Cancel edit
                  </button>
                </>
              ) : (
                <button className="btn-secondary" style={{ fontSize: 13 }}
                  onClick={openBulkEdit}>
                  <Edit3 size={14} aria-hidden="true" /> Bulk Edit {selected.size}
                </button>
              )}
              <button className="btn-secondary" style={{ color: "var(--danger)", borderColor: "var(--danger)", fontSize: 13 }}
                onClick={handleBulkDelete} disabled={bulkSaving}>
                <Trash2 size={14} aria-hidden="true" /> Delete {selected.size} selected
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={() => setModal("import")}>
            <ArrowDownToLine size={15} aria-hidden="true" /> Import
          </button>
          <button className="btn-secondary" onClick={() => setModal("bulk")}>
            <TableCellsSplit size={15} aria-hidden="true" /> Bulk Entry
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
            <Search size={14} strokeWidth={2} aria-hidden="true" />
          </span>
          <input className="search-input" type="text" placeholder="Search by description, category, amount…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="filter-select" value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}>
          <option value="all">All types</option>
          <option value="Debit">Debit</option>
          <option value="Credit">Credit</option>
          <option value="Investment">Investment</option>
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
            <BarChart3 size={40} style={{ marginBottom: 12, opacity: 0.3 }} aria-hidden="true" />
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No transactions found</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>Try adjusting your filters or add a new transaction</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="th thsticky" style={{ width: 36, textAlign: "center" }}>
                  <input type="checkbox"
                    className="transfer-checkbox"
                    checked={pageData.length > 0 && pageData.every(r => selected.has(r.transid))}
                    onChange={toggleSelectAll}
                    aria-label="Select all transactions on this page"
                  />
                </th>
                <th className="th thsticky" style={{ width: 56 }}>
                  <button className="sort-button" onClick={() => toggleSort("transid")} aria-label={`Sort by ID ${sortField === "transid" ? sortDir : ""}`}>ID<SortIcon field="transid" /></button>
                </th>
                <th className="th thsticky">
                  <button className="sort-button" onClick={() => toggleSort("type")} aria-label={`Sort by type ${sortField === "type" ? sortDir : ""}`}>TYPE<SortIcon field="type" /></button>
                </th>
                <th className="th thsticky">
                  <button className="sort-button" onClick={() => toggleSort("category")} aria-label={`Sort by category ${sortField === "category" ? sortDir : ""}`}>CATEGORY<SortIcon field="category" /></button>
                </th>
                <th className="th thsticky">DESCRIPTION</th>
                <th className="th thsticky">
                  <button className="sort-button" onClick={() => toggleSort("amount")} aria-label={`Sort by amount ${sortField === "amount" ? sortDir : ""}`}>AMOUNT<SortIcon field="amount" /></button>
                </th>
                <th className="th thsticky">
                  <button className="sort-button" onClick={() => toggleSort("date")} aria-label={`Sort by date ${sortField === "date" ? sortDir : ""}`}>DATE<SortIcon field="date" /></button>
                </th>
                <th className="th thsticky">
                  <button className="sort-button" onClick={() => toggleSort("bank_name")} aria-label={`Sort by bank ${sortField === "bank_name" ? sortDir : ""}`}>BANK<SortIcon field="bank_name" /></button>
                </th>
                <th className="th thsticky" style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
              {pageData.map((item, i) => {
                const isEditing = editingIds.has(item.transid);
                const isSelected = selected.has(item.transid);
                const draft = inlineForms[item.transid] || makeInlineDraft(item);
                const editingType = isEditing ? (draft.type || item.type) : item.type;
                return (
                  <motion.tr key={item.transid} layout="position"
                    initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:-16 }}
                    transition={{ duration:.22, delay:Math.min(i, 8) * .018, ease:easeOut }}
                    style={{ background: isEditing ? "var(--bg-secondary)" : isSelected ? "rgba(99,153,34,0.06)" : "" }}>
                    {/* Checkbox */}
                    <td className="th" style={{ textAlign: "center", width: 36 }}>
                      <input type="checkbox" className="transfer-checkbox" checked={isSelected}
                        aria-label={`Select transaction ${item.transid}`}
                        onChange={() => setSelected(prev => {
                          const n = new Set(prev);
                          n.has(item.transid) ? n.delete(item.transid) : n.add(item.transid);
                          return n;
                        })}
                      />
                    </td>
                    {/* ID */}
                    <td className="th" style={{ color: "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: 11 }}>
                      #{item.transid}
                    </td>
                    {/* Type */}
                    <td className="th">
                      {isEditing ? (
                        <select className="bulk-select" aria-label={`Type for transaction ${item.transid}`} value={draft.type}
                          onChange={e => updateInlineForm(item.transid, f => ({ ...f, type: e.target.value, category: "" }))}
                          style={{ fontSize: 12, padding: "3px 6px", height: 36 }}>
                          <option value="Debit">Debit</option>
                          <option value="Credit">Credit</option>
                          <option value="Investment">Investment</option>
                        </select>
                      ) : (
                        <span className={`badge badge-${item.type?.toLowerCase()}`}>{item.type}</span>
                      )}
                    </td>
                    {/* Category */}
                    <td className="th" style={{ color: "#ccc" }}>
                      {isEditing ? (
                        <select className="bulk-select" aria-label={`Category for transaction ${item.transid}`} value={draft.category}
                          onChange={e => updateInlineForm(item.transid, f => ({ ...f, category: e.target.value }))}
                          style={{ fontSize: 12, padding: "3px 6px", height: 36, minWidth: 110 }}>
                          <option value="">— select —</option>
                          {draft.type === item.type && draft.category === item.category
                            && !(props.cate || []).some(c => c.type === editingType && c.name === draft.category)
                            && <option value={draft.category}>{draft.category} (existing)</option>}
                          {(props.cate || []).filter(c => c.type === editingType).map((c, ci) => (
                            <option key={ci} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      ) : item.category}
                    </td>
                    {/* Description */}
                    <td className="th">
                      {isEditing ? (
                        <input className="bulk-input" aria-label={`Description for transaction ${item.transid}`} type="text" maxLength={300} value={draft.description}
                          onChange={e => updateInlineForm(item.transid, f => ({ ...f, description: e.target.value }))}
                          style={{ fontSize: 12, padding: "3px 6px", height: 36, minWidth: 160 }}
                          placeholder="Description…"
                        />
                      ) : (
                        <div className="cell-container" title={item.description}>{item.description || "—"}</div>
                      )}
                    </td>
                    {/* Amount */}
                    <td className="th amount-cell" style={{ color: item.type === "Credit" ? "var(--success)" : "var(--danger)" }}>
                      {isEditing ? (
                        <input className="bulk-input" aria-label={`Amount for transaction ${item.transid}`} type="number" min="0" step="0.01" value={draft.amount}
                          onChange={e => updateInlineForm(item.transid, f => ({ ...f, amount: e.target.value }))}
                          style={{ fontSize: 12, padding: "3px 6px", height: 36, width: 90 }}
                        />
                      ) : `₹${parseFloat(item.amount || 0).toFixed(2)}`}
                    </td>
                    {/* Date */}
                    <td className="th" style={{ color: "#999", fontFamily: "DM Mono, monospace", fontSize: 12 }}>
                      {isEditing ? (
                        <DatePicker className="bulk-input" ariaLabel={`Date for transaction ${item.transid}`} value={draft.date}
                          onChange={e => updateInlineForm(item.transid, f => ({ ...f, date: e.target.value }))}
                          style={{ fontSize: 12, padding: "3px 6px", height: 36 }}
                        />
                      ) : item.date}
                    </td>
                    {/* Bank */}
                    <td className="th" style={{ color: "var(--text-muted)", fontSize: 12, maxWidth: 120 }}>
                      {isEditing ? (
                        <BankSelector
                          ariaLabel={`Bank for transaction ${item.transid}`}
                          value={draft.bank_name || ""}
                          onChange={bank => updateInlineForm(item.transid, f => ({ ...f, bank_name: bank }))}
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
                            <button className="btn-ghost" aria-label={`Save transaction ${item.transid}`} style={{ color: "var(--success)" }}
                              onClick={() => handleInlineSave(item.transid)}>
                              <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                            </button>
                            <button className="btn-ghost" aria-label={`Cancel editing transaction ${item.transid}`}
                              onClick={() => closeInlineEdit(item.transid)}>
                              <X size={14} strokeWidth={2} aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn-ghost" aria-label={`Edit transaction ${item.transid}`} onClick={() => openInlineEdit(item)}>
                              <Edit3 size={14} strokeWidth={2} aria-hidden="true" />
                            </button>
                            <button className="btn-ghost btn-danger-ghost" aria-label={`Delete transaction ${item.transid}`} onClick={() => handleDelete(item.transid)}>
                              <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              </AnimatePresence>
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
            <button className="page-btn" aria-label="Previous transaction page" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page - 2 + i;
              if (pg < 1 || pg > totalPages) return null;
              return (
                <button key={pg} className={`page-btn ${pg === page ? "active" : ""}`} aria-label={`Transaction page ${pg}`} aria-current={pg === page ? "page" : undefined}
                  onClick={() => setPage(pg)}>{pg}</button>
              );
            })}
            <button className="page-btn" aria-label="Next transaction page" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === "add" && (
        <TransactionForm title="Add Transaction" categories={props.cate || []}
          onSubmit={handleAdd} onClose={() => setModal(null)} />
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
