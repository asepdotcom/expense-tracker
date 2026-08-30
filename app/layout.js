import "./globals.css";

export const metadata = {
  title: "Expense Tracker",
  description: "Track your expenses, add items, and total them into records.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
