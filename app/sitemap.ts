
import type { MetadataRoute } from "next";

const BASE_URL = "https://toolsab.com";

// Main website pages
const mainPages = [
  "/",
  "/about",
  "/contact",
  "/privacy-policy",
];

// PDF tools
// Uncomment the PDF pages when those pages are ready and publicly accessible.
//
// const pdfPages = [
//   "/pdf",
//   "/pdf/add-watermark",
//   "/pdf/compress-image",
//   "/pdf/compress-pdf",
//   "/pdf/crop-pdf",
//   "/pdf/delete-pdf",
//   "/pdf/edit-pdf",
//   "/pdf/excel-to-pdf",
//   "/pdf/extract-pdf",
//   "/pdf/html-to-pdf",
//   "/pdf/image-to-pdf",
//   "/pdf/merge-pdf",
//   "/pdf/ocr-pdf",
//   "/pdf/organize-pdf",
//   "/pdf/page-number",
//   "/pdf/pdf-to-excel",
//   "/pdf/pdf-to-image",
//   "/pdf/pdf-to-pdfa",
//   "/pdf/pdf-to-ppt",
//   "/pdf/pdf-to-word",
//   "/pdf/ppt-to-pdf",
//   "/pdf/protect-pdf",
//   "/pdf/remove-watermark",
//   "/pdf/rotate-pdf",
//   "/pdf/scan-pdf",
//   "/pdf/split-pdf",
//   "/pdf/unlock-pdf",
//   "/pdf/word-to-pdf",
// ];

// All standalone tools from the homepage
const standaloneTools = [
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

    // Uncomment when your PDF tools are ready:
    // ...pdfPages,
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
