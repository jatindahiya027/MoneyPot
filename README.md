<div align="center">

<img src="./readme/logo.png" alt="MoneyPot Logo" width="100" />

# MoneyPot

**A personal finance tracker with AI-powered insights, bank statement import, and interactive analytics**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue?style=flat-square&logo=sqlite)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)

[Features](#features) · [Screenshots](#screenshots) · [Quick Start](#quick-start) · [Docker](#docker) · [Configuration](#configuration) · [API Reference](#api-reference) · [Database Schema](#database-schema)

</div>

---

## Overview

MoneyPot is a self-hosted personal finance application built with Next.js 14. It lets you track income and expenses, visualize spending patterns, manage custom categories, and import bank statements from Axis Bank, HDFC Bank, and most other banks via PDF, Excel, or CSV export. An AI assistant powered by Groq analyzes your financial data and surfaces actionable insights.

All data stays on your machine — no third-party cloud, no subscriptions.

---

## Features

### Core
- **Transaction management** — add, edit, and delete income and expense entries with type, category, date, description, and amount
- **Custom categories** — create spending categories with custom colors, organized separately for Debit (expenses) and Credit (income)
- **Date-range filtering** — filter the entire dashboard by any date range with one-click presets: This month, 3 months, This year, All time
- **CSV export** — download all transactions as a spreadsheet-compatible CSV file

### Import
- **PDF import** — auto-parses Axis Bank and HDFC Bank PDF statements with bank-specific column and date detection; no manual mapping required. Falls back to a generic parser for other banks
- **Excel import** — reads `.xlsx` and `.xls` files directly in the browser, skips header metadata rows automatically, supports multi-sheet workbooks
- **CSV import** — handles quoted fields, auto-detects column names, supports both Indian (`DD/MM/YYYY`) and US (`MM/DD/YYYY`) date formats
- **Bulk entry** — spreadsheet-style form to enter many transactions at once without opening individual dialogs
- **Column mapping wizard** — three-step wizard for non-standard files: upload → map columns (with sample value previews) → preview before import
- **Split debit/credit mode** — handles bank formats that use separate Withdrawal and Deposit columns instead of a single Amount column

### Analytics
- **Area chart** — daily cash flow over the selected period showing income vs expenses, with custom tooltip and smart ₹K/₹L axis labels
- **Pie chart** — spending breakdown by category with color-coded legend
- **Overview cards** — total income, total expenses, and net savings for the selected period, each showing transaction count

### AI Insights
- Powered by **Groq** (Gemma 2 9B model) — analyzes your transaction data and generates a plain-English financial summary with observations and suggestions
- Displayed on the Transfers page and refreshable on demand

### UX
- **Fully responsive** — mobile-first layout with a bottom navigation bar on phones, off-canvas sidebar drawer, stacked cards and charts on small screens
- **Live search** — searches transactions across description, category, amount, date, and ID simultaneously
- **Sortable columns** — click any column header to sort ascending or descending
- **Pagination** — 20 rows per page with compact page controls
- **Toast notifications** — non-blocking feedback for all actions

---

## Screenshots

| Dashboard | Transfers |
|-----------|-----------|
| ![Dashboard](./readme/img%20(3).png) | ![Transfers](./readme/img%20(4).png) |

| Categories | Settings |
|------------|----------|
| ![Categories](./readme/img%20(2).png) | ![Settings](./readme/img%20(1).png) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | SQLite 3 via `sqlite` + `sqlite3` |
| Authentication | JWT via `jose` (stored in cookies) |
| AI | Groq SDK — Gemma 2 9B IT |
| Charts | Recharts |
| PDF parsing | pdfjs-dist 3.11 (local worker, no CDN) |
| Excel parsing | SheetJS (`xlsx`) |
| Styling | Tailwind CSS + custom CSS variables |
| Fonts | DM Sans + DM Mono (Google Fonts) |
| Image processing | Sharp |
| Containerization | Docker + Docker Compose |

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- **npm 8+**

### 1. Clone and install

```bash
git clone <your-repo-url>
cd moneypot
npm install
```

### 2. Configure environment

Edit the `.env` file in the project root:

```env
NEXT_PUBLIC_JWT_SECRET_KEY=your-secret-key-change-this
GROQ_API_KEY=your-groq-api-key-here
```

Getting a Groq API key: sign up free at [console.groq.com](https://console.groq.com). The AI insights feature will not work without it, but the rest of the app functions normally.

### 3. Initialize the database

```bash
node createdb.js
```

This creates `collection.db` with all required tables. Safe to re-run — uses `CREATE TABLE IF NOT EXISTS`.

### 4. (Optional) Seed sample data

```bash
node enterdata.js
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Create account**, and register. Each new account gets a default set of spending categories automatically.

---

## Docker

### Using Docker Compose (recommended)

```bash
docker-compose up -d
```

The app will be available at **http://localhost:3001**.

The `docker-compose.yml` mounts no volumes by default, so the SQLite database lives inside the container. To persist data across container restarts, add a volume mount:

```yaml
# docker-compose.yml
services:
  app:
    volumes:
      - ./data:/app
```

### Building manually

```bash
docker build -t moneypot .
docker run -p 3001:3000 \
  -e NEXT_PUBLIC_JWT_SECRET_KEY=yoursecret \
  -e GROQ_API_KEY=yourkey \
  moneypot
```

### Production build (without Docker)

```bash
npm run build
npm start
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_JWT_SECRET_KEY` | **Yes** | Signs and verifies JWT tokens. Use a long random string in production |
| `GROQ_API_KEY` | No | Groq API key for AI insights. Free tier available at [console.groq.com](https://console.groq.com) |

### Generating a secure JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Production Checklist

Before deploying publicly:

1. **Change the JWT secret** — replace the default `1234567890` with the output of the command above.

2. **Hash passwords** — the current implementation stores passwords in plaintext. Add `bcrypt` hashing in `/src/app/api/signup/route.js` and `/src/app/api/login/route.js`:
   ```bash
   npm install bcrypt
   ```
   ```js
   // signup: hash before insert
   const hashed = await bcrypt.hash(body.password, 10);
   
   // login: compare hash
   const match = await bcrypt.compare(body.password, user.password);
   ```

3. **Update the image base URL** — profile images are served via a hardcoded `http://127.0.0.1:3000` URL in `dashboard.js` and `setting.js`. Replace with your production domain.

4. **Add HTTPS** — use a reverse proxy such as Nginx or Caddy to terminate TLS in front of the Node.js process.

---

## Importing Bank Statements

### Supported formats

| Bank | PDF | Excel (.xls/.xlsx) | CSV |
|------|-----|--------------------|-----|
| Axis Bank | ✅ Auto-parsed | — | ✅ Manual mapping |
| HDFC Bank | ✅ Auto-parsed | ✅ Auto-detected | ✅ Manual mapping |
| SBI / ICICI / others | ⚠️ Generic parser | ✅ Manual mapping | ✅ Manual mapping |

> **PDF limitation:** Only text-based PDFs are supported. Scanned or image-only PDFs (where you cannot click to select text) are not supported.

### How to export from your bank

**Axis Bank**
1. Login → **My Accounts → Account Statement**
2. Select date range → **Download → PDF**

**HDFC Bank**
1. Login → **Accounts → Account Statement**
2. Select **XLS** or **PDF** → Download

**Any bank (generic CSV)**
1. Login → Account Statement → Export/Download
2. Choose **CSV** format and download

### Import walkthrough

1. Go to **Transfers → Import**
2. Drop your file or click Browse — supports `.pdf`, `.xlsx`, `.xls`, `.csv`
3. **Axis/HDFC PDF:** jumps directly to the preview step (no mapping needed)
4. **Excel/CSV:** the mapping step shows detected column names with sample values. Select which column maps to Date, Withdrawal, Deposit (or Amount), and Description. Enable **Split Withdrawal/Deposit mode** if your file has separate debit and credit columns
5. **Date format:** choose DD/MM/YYYY (default for Indian banks) or MM/DD/YYYY if your file uses US format
6. Review the preview table — verify dates, debit/credit types, and amounts
7. Optionally assign a default category to all imported transactions
8. Click **Import N transactions**

---

## Project Structure

```
moneypot/
├── src/
│   ├── app/
│   │   ├── page.js                   # Login page
│   │   ├── layout.js                 # Root layout
│   │   ├── globals.css               # All styles + responsive breakpoints
│   │   ├── signup/
│   │   │   └── page.js               # Signup page
│   │   ├── protected/
│   │   │   ├── page.js               # App shell (sidebar, mobile nav, routing)
│   │   │   ├── dashboard.js          # Dashboard — date filter, overview cards, charts
│   │   │   ├── transfers.js          # Transactions list, search, import, bulk entry
│   │   │   ├── categories.js         # Category management
│   │   │   ├── setting.js            # Profile editor + CSV export
│   │   │   ├── areachart.js          # Cash flow area chart (Recharts)
│   │   │   └── piechart.js           # Category breakdown pie chart (Recharts)
│   │   └── api/
│   │       ├── login/                # POST  Authenticate, issue JWT
│   │       ├── signup/               # POST  Register new user
│   │       ├── logincheck/           # GET   Validate JWT
│   │       ├── get/                  # GET   User profile
│   │       ├── edituser/             # POST  Update profile
│   │       ├── upload/               # POST  Upload profile image
│   │       ├── get-uploaded-file/    # GET   Serve uploaded files
│   │       ├── transactions/         # GET   List all transactions
│   │       ├── entertransaction/     # POST  Add transaction
│   │       ├── edittransaction/      # POST  Edit transaction
│   │       ├── deletetransaction/    # POST  Delete transaction
│   │       ├── pertransdata/         # POST  Fetch single transaction
│   │       ├── transtable/           # GET/POST  Daily chart data
│   │       ├── creditdebit/          # GET/POST  Credit/debit totals
│   │       ├── cattotal/             # GET/POST  Per-category totals
│   │       ├── category/             # GET   List categories
│   │       ├── entercategory/        # POST  Add category
│   │       ├── deletecategory/       # POST  Delete category
│   │       ├── export/               # GET   Download CSV
│   │       └── ai/                   # GET   Groq AI insights
│   ├── components/ui/                # Shared UI components (card, chart wrappers)
│   ├── hooks/useAuth/                # Authentication hook
│   └── libs/auth.js                  # JWT helper functions
├── public/                           # Static assets (category icons, UI icons)
│   └── pdf.worker.min.js             # pdfjs worker (local, no CDN dependency)
├── readme/                           # Screenshots for this README
├── collection.db                     # SQLite database (created by createdb.js)
├── createdb.js                       # Database initialization
├── enterdata.js                      # Sample data seed
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## API Reference

All endpoints under `/api/*` except `/api/login` and `/api/signup` require:

```
Authorization: Bearer <jwt-token>
```

The token is issued on login and managed automatically by the frontend via cookies.

All date values use `YYYY-MM-DD` format.

### Authentication

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/api/login` | `{ username, password }` | `{ success, token }` |
| `POST` | `/api/signup` | `{ username, age, email, password }` | `{ success }` |
| `GET` | `/api/logincheck` | — | `{ success }` |

### User

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/get` | — | Current user's profile |
| `POST` | `/api/edituser` | `{ name, age, mail, img }` | Update profile fields |
| `POST` | `/api/upload` | `multipart/form-data` with `file` | Upload profile photo |
| `GET` | `/api/get-uploaded-file?file=<path>` | — | Serve an uploaded file |

### Transactions

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/transactions` | — | All transactions (newest first) |
| `POST` | `/api/entertransaction` | `{ type, category, description, date, amount }` | Insert a new transaction |
| `POST` | `/api/edittransaction` | `{ id, type, category, description, date, amount }` | Update a transaction |
| `POST` | `/api/deletetransaction` | `{ id }` | Remove a transaction |
| `POST` | `/api/pertransdata` | `{ edittrans: id }` | Fetch one transaction by ID |

### Analytics

All analytics endpoints support both `GET` (all-time) and `POST` with `{ StartDate, EndDate }` for a filtered range.

| Endpoint | Returns |
|----------|---------|
| `/api/transtable` | Array of `{ date, Credit, Debit }` — daily totals for chart |
| `/api/creditdebit` | Array of `{ type, amount }` — summed credit and debit totals |
| `/api/cattotal` | Array of `{ category, amount }` — spending per category |

### Categories

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/category` | — | All categories for the current user |
| `POST` | `/api/entercategory` | `{ type, name, fill }` | Add a new category |
| `POST` | `/api/deletecategory` | `{ id }` | Delete a category |

### Export & AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/export` | Returns a CSV file of all transactions as a download |
| `GET` | `/api/ai` | Calls Groq with the user's transaction data and returns a markdown insight string |

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  userid   INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT,
  age      INTEGER,
  mail     TEXT UNIQUE,   -- login username
  password TEXT,          -- ⚠️  plaintext — hash with bcrypt in production
  image    TEXT            -- relative path to uploaded avatar
);

-- Transactions
CREATE TABLE transactions (
  transid     INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT,        -- 'Credit' | 'Debit'
  category    TEXT,
  description TEXT,
  date        TEXT,        -- 'YYYY-MM-DD'
  amount      REAL
);

-- Categories
CREATE TABLE categories (
  categoryid  INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT,        -- 'Credit' | 'Debit'
  imgpath     TEXT,        -- icon path under /public
  name        TEXT,
  fill        TEXT         -- hex color string
);

-- Junction tables
CREATE TABLE users_transcation_link (userid INTEGER, transid     INTEGER);
CREATE TABLE users_category_link    (userid INTEGER, categorykid INTEGER);

-- Reserved for future features
CREATE TABLE recurring           (recurid  INTEGER PRIMARY KEY, amount INTEGER);
CREATE TABLE budget              (budgetid INTEGER PRIMARY KEY, startdate TEXT, enddate TEXT, amount INTEGER);
CREATE TABLE users_recurring_link(userid   INTEGER, recurrid  INTEGER);
CREATE TABLE users_budget_link   (userid   INTEGER, budgetid  INTEGER);
```

---

## Development Notes

### Running the database initialization

```bash
node createdb.js     # create tables
node enterdata.js    # seed with sample transactions
```

### Resetting all data

```bash
rm collection.db
node createdb.js
```

### Testing the AI endpoint manually

```bash
curl -H "Authorization: Bearer <your-token>" http://localhost:3000/api/ai
```

If you see an error, verify that `GROQ_API_KEY` is set in `.env` and that the Groq console shows remaining quota.

### Adding a new bank to the PDF parser

The PDF parser is in `src/app/protected/transfers.js`. To add support for a new bank:

1. Add a detection string in `detectBank()`:
   ```js
   if (t.includes("your bank name")) return "yourbank";
   ```
2. Implement `parseYourbankPDF(pdf)` following the same pattern as `parseAxisPDF` or `parseHdfcPDF` — extract raw items with x/y coordinates, classify by x position into columns, accumulate rows
3. Call it in `parsePDF()`:
   ```js
   if (bank === "yourbank") transactions = await parseYourbankPDF(pdf);
   ```

To find the correct column x-coordinates for a new bank, use the raw extraction code pattern (see the `parseAxisPDF` and `parseHdfcPDF` implementations for reference).

---

## Known Limitations

| Issue | Impact | Workaround |
|-------|--------|------------|
| Passwords stored in plaintext | Security risk on public deploys | Add `bcrypt` (see [Production Checklist](#production-checklist)) |
| Profile image URL hardcoded to `127.0.0.1:3000` | Breaks on non-localhost deploys | Update the URL in `dashboard.js` and `setting.js` |
| Scanned PDFs not supported | Cannot import image-based statements | Export as Excel or CSV from your bank portal instead |
| No HTTPS built in | Credentials sent over plain HTTP | Use Nginx/Caddy as a TLS-terminating reverse proxy |
| SQLite single-file database | Not suitable for high concurrency | Fine for personal/single-user use; migrate to PostgreSQL for shared deployments |

---

## License

MIT — see [LICENSE](./LICENSE) for full text.

---

<div align="center">
  Built with Next.js · SQLite · Recharts · Groq AI
</div>
