
import type { MetadataRoute } from "next";

const BASE_URL = "https://toolsab.com";

// Add the slugs of unfinished/hidden tools here.
// Use the same slugs that you hid on your homepage.
const HIDDEN_TOOL_SLUGS = new Set<string>([
  // "visa-photo-checker",
  // "upload-readiness-checker",
]);

// Main pages
const mainPages = [
  "/",
  "/about",
  "/contact",
  "/privacy-policy",
];

// PDF pages from your Vercel build output
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

// Standalone tools from your homepage
const standaloneTools = [
  "/tools/stamp-generator",
  "/tools/board-and-batten",
  "/tools/offline-image-redactor",
  "/tools/local-only-password-generator",
  "/tools/jwt-decoder",
  "/tools/french-drain-gravel-calculator",
  "/tools/epoxy-floor-coating-calculator",
  "/tools/stair-carpet-calculator",
  "/tools/pattern-aware-tile-calculator",
  "/tools/photo-to-coloring-page-converter",
  "/tools/llm-token-cost-calculator",
  "/tools/freelancer-scope-guard",
  "/tools/board-feet-calculator",
  "/tools/exotic-pet-nutrition-calculator",
  "/tools/calligraphy-practice-sheet-generator",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const allPages = [
    ...mainPages,
    // ...pdfPages,
    ...standaloneTools,
  ];

  // Remove duplicate URLs
  const uniquePages = [...new Set(allPages)];

  return uniquePages.map((path) => ({
    url: `${BASE_URL}${path}`,
  }));
}
