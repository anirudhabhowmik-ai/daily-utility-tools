import type { Metadata } from "next";
import Link from "next/link";
import { ADDITIONAL_TOOLS } from "./tools/new-tools/config";

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
  ...Object.entries(ADDITIONAL_TOOLS).map(([slug, tool]) => ({
    title: tool.title,
    category: slug.includes("plug") || slug.includes("bag") || slug.includes("jet-lag") || slug.includes("time-zone") ? "Travel & Time"
      : slug.includes("visa") || slug.includes("upload") || slug.includes("passport") ? "Travel & Forms"
        : slug.includes("price") || slug.includes("notice") || slug.includes("subscription") || slug.includes("expense") ? "Money & Planning"
          : slug.includes("cross-stitch") || slug.includes("mosaic") || slug.includes("printable-planner") ? "Crafts & Planning"
            : slug.includes("metadata") || slug.includes("redaction") ? "Privacy & Files"
              : "Media & Print",
    href: `/tools/${slug}`,
  })),
];

export default function Home() {
  return (
    <div className="animate-fade-in">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-hero-badge"><span aria-hidden="true" /> Thoughtful tools. Private by design.</span>
          <h1>Small tools.<br /><span>Less friction.</span></h1>
          <p>
            A considered collection of useful utilities for work and everyday life. No account required, and most tools process your data right in your browser.
          </p>
          <div className="home-hero-actions">
            <Link href="#tools" className="btn">Explore all tools <span aria-hidden="true">↓</span></Link>
            <Link href="/about" className="home-secondary-link">How DailyTools works <span aria-hidden="true">↗</span></Link>
          </div>
          <ul className="home-trust-points" aria-label="DailyTools benefits">
            <li><span aria-hidden="true">✓</span> No sign-up</li>
            <li><span aria-hidden="true">✓</span> Privacy-minded</li>
            <li><span aria-hidden="true">✓</span> Free to use</li>
          </ul>
        </div>
        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-hero-glow" />
          <div className="home-showcase-card">
            <div className="home-showcase-top"><span>DAILY TOOLKIT</span><span className="home-live-dot" /> READY WHEN YOU ARE</div>
            <div className="home-showcase-heading">Make room for<br />the work that matters.</div>
            <div className="home-showcase-grid">
              <span><i>01</i> Calculate</span>
              <span><i>02</i> Create</span>
              <span><i>03</i> Organize</span>
              <span><i>04</i> Protect</span>
            </div>
            <div className="home-showcase-footer"><span>Useful by nature</span><span>↗</span></div>
          </div>
          <div className="home-privacy-float"><span aria-hidden="true">✦</span><span><strong>Made for your browser</strong><small>Your work stays yours</small></span></div>
        </div>
      </section>

      <div className="tools-section-heading">
        <div>
          <p className="section-eyebrow">THE TOOLBOX</p>
          <h2>Find your next useful thing</h2>
        </div>
        <p>Simple, focused tools for the little jobs that add up.</p>
      </div>

      <section className="tools-grid" id="tools">
        {allTools.map((tool, index) => (
          <Link 
            href={tool.href} 
            key={tool.href} 
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

      <div className="article-content home-about">
        <h2>Why Build DailyTools?</h2>
        <p>
          If you have ever searched for a simple calculator or image converter, you know the frustration. Most websites are cluttered with intrusive pop-up ads, force you to create an account, or worse—require you to upload your sensitive files to a server where you lose control of your data.
        </p>
        <p>
          I built DailyTools to fix this. As a developer, I wanted a clean, fast, and ad-light environment where people could solve everyday problems in seconds. Every tool on this site is built with a &quot;Privacy-First&quot; architecture.
        </p>

        <h2>How Our &quot;Client-Side&quot; Tools Work</h2>
        <p>
          Unlike traditional web applications, the tools on this site do not rely on a backend server to process your data. When you use our tools, the calculations and processing happen locally on your device.
        </p>
        <p>
          Most tools process your files, passwords, and text locally in your browser rather than sending them to a DailyTools processing server. A few tools save drafts in browser storage or create shareable links; each page explains those behaviors so you can choose what to save or share.
        </p>
      </div>
    </div>
  );
}