
import type { MetadataRoute } from "next";

const BASE_URL = "https://toolsab.com";

// Main website pages
const mainPages = [
  "/",
  "/about",
  "/contact",
  "/privacy-policy",
];

// All standalone tools from the homepage
const standaloneTools = [
  // AI & Image Tools
  "/tools/ai-old-photo-restorer",

  // Text & Writing
  "/tools/fancy-text-generator",

  // Brain Games
  "/tools/reaction-speed-test",
  "/tools/number-memory-test",
  "/tools/visual-memory-test",
  "/tools/sequence-memory-test",
  "/tools/typing-speed-test",
  "/tools/word-memory-test",
  "/tools/color-blindness-test",
  "/tools/focus-test",
  "/tools/mental-math-challenge",

  // Student Productivity
  "/tools/study-stopwatch",
  "/tools/pomodoro-study-timer",
  "/tools/smart-study-planner",
  "/tools/exam-countdown-tracker",
  "/tools/study-habit-tracker",
  "/tools/flashcard-maker",
  "/tools/spaced-repetition-planner",
  "/tools/custom-quiz-maker",
  "/tools/syllabus-progress-tracker",
  "/tools/vocabulary-builder",
  "/tools/cornell-notes-generator",
  "/tools/mind-map-maker",
  "/tools/printable-notebook-generator",
  "/tools/essay-outline-builder",
  "/tools/reading-progress-tracker",
  "/tools/random-study-topic-picker",
  "/tools/study-break-reminder",
  "/tools/lecture-note-organizer",
  "/tools/distraction-log-tracker",
  "/tools/study-group-session-planner",

  // Digital Planning
  "/tools/stamp-generator",
  "/tools/calligraphy-practice-sheet-generator",

  // Home Improvement
  "/tools/board-and-batten",
  "/tools/french-drain-gravel-calculator",
  "/tools/epoxy-floor-coating-calculator",
  "/tools/stair-carpet-calculator",
  "/tools/pattern-aware-tile-calculator",

  // Privacy Tools
  "/tools/offline-image-redactor",
  "/tools/local-only-password-generator",

  // Developer Tools
  "/tools/jwt-decoder",
  "/tools/llm-token-cost-calculator",
  "/tools/favicon-generator",

  // Creators
  "/tools/photo-to-coloring-page-converter",
  "/tools/photo-to-pixel-art-converter",

  // Business
  "/tools/freelancer-scope-guard",

  // Woodworking
  "/tools/board-feet-calculator",

  // Pets
  "/tools/exotic-pet-nutrition-calculator",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const allPages = [
    ...mainPages,
    ...standaloneTools,
  ];

  // Remove duplicate paths.
  const uniquePages = [...new Set(allPages)];

  return uniquePages.map((path) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency: "monthly",
    priority:
      path === "/"
        ? 1
        : path.startsWith("/tools/")
          ? 0.8
          : 0.6,
  }));
}
