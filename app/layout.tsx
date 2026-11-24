
import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "ToolsAB | Premium Privacy-First Web Utilities",
  description:
    "Fast, free web tools. Most tools run in your browser; PDF conversions use a processing service.",
  openGraph: {
    title: "ToolsAB | Premium Web Utilities",
    description: "Fast, free, and beautifully designed web tools.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5797619165090350"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Header />
        <main className="container" style={{ minHeight: "80vh" }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
