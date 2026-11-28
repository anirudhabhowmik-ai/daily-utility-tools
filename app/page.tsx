import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ToolsAB | Premium Privacy-First Web Utilities",
  description:
    "Explore fast, free web utilities. Most tools work in your browser; PDF conversions use a processing service.",
  alternates: { canonical: "/" },
};

type Tool = {
  title: string;
  category: string;
  href: string;
};

const allTools: Tool[] = [
  // AI & Image Tools
  {
    title: "AI Old Photo Restorer",
    category: "AI & Image Tools",
    href: "/tools/ai-old-photo-restorer",
  },
  {
    title: "Photo To Pencil Sketch",
    category: "AI & Image Tools",
    href: "/tools/pencil-sketch",
  },

  // Text & Writing
  {
    title: "Fancy Text Generator",
    category: "Text & Writing",
    href: "/tools/fancy-text-generator",
  },

  // Brain Games
  {
    title: "Reaction Speed Test",
    category: "Brain Games",
    href: "/tools/reaction-speed-test",
  },
  {
    title: "Number Memory Test",
    category: "Brain Games",
    href: "/tools/number-memory-test",
  },
  {
    title: "Visual Memory Test",
    category: "Brain Games",
    href: "/tools/visual-memory-test",
  },
  {
    title: "Sequence Memory Test",
    category: "Brain Games",
    href: "/tools/sequence-memory-test",
  },
  {
    title: "Typing Speed Test",
    category: "Brain Games",
    href: "/tools/typing-speed-test",
  },
  {
    title: "Word Memory Test",
    category: "Brain Games",
    href: "/tools/word-memory-test",
  },
  {
    title: "Color Blindness Test",
    category: "Brain Games",
    href: "/tools/color-blindness-test",
  },
  {
    title: "Focus and Concentration Test",
    category: "Brain Games",
    href: "/tools/focus-test",
  },
  {
    title: "Mental Math Challenge",
    category: "Brain Games",
    href: "/tools/mental-math-challenge",
  },

  // Student Productivity
  {
    title: "Study Stopwatch & Tracker",
    category: "Student Productivity",
    href: "/tools/study-stopwatch",
  },
  {
    title: "Pomodoro Study Timer",
    category: "Student Productivity",
    href: "/tools/pomodoro-study-timer",
  },
  {
    title: "Smart Study Planner",
    category: "Student Productivity",
    href: "/tools/smart-study-planner",
  },
  {
    title: "Exam Countdown Tracker",
    category: "Student Productivity",
    href: "/tools/exam-countdown-tracker",
  },
  {
    title: "Study Habit Tracker",
    category: "Student Productivity",
    href: "/tools/study-habit-tracker",
  },
  {
    title: "Flashcard Maker",
    category: "Student Productivity",
    href: "/tools/flashcard-maker",
  },
  {
    title: "Spaced Repetition Planner",
    category: "Student Productivity",
    href: "/tools/spaced-repetition-planner",
  },
  {
    title: "Custom Quiz Maker",
    category: "Student Productivity",
    href: "/tools/custom-quiz-maker",
  },
  {
    title: "Syllabus Progress Tracker",
    category: "Student Productivity",
    href: "/tools/syllabus-progress-tracker",
  },
  {
    title: "Vocabulary Builder",
    category: "Student Productivity",
    href: "/tools/vocabulary-builder",
  },
  {
    title: "Cornell Notes Generator",
    category: "Student Productivity",
    href: "/tools/cornell-notes-generator",
  },
  {
    title: "Mind Map Maker",
    category: "Student Productivity",
    href: "/tools/mind-map-maker",
  },
  {
    title: "Printable Notebook Generator",
    category: "Student Productivity",
    href: "/tools/printable-notebook-generator",
  },
  {
    title: "Essay Outline Builder",
    category: "Student Productivity",
    href: "/tools/essay-outline-builder",
  },
  {
    title: "Reading Progress Tracker",
    category: "Student Productivity",
    href: "/tools/reading-progress-tracker",
  },
  {
    title: "Random Study Topic Picker",
    category: "Student Productivity",
    href: "/tools/random-study-topic-picker",
  },
  {
    title: "Study Break Reminder",
    category: "Student Productivity",
    href: "/tools/study-break-reminder",
  },
  {
    title: "Lecture Note Organizer",
    category: "Student Productivity",
    href: "/tools/lecture-note-organizer",
  },
  {
    title: "Distraction Log Tracker",
    category: "Student Productivity",
    href: "/tools/distraction-log-tracker",
  },
  {
    title: "Study Group Session Planner",
    category: "Student Productivity",
    href: "/tools/study-group-session-planner",
  },

  // Digital Planning
  {
    title: "Digital Stamp Generator",
    category: "Digital Planning",
    href: "/tools/stamp-generator",
  },
  {
    title: "Calligraphy Practice Sheet Generator",
    category: "Digital Planning",
    href: "/tools/calligraphy-practice-sheet-generator",
  },

  // Home Improvement
  {
    title: "Board & Batten Calculator",
    category: "Home Improvement",
    href: "/tools/board-and-batten",
  },
  {
    title: "French Drain Gravel Calculator",
    category: "Home Improvement",
    href: "/tools/french-drain-gravel-calculator",
  },
  {
    title: "Epoxy Floor Coating Calculator",
    category: "Home Improvement",
    href: "/tools/epoxy-floor-coating-calculator",
  },
  {
    title: "Stair Carpet Calculator",
    category: "Home Improvement",
    href: "/tools/stair-carpet-calculator",
  },
  {
    title: "Pattern-Aware Tile Calculator",
    category: "Home Improvement",
    href: "/tools/pattern-aware-tile-calculator",
  },

  // Privacy Tools
  {
    title: "Offline Image Redactor",
    category: "Privacy Tools",
    href: "/tools/offline-image-redactor",
  },
  {
    title: "Local-Only Password Generator",
    category: "Privacy Tools",
    href: "/tools/local-only-password-generator",
  },

  // Developer Tools
  {
    title: "JWT Decoder",
    category: "Developer Tools",
    href: "/tools/jwt-decoder",
  },
  {
    title: "LLM Token Cost Calculator",
    category: "Developer Tools",
    href: "/tools/llm-token-cost-calculator",
  },
  {
    title: "Favicon Generator",
    category: "Developer Tools",
    href: "/tools/favicon-generator",
  },

  // Creators
  {
    title: "Photo-to-Coloring-Page Converter",
    category: "Creators",
    href: "/tools/photo-to-coloring-page-converter",
  },
  {
    title: "Photo to Pixel Art Converter",
    category: "Creators",
    href: "/tools/photo-to-pixel-art-converter",
  },

  // Business
  {
    title: "Freelancer Scope Guard",
    category: "Business",
    href: "/tools/freelancer-scope-guard",
  },

  // Woodworking
  {
    title: "Board Feet Calculator",
    category: "Woodworking",
    href: "/tools/board-feet-calculator",
  },

  // Pets
  {
    title: "Exotic Pet Feeding Tracker",
    category: "Pets",
    href: "/tools/exotic-pet-nutrition-calculator",
  },
];

