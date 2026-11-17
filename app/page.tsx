import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DailyTools | Premium Privacy-First Web Utilities",
  description: "Explore a collection of fast, free, and beautifully designed web tools. 100% client-side processing means your data never leaves your browser.",
  alternates: { canonical: "/" },
};

const allTools = [
  { title: "Digital Stamp Generator", category: "Digital Planning", href: "/tools/stamp-generator" },
  { title: "Board & Batten Calculator", category: "Home Improvement", href: "/tools/board-and-batten" },
  { title: "Offline Image Redactor", category: "Privacy Tools", href: "/tools/offline-image-redactor" },
  { title: "Local-Only Password Generator", category: "Privacy Tools", href: "/tools/local-only-password-generator" },
  { title: "JWT Decoder", category: "Developer Tools", href: "/tools/jwt-decoder" },
  { title: "French Drain Gravel Calculator", category: "Home Improvement", href: "/tools/french-drain-gravel-calculator" },
  { title: "Epoxy Floor Coating Calculator", category: "Home Improvement", href: "/tools/epoxy-floor-coating-calculator" },
  { title: "Stair Carpet Calculator", category: "Home Improvement", href: "/tools/stair-carpet-calculator" },
  { title: "Pattern-Aware Tile Calculator", category: "Home Improvement", href: "/tools/pattern-aware-tile-calculator" },
  { title: "Photo-to-Coloring-Page Converter", category: "Creators", href: "/tools/photo-to-coloring-page-converter" },
  { title: "LLM Token Cost Calculator", category: "Developer Tools", href: "/tools/llm-token-cost-calculator" },
  { title: "Freelancer Scope Guard", category: "Business", href: "/tools/freelancer-scope-guard" },
  { title: "Board Feet Calculator", category: "Woodworking", href: "/tools/board-feet-calculator" },
  { title: "Exotic Pet Feeding Tracker", category: "Pets", href: "/tools/exotic-pet-nutrition-calculator" },
  { title: "Calligraphy Practice Sheet Generator", category: "Digital Planning", href: "/tools/calligraphy-practice-sheet-generator" },
];

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* PREMIUM HERO SECTION */}
      <section style={{ padding: "8rem 0 5rem 0", textAlign: "center", position: "relative" }}>
        
        {/* Trust Badge */}
        <div style={{ 
          display: "inline-block", 
          padding: "6px 16px", 
          background: "rgba(255, 255, 255, 0.8)", 
          border: "1px solid var(--border-color)", 
          borderRadius: "100px",
          fontSize: "0.85rem",
          fontWeight: "600",
          color: "var(--text-muted)",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
        }}>
          ✨ 100% Client-Side & Privacy-First
        </div>

        <h1 style={{ maxWidth: "900px", margin: "0 auto 1.5rem auto" }}>
          Premium Utilities for <br />
          <span style={{ 
            background: "linear-gradient(90deg, #FF5A1F, #FF8C5A)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent" 
          }}>
            Modern Work.
          </span>
        </h1>
        
        <p style={{ fontSize: "1.25rem", maxWidth: "650px", margin: "0 auto 3rem auto", color: "var(--text-muted)" }}>
          Fast, free, and beautifully designed web tools. No sign-up required. 
          Your data never leaves your browser.
        </p>
      </section>

      <section className="tools-grid" id="tools">
        {allTools.map((tool, index) => (
          <Link 
            href={tool.href} 
            key={index} 
            className="tool-card" 
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="tool-card-top">
              <span className="tool-category">{tool.category}</span>
              <span className="tool-arrow">↗</span>
            </div>
            <h2>{tool.title}</h2>
          </Link>
        ))}
      </section>

      {/* HOMEPAGE SEO CONTENT */}
      <div className="article-content" style={{ marginTop: "6rem" }}>
        <h2>Why Build DailyTools?</h2>
        <p>
          If you have ever searched for a simple calculator or image converter, you know the frustration. Most websites are cluttered with intrusive pop-up ads, force you to create an account, or worse—require you to upload your sensitive files to a server where you lose control of your data.
        </p>
        <p>
          I built DailyTools to fix this. As a developer, I wanted a clean, fast, and ad-light environment where people could solve everyday problems in seconds. Every tool on this site is built with a "Privacy-First" architecture. 
        </p>

        <h2>How Our "Client-Side" Tools Work</h2>
        <p>
          Unlike traditional web applications, the tools on this site do not rely on a backend server to process your data. When you use our tools, the calculations and processing happen locally on your device.
        </p>
        <p>
          This means your images, passwords, and text never travel across the internet. They are processed entirely within your web browser using modern HTML5 and JavaScript APIs. This not only makes the tools incredibly fast but also guarantees your absolute privacy.
        </p>
      </div>
    </div>
  );
}