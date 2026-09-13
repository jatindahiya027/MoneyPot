# MoneyPot

MoneyPot is a local Electron personal finance tracker built with Next.js, SQLite, Recharts, and Ollama-powered AI insights. It is designed for personal use: you can add transactions manually, bulk import bank statements, manage custom categories, review dashboards, set budgets, export CSVs, and analyze spending trends without sending your database to a hosted finance platform.

Transaction data is stored in `collection.db` inside Electron's per-user application-data directory. Authentication uses an HttpOnly session cookie and bcrypt-hashed passwords.

MoneyPot uses three first-class transaction entities: `Credit`, `Debit`, and `Investment`. Credit increases available money, Debit reduces it, and Investment is tracked separately while also reducing available bank money. Investment redemptions are negative Investment values. Self transfers remain excluded from reporting totals.

## Desktop App (Electron)

Run the desktop app in development mode:

```bash
npm run electron:dev
```

MoneyPot selects Homebrew Node 22 automatically; `nvm` is not required. Install or repair the locked dependencies with:

```bash
brew install node@22
npm run deps:install
```

Build a specific desktop target with:

```bash
npm run dist:mac:arm64
npm run dist:mac:x64
npm run dist:win:x64
npm run dist:win:arm64
```

MoneyPot uses `better-sqlite3`, whose official Electron releases cover macOS ARM64/x64 and Windows ARM64/x64. Each build downloads the locked target-native modules and validates their binary format and architecture before creating installers. No Zig, Visual Studio, Windows VM, or custom compiler is required for builds on macOS.

Packages are written to `dist-electron/`. The installed desktop app creates a fresh database and stores uploads and its generated authentication secret in Electron's per-user application data directory (`%APPDATA%/MoneyPot` on Windows and `~/Library/Application Support/MoneyPot` on macOS). No project or developer database is included in desktop packages. Existing per-user data remains in place during app upgrades and normal uninstalls.

## Table Of Contents

