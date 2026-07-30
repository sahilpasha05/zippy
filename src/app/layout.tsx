import type { Metadata } from "next";
import Script from "next/script";
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
      <body className="min-h-screen bg-white antialiased">
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-7L0GLNZ8MP" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7L0GLNZ8MP');
          `}
        </Script>
      </body>
    </html>
  );
}
