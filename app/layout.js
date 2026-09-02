import "./globals.css";

export const metadata = {
  title: "Expensetrax",
  description: "Track your expenses: add items, group them by date, and total them into records.",
  applicationName: "Expensetrax",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/logo.png", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