- [What MoneyPot Does](#what-moneypot-does)
- [Current Feature Set](#current-feature-set)
- [How The App Works](#how-the-app-works)
- [Important Financial Rules](#important-financial-rules)
- [Screens And Workflows](#screens-and-workflows)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running The App](#running-the-app)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Import System Details](#import-system-details)
- [AI / Ollama Details](#ai--ollama-details)
- [Development Notes](#development-notes)
- [Known Limitations](#known-limitations)
- [License](#license)

## What MoneyPot Does

MoneyPot helps you answer practical personal-finance questions:

- How much money came in during a period?
- How much was spent?
- How much was invested?
- How much money remains in the bank after spending and investments?
- Which categories are driving expenses?
- Which months were good or bad?
- Are expenses stable, increasing, or irregular?
- Are budgets being followed?
- Can imported bank statement rows be cleaned and categorized quickly?
- Can a local AI model summarize recent financial behavior?

The core model is intentionally simple:

- A transaction is either `Credit` or `Debit`.
- A transaction belongs to a category.
- Categories are user-visible labels such as `Food`, `Rent`, `Salary`, `Investments`, `Self`, or `Investment redemption`.
- Dashboard and analysis screens apply extra business rules on top of raw transaction type and category.

## Current Feature Set

### Authentication

- Email/password signup.
- Passwords are hashed with `bcryptjs`.
- Login issues a short-lived JWT in an HttpOnly cookie named `token`.
- Packaged Electron installations generate a unique signing secret in the OS user-data directory. The token is never exposed to browser JavaScript.
- `/protected` is guarded by middleware.
- Invalid or missing tokens redirect users back to the login screen.

### Dashboard

- Date range filter with presets:
  - This month
  - 3 months
  - This year
  - All time
- Custom app-styled date picker.
- Overview cards:
  - Income
  - Expenses
  - Investment
  - Money in Bank
  - Net Savings
- Daily cash-flow chart.
- Category pie chart.
- Recent transactions in the right panel.
- Profile shortcuts.

### Transfers

- Full transaction table.
- Search across transaction id, description, category, amount, and date.
- Type filter.
- Category filter.
- Sortable columns.
- Pagination.
- Single transaction add form.
- Single-row inline edit.
- Multi-row selection.
- Bulk delete.
- Bulk edit:
  - select rows;
  - click `Bulk Edit`;
  - selected rows become editable inline;
  - click the save/tick button to persist all selected edits.
- Bulk entry form for multiple manual rows.
- Import modal for statement files.
- Local AI insights panel.

### Categories

- Debit and credit categories are separate.
- Category cards use `lucide-react` icons.
- New categories can be created with a selected icon.
- Category color/fill is stored in the database.
- Default categories are linked to new users during signup.

### Budget Planner

- Monthly budgets per debit category.
- Month selector.
- Add, edit, and delete category budgets.
- Shows amount spent against the budget.
- Highlights usage percentage:
  - green below 80%;
  - amber from 80% to 99%;
  - red at or above 100%.

### Financial Health & Analysis

- Timeframe selector:
  - last 2 months
  - last 3 months
  - last 6 months
  - last 12 months
  - last 24 months
  - all time
- Health score from five signals:
  - savings rate;
  - budget adherence;
  - spending trend;
  - income stability;
  - expense consistency.
- Shows the calculation summary behind the score.
- Excludes self transfers from financial health calculations.
- Treats investments as savings/investment activity, not regular spending.
- Shows mathematical detail for stability and consistency:
  - average;
  - standard deviation;
  - coefficient of variation;
  - scoring formula.
- Includes anomaly alerts, 50/30/20 analysis, and savings goals data.

### Trends

- Month-over-month view.
- Time window selector:
  - last 3 months;
  - last 6 months;
  - last 12 months;
  - last 24 months.
- Three separate monthly series:
  - Income
  - Debit
  - Investment
- Investment is not added into income.
- Investment is treated as money deployed from income.
- Table view includes:
  - income;
  - debit;
  - investment;
  - money in bank;
  - net savings;
  - savings rate.

### Settings

- Profile update:
  - name;
  - age;
  - email;
  - profile image.
- CSV export with optional start date and end date.
- Ollama settings:
  - URL;
  - model name;
  - connection test;
  - installed model detection.

## How The App Works

### High-level flow

1. A user signs up from `/signup`.
2. The signup API hashes the password and inserts a row into `users`.
3. The signup API links default categories to the user through `users_category_link`.
4. The user logs in from `/`.
5. The login API verifies the password with bcrypt.
6. The login API signs a short-lived JWT with the per-install secret.
7. The backend stores it only in an HttpOnly cookie.
8. Middleware verifies the cookie before protected pages and API calls.
9. `/protected/page.js` loads the app shell.
10. The app shell fetches profile, transactions, categories, dashboard totals, charts, and category totals.
11. Navigation inside `/protected` is client-side state, not separate pages.
12. Each feature screen calls its own API endpoints when data needs to change.

### Data ownership model

Most user-owned data uses link tables:

- `users_transcation_link` links a user to transactions.
- `users_category_link` links a user to categories.

When an authenticated endpoint reads or modifies transactions, it verifies that the JWT user id owns the requested row through `users_transcation_link`.

### Frontend shell

The main app shell lives in:

```txt
src/app/protected/page.js
```

It owns shared state:

- current user profile;
- transaction list;
- category list;
- dashboard chart data;
- category totals;
- credit/debit/investment totals;
- selected date range for dashboard;
- active component.

It renders one of the feature components:

```txt
component1 -> Dashboard
component2 -> Transfers
component3 -> Categories
component5 -> Budget
component6 -> Analysis
component7 -> Trends
component4 -> Settings
```

The sidebar and mobile bottom navigation both update this active component state.

### Styling model

The app uses:

- global CSS variables in `src/app/globals.css`;
- custom CSS classes for the layout, table, forms, date picker, modals, and responsive behavior;
- `lucide-react` for icons;
- Recharts for charts;
- shared chart/card wrappers under `src/components/ui`.

The UI is a dark dashboard style with compact spacing, small table typography, and dense financial information.

## Important Financial Rules

These rules are central to understanding the numbers in the dashboard, analysis, and trends sections.

### Self transfers

Any category whose name contains `self` is treated as a self transfer.

Examples:

```txt
Self
Self Transfer
self transfer
```

Self transfers are ignored in dashboard calculations, trend calculations, and financial-health calculations because they are usually movement between the user's own accounts, not true income or spending.

The SQL pattern is:

```sql
lower(COALESCE(t.category, '')) NOT LIKE '%self%'
```

### Investment

Debit transactions whose category contains `investment` are treated as investment activity, not regular debit spending.

Example categories:

```txt
Investments
Investment
Mutual fund investment
```

These are excluded from ordinary expenses/debit where the app needs regular spending.

### Investment redemption

Credit transactions whose category contains both `investment` and `redemption` are treated as money coming back from investments.

Example:

```txt
Investment redemption
```

Investment redemption is not counted as regular income on the dashboard or trends. Instead, it reduces net investment:

```txt
Net Investment = Investment debit total - Investment redemption credit total
```

### Dashboard formulas

Dashboard values are calculated from `/api/creditdebit`.

Definitions:

```txt
Income = credit transactions excluding self transfers and excluding investment redemption

Debit = debit transactions excluding self transfers and excluding investment categories

Investment = debit investment transactions - credit investment redemption transactions

Money in Bank = income - debit - investment

Net Savings = investment + money in bank
```

Because:

```txt
Net Savings = investment + (income - debit - investment)
```

Net Savings also simplifies to:

```txt
Net Savings = income - debit
```

The app still displays both `Investment` and `Money in Bank` so the user can see where the savings are sitting.

### Trends formulas

The trends API lives at:

```txt
src/app/api/monthtrend/route.js
```

For every month:

```txt
Income = credit income excluding self transfers and excluding investment redemption
Debit = debit spending excluding self transfers and excluding investment categories
Investment = investment debits - investment redemption credits
Net Savings = income - debit
Money in Bank = income - debit - investment
Savings Rate = net savings / income
```

Investment is not added into income.

### Financial health formulas

The financial health score has 100 possible points.

Each component contributes up to 20 points:

```txt
Savings rate:         max 20
Budget adherence:    max 20
Spending trend:      max 20
Income stability:    max 20
Expense consistency: max 20
```

Savings rate:

```txt
savingsRate = (averageIncome - averageExpense) / averageIncome
score = clamp((savingsRate / 0.20) * 20, 0, 20)
```

Budget adherence:

```txt
budgetAdherence = budgeted categories under limit / total budgeted categories
score = clamp(budgetAdherence * 20, 0, 20)
```

Spending trend:

```txt
recent = latest month expenses
older = oldest month expenses in selected window
trendScore = clamp(1 - (recent / older - 0.7) / 0.6, 0, 1)
score = clamp(trendScore * 20, 0, 20)
```

Income stability:

```txt
incomeCV = incomeStdDev / averageIncome
score = clamp((1 - incomeCV / 0.5) * 20, 0, 20)
```

Expense consistency:

```txt
expenseCV = expenseStdDev / averageExpense
score = clamp((1 - expenseCV / 0.5) * 20, 0, 20)
```

## Screens And Workflows

### Login

Location:

```txt
src/app/page.js
```

The login form submits email and password to:

```txt
POST /api/login
```

If the login succeeds:

- the response contains a JWT;
- the API also sets an HttpOnly cookie;
- the frontend stores the token;
- the user is routed to `/protected`.

### Signup

Location:

```txt
src/app/signup/page.js
```

Signup requires:

- username;
- email;
- password of at least 8 characters;
- optional age.

The API:

```txt
POST /api/signup
```

does the following:

- validates fields;
- checks for duplicate email;
- hashes the password with bcrypt cost factor 12;
- inserts the user;
- links default categories.

### Dashboard

Location:

```txt
src/app/protected/dashboard.js
```

Dashboard fetches:

- `/api/cattotal` for category pie chart;
- `/api/creditdebit` for overview cards;
- `/api/transtable` for daily chart;
- `/api/banktrend` for per-bank totals.

When the user changes the date range, Dashboard posts:

```json
{
  "StartDate": "YYYY-MM-DD",
  "EndDate": "YYYY-MM-DD"
}
```

to the same analytics endpoints.

The range fetch is debounced by 300ms to avoid repeated API calls while the date is changing.

### Transfers

Location:

```txt
src/app/protected/transfers.js
```

Transfers is the largest screen. It includes:

- transaction list;
- search;
- filters;
- sorting;
- pagination;
- add transaction;
- inline edit;
- bulk edit;
- bulk delete;
- bulk entry;
- import;
- AI insights.

Single transaction add uses:

```txt
POST /api/entertransaction
```

Single-row inline edit and bulk edit use:

```txt
POST /api/edittransaction
```

Bulk edit reuses the existing edit endpoint once for each selected row. After saving, Transfers refreshes:

- all transactions;
- dashboard totals;
- category totals;
- chart data.

Bulk delete calls:

```txt
POST /api/deletetransaction
```

for every selected row.

### Bulk entry

Bulk entry is not the same as bulk edit.

Bulk entry creates new rows. It posts a list of rows to:

```txt
POST /api/bulktransaction
```

The endpoint accepts:

```json
{
  "rows": [
    {
      "type": "Debit",
      "category": "Food",
      "description": "Lunch",
      "date": "2026-04-29",
      "amount": "250",
      "bank_name": "Axis Bank"
    }
  ]
}
```

The endpoint:

- requires authentication;
- accepts up to 500 rows;
- normalizes dates;
- skips invalid rows;
- inserts valid rows inside a SQLite transaction;
- links each inserted transaction to the authenticated user.

### Categories

Location:

```txt
src/app/protected/categories.js
```

Categories are grouped by type:

- Debit categories;
- Credit categories.

Each category stores:

- name;
- type;
- icon path or lucide icon marker;
- color/fill.

New categories can choose from available lucide icons.

### Budget

Location:

```txt
src/app/protected/budget.js
```

Budget data is keyed by:

```txt
user id + category + month
```

The budget table has a unique constraint:

```sql
UNIQUE(userid, category, month)
```

This allows the API to upsert the monthly budget for a category.

### Analysis

Location:

```txt
src/app/protected/analysis.js
```

API:

```txt
GET /api/analysis?months=6
```

Allowed month windows:

```txt
2, 3, 6, 12, 24, all
```

The response includes:

- `healthScore`;
- `healthSummary`;
- `anomalies`;
- `analysis503020`;
- `goals`;
- `monthRows`;
- `analysisWindow`.

### Trends

Location:

```txt
src/app/protected/monthtrend.js
```

API:

```txt
GET /api/monthtrend?months=6
```

The Trends screen shows monthly comparisons for:

- income;
- debit;
- investment.

The chart is clickable. Clicking a month opens a category breakdown for that month.

### Settings

Location:

```txt
src/app/protected/setting.js
```

Settings contains:

- profile editor;
- CSV export;
- Ollama settings.

CSV export supports:

```txt
GET /api/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Dates are optional. If omitted, all transactions are exported.

## Installation

### Prerequisites

- Node.js 18 or newer.
- npm.
- SQLite support through the `better-sqlite3` npm package.
- Optional: Ollama if you want local AI insights.

### Clone and install

```bash
git clone <your-repo-url>
cd moneypot
npm install
```

### Initialize the database

The app creates and migrates its database automatically on first launch.

The database file is:

```txt
collection.db
```

## Environment Variables

Electron configures its data directory and signing secret automatically. `OLLAMA_ALLOWED_ORIGINS` may contain a comma-separated list of additional Ollama origins; the local `127.0.0.1:11434` and `localhost:11434` origins are allowed by default.

Ollama URL and model are not stored in `.env`. They are configured in the Settings screen and saved in browser localStorage:

```txt
ollama_url
ollama_model
```

Default values:

```txt
http://localhost:11434
llama3.2
```

## Running The App

### Development

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

### Production build

```bash
npm run build
npm start
```

The `start` script runs:

```txt
next start -p 3031
```

So production start serves the app at:

```txt
http://localhost:3031
```

## Project Structure

```txt
moneypot/
├── src/
│   ├── app/
│   │   ├── page.js
│   │   ├── signup/page.js
│   │   ├── reset-password/page.js
│   │   ├── protected/
│   │   │   ├── page.js
│   │   │   ├── dashboard.js
│   │   │   ├── transfers.js
│   │   │   ├── categories.js
│   │   │   ├── budget.js
│   │   │   ├── analysis.js
│   │   │   ├── monthtrend.js
│   │   │   ├── setting.js
│   │   │   ├── areachart.js
│   │   │   └── piechart.js
│   │   ├── api/
│   │   │   ├── login/route.js
│   │   │   ├── signup/route.js
│   │   │   ├── transactions/route.js
│   │   │   ├── entertransaction/route.js
│   │   │   ├── edittransaction/route.js
│   │   │   ├── deletetransaction/route.js
│   │   │   ├── bulktransaction/route.js
│   │   │   ├── creditdebit/route.js
│   │   │   ├── transtable/route.js
│   │   │   ├── cattotal/route.js
│   │   │   ├── monthtrend/route.js
│   │   │   ├── analysis/route.js
│   │   │   ├── budget/route.js
│   │   │   ├── export/route.js
│   │   │   ├── ai/route.js
│   │   │   └── ollama-check/route.js
│   │   ├── globals.css
│   │   └── layout.js
│   ├── components/ui/
│   │   ├── card.jsx
│   │   ├── chart.jsx
│   │   └── date-picker.jsx
│   ├── lib/utils.js
│   ├── libs/auth.js
│   ├── libs/clientToken.js
│   ├── libs/db.js
│   └── middleware.js
├── public/
├── collection.db
├── next.config.mjs
├── package.json
└── README.md
```

## Database Schema

The schema is created in:

```txt
src/libs/db.js
```

The active database file is:

```txt
collection.db
```

### `users`

Stores account details.

```sql
CREATE TABLE IF NOT EXISTS users (
  userid   INTEGER PRIMARY KEY,
  name     TEXT    NOT NULL,
  age      INTEGER,
  mail     TEXT    NOT NULL UNIQUE,
  password TEXT    NOT NULL,
  image    TEXT    DEFAULT '/profile.png'
);
```

Notes:

- `mail` is the login identifier.
- `password` stores a bcrypt hash.
- `image` is either `/profile.png` or an uploaded image path.

### `transactions`

Stores all raw transaction rows.

```sql
CREATE TABLE IF NOT EXISTS transactions (
  transid     INTEGER PRIMARY KEY,
  type        TEXT    NOT NULL CHECK(type IN ('Debit','Credit')),
  category    TEXT    NOT NULL,
  description TEXT    DEFAULT '',
  date        TEXT    NOT NULL,
  amount      REAL    NOT NULL CHECK(amount >= 0),
  bank_name   TEXT    DEFAULT ''
);
```

Notes:

- Dates are stored as `YYYY-MM-DD`.
- Amounts are always non-negative.
- Direction is determined by `type`.
- `bank_name` is optional and capped in APIs.

### `users_transcation_link`

Links users to transactions.

```sql
CREATE TABLE IF NOT EXISTS users_transcation_link (
  userid  INTEGER NOT NULL,
  transid INTEGER NOT NULL
);
```

The table name contains the spelling `transcation` in the existing codebase. Do not rename it unless you also migrate every query.

### `categories`

Stores category definitions.

```sql
CREATE TABLE IF NOT EXISTS categories (
  categoryid INTEGER PRIMARY KEY,
  type       TEXT,
  imgpath    TEXT,
  name       TEXT,
  fill       TEXT
);
```

Notes:

- `type` is usually `Debit` or `Credit`.
- `imgpath` may contain older image paths or a lucide marker such as `lucide:Home`.
- `fill` is the category color.

### `users_category_link`

Links users to categories.

```sql
CREATE TABLE IF NOT EXISTS users_category_link (
  userid      INTEGER NOT NULL,
  categorykid INTEGER NOT NULL
);
```

The field name is `categorykid` in the current schema.

### `budget`

Stores monthly category budgets.

```sql
CREATE TABLE IF NOT EXISTS budget (
  budgetid    INTEGER PRIMARY KEY,
  userid      INTEGER NOT NULL,
  category    TEXT    NOT NULL,
  month       TEXT    NOT NULL,
  amount      REAL    NOT NULL CHECK(amount >= 0),
  UNIQUE(userid, category, month)
);
```

### `savings_goals`

Stores savings goals.

```sql
CREATE TABLE IF NOT EXISTS savings_goals (
  goalid        INTEGER PRIMARY KEY,
  userid        INTEGER NOT NULL,
  name          TEXT    NOT NULL,
  target_amount REAL    NOT NULL CHECK(target_amount > 0),
  saved_amount  REAL    NOT NULL DEFAULT 0,
  deadline      TEXT,
  color         TEXT    DEFAULT '#22c55e',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### `reset_tokens`

Stores password reset tokens.

```sql
CREATE TABLE IF NOT EXISTS reset_tokens (
  tokenid   INTEGER PRIMARY KEY,
  userid    INTEGER NOT NULL,
  token     TEXT    NOT NULL UNIQUE,
  expires   TEXT    NOT NULL,
  used      INTEGER NOT NULL DEFAULT 0
);
```

### Indexes

The app creates these indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_trans_link_userid ON users_transcation_link(userid);
CREATE INDEX IF NOT EXISTS idx_trans_date        ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_trans_type        ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_budget_userid     ON budget(userid);
CREATE INDEX IF NOT EXISTS idx_reset_token       ON reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_goals_userid      ON savings_goals(userid);
```

## API Reference

Most APIs require:

```txt
Authorization: Bearer <jwt>
```

Dates use:

```txt
YYYY-MM-DD
```

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/signup` | Create user and default category links. |
| `POST` | `/api/login` | Verify credentials, return JWT, set cookie. |
| `GET` | `/api/logincheck` | Verify JWT from authorization header. |
| `POST` | `/api/logout` | Clear auth cookie. |
| `POST` | `/api/forgot-password` | Create password reset flow token. |
| `POST` | `/api/reset-password` | Reset password with token. |

### User and files

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/get` | Fetch current user profile. |
| `POST` | `/api/edituser` | Update profile details. |
| `POST` | `/api/upload` | Upload profile image. |
| `GET` | `/api/get-uploaded-file?file=...` | Serve uploaded image/file. |

### Transactions

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/transactions` | Fetch all user transactions newest first. |
| `POST` | `/api/entertransaction` | Insert one transaction. |
| `POST` | `/api/edittransaction` | Edit one transaction. |
| `POST` | `/api/deletetransaction` | Delete one transaction. |
| `POST` | `/api/pertransdata` | Fetch one transaction. |
| `POST` | `/api/bulktransaction` | Insert many transactions in one batch. |

### Categories

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/category` | Fetch categories for current user. |
| `POST` | `/api/entercategory` | Add a category. |
| `POST` | `/api/deletecategory` | Delete a category. |

### Dashboard analytics

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` / `POST` | `/api/creditdebit` | Dashboard totals for income, debit, investment. |
| `GET` / `POST` | `/api/transtable` | Daily cash-flow chart data. |
| `GET` / `POST` | `/api/cattotal` | Debit category totals for pie chart. |
| `GET` / `POST` | `/api/banktrend` | Per-bank totals. |

POST body for date-filtered analytics:

```json
{
  "StartDate": "2026-01-01",
  "EndDate": "2026-04-29"
}
```

### Budget, analysis, trends, goals

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` / `POST` / `DELETE` | `/api/budget` | Read, save, and delete monthly budgets. |
| `GET` | `/api/analysis?months=6` | Financial health and analysis data. |
| `GET` | `/api/monthtrend?months=6` | Month-over-month trend data. |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/goals` | Savings goals. |

### Export and AI

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/export` | Download transaction CSV. |
| `GET` | `/api/ai` | Ask local Ollama for financial insight. |
| `GET` | `/api/ollama-check` | Test Ollama connectivity and list models. |

CSV export examples:

```txt
/api/export
/api/export?startDate=2026-01-01
/api/export?endDate=2026-04-29
/api/export?startDate=2026-01-01&endDate=2026-04-29
```

## Import System Details

The import logic is in:

```txt
src/app/protected/transfers.js
```

Supported file types include:

- PDF;
- CSV;
- XLS;
- XLSX.

The import flow generally has these stages:

1. User opens Transfers.
2. User clicks Import.
3. User chooses a file.
4. The frontend reads the file.
5. If the file structure is recognized, rows are parsed automatically.
6. If the file is generic, the user maps columns.
7. Rows are previewed.
8. Categories can be assigned.
9. Valid rows are sent to the backend.
10. The transaction table and analytics are refreshed.

### Date normalization

The app tries to normalize common date formats:

```txt
YYYY-MM-DD
DD/MM/YYYY
DD-MM-YYYY
DD.MM.YYYY
DD/MM/YY
DD-MM-YY
DD MMM YYYY
MM/DD/YYYY for explicitly selected US-style imports
```

The database stores final dates as:

```txt
YYYY-MM-DD
```

### Auto-categorization

Transfers contains a rule engine called `AUTO_CAT_RULES`.

Each rule has:

```js
{
  pattern: /REGEX/i,
  category: "Food",
  type: "Debit" // optional
}
```

Rules are checked from top to bottom. The first match wins.

The categorizer uses:

- transaction description;
- extracted merchant name for some bank-specific UPI formats;
- optional transaction type guard.

Examples of categories assigned by rules:

- Salary
- Food
- Shopping
- Transportation
- Entertainment
- Utilities
- Health Care
- Rent
- Personal Care
- Friends
- Miscellaneous

### Bank selector

Manual add, bulk entry, and inline edit include a bank/account selector. Bank name is saved on the transaction as `bank_name`.

### Import safety

Invalid imported rows are skipped rather than inserted.

Examples of invalid rows:

- missing date;
- unparseable date;
- missing amount;
- negative amount;
- invalid type.

## AI / Ollama Details

MoneyPot uses local Ollama, not a cloud LLM provider.

Settings are configured in:

```txt
Settings -> AI / Ollama
```

Default:

```txt
URL:   http://localhost:11434
Model: llama3.2
```

The app checks Ollama with:

```txt
GET /api/ollama-check
```

The AI insight endpoint is:

```txt
GET /api/ai
```

Frontend request headers:

```txt
X-Ollama-Url
X-Ollama-Model
Authorization
```

The AI endpoint:

1. Authenticates the user.
2. Fetches transactions from the last 3 months.
3. Compresses rows to reduce prompt size.
4. Builds a compact finance prompt.
5. Calls:

```txt
POST <ollama-url>/api/chat
```

with streaming disabled.

Only the selected local Ollama server receives this prompt. If Ollama is running locally, data stays on the user's machine.

## Development Notes

### Useful commands

```bash
npm run dev
npm run build
npm start
```

### Reset database

Stop the app, then remove:

```txt
collection.db
collection.db-shm
collection.db-wal
```

The app creates a clean database automatically on the next launch.

### Build behavior

The project uses Next.js standalone output:

```js
// next.config.mjs
output: 'standalone'
```

This is used by the Electron packaging workflow.

### Adding a new dashboard rule

Dashboard cards are driven by:

```txt
src/app/api/creditdebit/route.js
```

Daily chart data is driven by:

```txt
src/app/api/transtable/route.js
```

If you change a financial classification rule, update both files so the cards and chart agree.

### Adding a new trend rule

Trends are driven by:

```txt
src/app/api/monthtrend/route.js
```

If the dashboard definition changes, check whether Trends should change too.

### Adding a new financial-health rule

Financial health is driven by:

```txt
src/app/api/analysis/route.js
```

Update both the numeric calculations and the explanation fields in `healthSummary`, otherwise the UI may display stale math.

### Adding a new category icon

Category icon support is in:

```txt
src/app/protected/categories.js
```

Categories store lucide icons using a string format similar to:

```txt
lucide:IconName
```

The UI maps the stored icon name to the imported lucide component.

### Adding a new import rule

Auto-categorization rules live in `AUTO_CAT_RULES` in:

```txt
src/app/protected/transfers.js
```

Add more specific merchant rules above generic fallback rules.

Example:

```js
{ pattern: /MERCHANT_NAME/i, category: "Food" }
```

## Known Limitations

- SQLite is excellent for local personal finance use, but not ideal for high-concurrency multi-user hosting.
- The app currently keeps most navigation inside one protected client shell rather than separate URLs per feature.
- PDF parsing works best on text-based statements, not scanned image PDFs.
- Auto-categorization is regex-based and should be reviewed after imports.
- Some calculations depend on category names containing keywords such as `self`, `investment`, and `redemption`.
- If category naming changes, financial rules may need updating.
- The app is designed as a local Electron application; do not expose its local server publicly.

## Security Notes

- Passwords are hashed with bcrypt.
- JWTs expire after 24 hours and are stored only in an HttpOnly cookie.
- Middleware protects `/protected`.
- Middleware verifies authenticated API requests from the session cookie.
- Transaction edit/delete routes verify transaction ownership before changing data.
- Packaged builds reject environment and database files during the packaging audit.
- Do not commit local database files.

## License

MIT. See [LICENSE](./LICENSE).
