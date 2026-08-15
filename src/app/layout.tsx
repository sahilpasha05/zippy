import type { Metadata } from "next";
import Script from "next/script";
import CanonicalUrl from "@/components/CanonicalUrl";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://zippytarikere.com"),
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
        <CanonicalUrl />
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
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "xunuon146t");
          `}
        </Script>
      </body>
    </html>
  );
}
