import "./globals.css";

export const metadata = {
  title: "MoneyPot",
  description: "Your personal Expense tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Fonts are self-hosted via @fontsource — no external calls */}
      <body>{children}</body>
    </html>
  );
}
