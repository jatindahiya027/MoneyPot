# MoneyPot <img src="./readme/logo.png" alt="Alt Text" width="50" height="50">

**MoneyPot** is a sleek and user-friendly personal finance tracker built with **Next.js**. It helps you manage your expenses, track transactions, and analyze spending patterns efficiently. MoneyPot features powerful APIs to summarize your financial data and utilizes **SQLite** as its backend database.

---

## 🚀 Features

- **Dashboard Overview**: Get a quick insight into your total credits, debits, and savings.
- **Transaction Tracking**: Record, edit, and delete transactions across multiple categories.
- **Category Management**: Create and organize custom categories for better classification of your finances.
- **Spending Analysis**: Visualize your spending trends through charts and graphs.
- **AI Insights**: Get summarized and actionable insights using **GROQ APIs**.
- **Dark Theme**: Minimalistic and intuitive dark UI for a great user experience.

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/)
- **Backend**: SQLite (lightweight and efficient relational database)
- **APIs**: GROQ API for financial summarization
- **Charts and Graphs**: Data visualizations powered by shadcn/ui

---


## 🖥️ Screenshots
### Login
![Dashboard](./readme/img%20(1).png)
### Sign up
![Dashboard](./readme/img%20(2).png)
### Dashboard
![Dashboard](./readme/img%20(3).png)

### Transfers
![Transfers](./readme/img%20(4).png)

### Categories
![Categories](./readme/img%20(5).png)

---

## 📋 Installation and Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jatindahiya027/MoneyPot.git
   cd MoneyPot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
3. Create db file
    ```bash
    node createdb.js
    node enterdata.js
    ```
4. Run the development server:
   ```bash
   npm run dev
   ```

5. Visit the app at `http://localhost:3000`.

---

## 📊 How It Works

1. **Dashboard**: Shows an overview of credits, debits, and savings, with interactive charts for detailed analysis.
2. **Transfers Page**: View and manage all your transactions.
3. **Categories Page**: Customize spending categories for accurate tracking.
4. **AI Summarization**: GROQ API analyzes your transactions and provides key insights.

---

## 🛡️ Security and Privacy

- All financial data is stored in the **SQLite** database.
- The transactions are secured by the use of JWT tokens. No one else can see or edit your data.

---

## 🌟 Contributing

We welcome contributions! Please open an issue or submit a pull request if you want to improve MoneyPot.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---


Start tracking your finances today with **MoneyPot**! 💸
