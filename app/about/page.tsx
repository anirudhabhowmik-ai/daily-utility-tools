import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About DailyTools | Privacy-First Utility Collection",
  description: "Learn how DailyTools helps people complete common tasks with fast, private, browser-based tools.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="animate-fade-in">
      <header style={{ marginTop: "3rem", marginBottom: "2rem" }}>
        <h1>About DailyTools</h1>
        <p style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>
          DailyTools is built for everyday problem-solving without the clutter, sign-ups, and data-sharing practices that slow down normal web experiences.
        </p>
      </header>

      <div className="article-content">
        <h2>Our mission</h2>
        <p>
          Many online tools are overloaded with pop-ups, unclear pricing, and unnecessary account requirements. We wanted a simpler approach: a clean site with practical utilities, fast performance, and respect for user privacy.
        </p>
        <p>
          Every tool on DailyTools is designed to work directly in the browser. That means your files, notes, text, and calculations stay on your device unless you choose to download the result.
        </p>

        <h2>Why privacy matters</h2>
        <p>
          People often use utilities for work, planning, home projects, and personal tasks. That information can be sensitive, which is why we keep processing local whenever possible. No account is required, and no server-side copy is created unless you intentionally save a file.
        </p>

        <h2>Built for real-world use</h2>
        <p>
          Our library includes planning tools, home improvement calculators, developer utilities, and productivity helpers. We focus on useful, readable interfaces that make everyday decisions easier without overwhelming the reader with technical jargon or misleading claims.
        </p>

        <h2>Transparency</h2>
        <p>
          Some pages may display third-party advertising as part of a Monetization strategy. Those ads are separate from the utility experience and do not change the core privacy-first approach of the site.
        </p>
      </div>
    </article>
  );
}
