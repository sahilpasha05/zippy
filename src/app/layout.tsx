import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zippy — Groceries & Restaurants Delivered Fast",
  description: "India's most premium grocery and restaurant ordering platform. Delivered in minutes.",
  keywords: "groceries, restaurants, delivery, hyperlocal, India, Zippy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">{children}</body>
    </html>
  );
}