const groupedTools = allTools.reduce<Record<string, Tool[]>>((groups, tool) => {
  if (!groups[tool.category]) {
    groups[tool.category] = [];
  }
  groups[tool.category].push(tool);
  return groups;
}, {});

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-hero-badge">
            <span aria-hidden="true" /> Thoughtful tools. Private by design.
          </span>

          <h1>
            Small tools.
            <br />
            <span>Less friction.</span>
          </h1>

          <p>
            A considered collection of useful utilities for work and everyday
            life. No account required, and most tools process your data right in
            your browser.
          </p>

          <div className="home-hero-actions">
            <Link href="#tools" className="btn">
              Explore all tools <span aria-hidden="true">↓</span>
            </Link>

            <Link href="/about" className="home-secondary-link">
              How ToolsAB works <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <ul className="home-trust-points" aria-label="ToolsAB benefits">
            <li>
              <span aria-hidden="true">✓</span> No sign-up
            </li>
            <li>
              <span aria-hidden="true">✓</span> Privacy-minded
            </li>
            <li>
              <span aria-hidden="true">✓</span> Free to use
            </li>
          </ul>
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-hero-glow" />

          <div className="home-showcase-card">
            <div className="home-showcase-top">
              <span>DAILY TOOLKIT</span>
              <span className="home-live-dot" /> READY WHEN YOU ARE
            </div>

            <div className="home-showcase-heading">
              Make room for
              <br />
              the work that matters.
            </div>

            <div className="home-showcase-grid">
              <span>
                <i>01</i> Calculate
              </span>
              <span>
                <i>02</i> Create
              </span>
              <span>
                <i>03</i> Organize
              </span>
              <span>
                <i>04</i> Protect
              </span>
            </div>

            <div className="home-showcase-footer">
              <span>Useful by nature</span>
              <span>↗</span>
            </div>
          </div>

          <div className="home-privacy-float">
            <span aria-hidden="true">✦</span>
            <span>
              <strong>Made for your browser</strong>
              <small>Your work stays yours</small>
            </span>
          </div>
        </div>
      </section>

      {/* Tools heading */}
      <div className="tools-section-heading" id="tools">
        <div>
          <p className="section-eyebrow">THE TOOLBOX</p>
          <h2>Find your next useful thing</h2>
        </div>

        <p>Simple, focused tools for the little jobs that add up.</p>
      </div>

      {/* Grouped tools */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        {Object.entries(groupedTools).map(([category, tools], groupIndex) => (
          <section key={category} aria-labelledby={`category-${groupIndex}`}>
            <div className="tools-section-heading">
              <div>
                <p className="section-eyebrow">EXPLORE CATEGORY</p>
                <h2 id={`category-${groupIndex}`}>{category}</h2>
              </div>

              <p>
                {tools.length} {tools.length === 1 ? "tool" : "tools"}
              </p>
            </div>

            <div className="tools-grid">
              {tools.map((tool, index) => (
                <Link
                  href={tool.href}
                  key={tool.href}
                  className="tool-card"
                  style={{
                    animationDelay: `${(groupIndex * 3 + index) * 0.05}s`,
                  }}
                >
                  <div className="tool-card-top">
                    <span className="tool-category">{tool.category}</span>
                    <span className="tool-arrow">↗</span>
                  </div>

                  <h2>{tool.title}</h2>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* About */}
      <div className="article-content">
        <h2>Why Build ToolsAB?</h2>

        <p>
          If you have ever searched for a simple calculator or image converter,
          you know the frustration. Many websites are cluttered with intrusive
          pop-up ads, force you to create an account, or upload files without
          clearly explaining how they are processed.
        </p>

        <p>
          I built ToolsAB to fix this. As a developer, I wanted a clean, fast,
          and ad-light environment where people could solve everyday problems in
          seconds. Most tools process data in your browser; PDF conversions use
          a processing service and explain that before you upload.
        </p>

        <h2>How Our &quot;Client-Side&quot; Tools Work</h2>

        <p>
          Many tools on this site process data locally in your browser. PDF
          conversion tools are an exception: files are sent to a processing
          service, as explained on each PDF tool page.
        </p>

        <p>
          Browser-based tools keep their processing on your device. Some save
          drafts in browser storage or create shareable links; each page
          explains those behaviors so you can choose what to save or share.
        </p>
      </div>
    </div>
  );
}
