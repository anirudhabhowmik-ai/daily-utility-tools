import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "DailyTools | Premium Privacy-First Web Utilities",
  description: "Fast, free, and beautifully designed web tools. No sign-up, no data tracking. 100% client-side processing.",
  openGraph: {
    title: "DailyTools | Premium Web Utilities",
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