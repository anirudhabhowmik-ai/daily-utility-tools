import type { Metadata } from "next";

export type AdditionalToolKind =
  | "plug-voltage-checker"
  | "cabin-bag-size-checker"
  | "jet-lag-planner"
  | "time-zone-overlap-finder"
  | "visa-photo-checker"
  | "upload-readiness-checker"
  | "passport-photo-sheet-maker"
  | "cross-marketplace-price-calculator"
  | "notice-period-date-calculator"
  | "subscription-cost-visualizer"
  | "trip-expense-splitter"
  | "image-to-cross-stitch-bead-pattern"
  | "lego-mosaic-planner"
  | "printable-planner-generator"
  | "file-metadata-viewer"
  | "screenshot-redaction-tool"
  | "subtitle-timing-shifter"
  | "print-size-quality-checker"
  | "recipe-scaler"
  | "event-seating-planner";

type ToolCopy = {
  title: string;
  description: string;
  summary: string;
  limitation: string;
  dataNote?: string;
};

export const ADDITIONAL_TOOLS: Record<AdditionalToolKind, ToolCopy> = {
  "plug-voltage-checker": {
    title: "Plug and Voltage Checker",
    description: "Check common socket types and supply voltage for a destination and compare them with your device rating.",
    summary: "Select a home location and destination, then check whether the plug shape and voltage need attention.",
    limitation: "Country entries are general references; socket types and voltage can vary by region, building, or circuit. Check the device label and local guidance before connecting equipment.",
    dataNote: "A plug adapter changes the physical connection, not voltage. A voltage converter is not a substitute for checking your device's input rating.",
  },
  "cabin-bag-size-checker": {
    title: "Cabin Bag Size Checker",
    description: "Compare cabin bag dimensions and weight with an editable set of airline reference limits.",
    summary: "Enter the outside dimensions of your packed bag and compare them with common airline cabin-bag limits.",
    limitation: "Airline rules change and can depend on fare, route, aircraft, and bag type. The bundled values are starter references, not live policy; confirm with the airline before travel.",
    dataNote: "The reference list is maintained in the project source and includes links for checking each airline's official baggage page.",
  },
  "jet-lag-planner": {
    title: "Jet Lag Planner",
    description: "Build a practical pre-trip sleep and light schedule from departure and arrival city time zones.",
    summary: "Use your flight details and destination time zone to create a gradual sleep-shift and light-exposure plan.",
    limitation: "This is a general planning aid, not medical advice. Light sensitivity, medication, health conditions, and individual sleep needs vary.",
  },
  "time-zone-overlap-finder": {
    title: "Time Zone Overlap Finder",
    description: "Find shared working windows across three to five cities using their selected time zones.",
    summary: "Compare local working hours across several cities and identify overlap windows on a chosen date.",
    limitation: "Results use the time-zone database in your browser and reflect daylight-saving rules known to that browser.",
  },
  "visa-photo-checker": {
    title: "Visa Photo Checker",
    description: "Check photo dimensions, aspect ratio, file size, and a basic background sample against an editable country starter profile.",
    summary: "Upload a photo locally, select a country starter profile, and review technical checks before submitting an application.",
    limitation: "Automated checks cannot certify identity, face position, expression, shadows, or acceptance by an authority. Verify the current official requirements for your application.",
    dataNote: "United Kingdom 35 × 45 mm and United States 2 × 2 inch entries are starter references only. Requirements vary by application and may change; dimensions and limits can be edited.",
  },
  "upload-readiness-checker": {
    title: "Upload Readiness Checker",
    description: "Check a file's type, size, and optional image dimensions against an editable portal or exam profile.",
    summary: "Select or configure an upload profile, then check a file locally before sending it to a portal.",
    limitation: "This checks file properties only. It does not confirm that a portal accepts the content or that its rules have not changed.",
  },
  "passport-photo-sheet-maker": {
    title: "Passport Photo Sheet Maker",
    description: "Arrange a local photo into a printable 4 × 6 inch sheet with configurable photo size and crop marks.",
    summary: "Choose a photo size and number of copies to create a 300-dpi 4 × 6 inch print sheet in your browser.",
    limitation: "Print sizing depends on printer settings. Print at 100% scale and check the physical measurement with a ruler.",
  },
  "cross-marketplace-price-calculator": {
    title: "Marketplace Price Calculator",
    description: "Estimate a selling price from product cost, shipping, marketplace fees, taxes, and target margin.",
    summary: "Compare a price estimate for several editable fee profiles and see the expected proceeds after costs.",
    limitation: "Fee structures vary by country, category, advertising, payment method, and policy changes. Edit the assumptions and verify current platform rates.",
  },
  "notice-period-date-calculator": {
    title: "Notice Period Date Calculator",
    description: "Calculate an estimated notice end date using calendar or business days and an optional starter holiday calendar.",
    summary: "Enter the notice date and duration to count calendar days or business days, with optional weekend and holiday exclusions.",
    limitation: "This calculator does not interpret contracts or local law. Notice rules differ by jurisdiction and situation; verify the applicable agreement and legal requirements.",
    dataNote: "Optional 2026–2027 US federal and England and Wales starter calendars are bundled. Coverage is limited; dates vary by location and change over time, and you can add or remove dates.",
  },
  "subscription-cost-visualizer": {
    title: "Subscription Cost Visualizer",
    description: "Organize recurring subscriptions, compare monthly and annual costs, and export renewal dates as a calendar file.",
    summary: "Add recurring charges or paste a simple list to see spending totals and upcoming renewal dates.",
    limitation: "Totals are based on the amounts and billing frequencies you enter. Taxes, currency conversion, and price changes are not inferred.",
  },
  "trip-expense-splitter": {
    title: "Trip Expense Splitter",
    description: "Record group trip expenses, calculate fair balances, and share the trip data in a link without an account.",
    summary: "Add travelers and expenses, choose who shared each cost, then calculate who should reimburse whom.",
    limitation: "Trip data is encoded in the share link and visible to anyone who receives it. Avoid adding sensitive information; long trips may create links that some apps cannot handle.",
  },
  "image-to-cross-stitch-bead-pattern": {
    title: "Photo to Cross-Stitch or Bead Pattern",
    description: "Convert an image into a local pixel grid with a limited palette and per-color stitch or bead counts.",
    summary: "Choose a grid size and palette, preview a simplified pattern, and download the pattern image and color-count list.",
    limitation: "Palette matches are approximate and do not correspond to a specific manufacturer's color codes unless you compare them manually.",
  },
  "lego-mosaic-planner": {
    title: "LEGO-Style Mosaic Planner",
    description: "Create a block mosaic from an image and estimate piece counts for a small reference palette.",
    summary: "Convert a photo into a block-by-block design and see the number of pieces required for each selected color.",
    limitation: "Colors are approximate visual matches, not a guarantee of available parts or official product color names.",
  },
  "printable-planner-generator": {
    title: "Printable Planner Generator",
    description: "Create printable calendar, habit tracker, or dot-grid planner pages and download them as a PDF.",
    summary: "Choose a page style, paper size, date, and layout options to create a clean printable sheet.",
    limitation: "Printer margins and scaling vary. Print at actual size and review the preview before printing multiple copies.",
  },
  "file-metadata-viewer": {
    title: "What's Hiding in This File?",
    description: "Inspect supported photo, PDF, and Word document metadata locally before sharing a file.",
    summary: "Select a file to look for common author, device, GPS, software, and edit-date fields without uploading it.",
    limitation: "Some metadata is compressed, encrypted, or stored in formats this browser cannot parse. A clean result does not prove that a file contains no hidden information.",
  },
  "screenshot-redaction-tool": {
    title: "Screenshot Redaction Tool",
    description: "Mask sensitive parts of a screenshot locally, undo strokes, and export a flattened metadata-free PNG.",
    summary: "Select a screenshot, paint opaque masks over private details, review the result, and export a flattened PNG.",
    limitation: "Use solid masks for sensitive information; blur or pixelation can leave details recognizable. Review the exported image before sharing.",
  },
  "subtitle-timing-shifter": {
    title: "Subtitle Timing Shifter",
    description: "Shift subtitle timestamps, validate cues, and convert between SRT and WebVTT formats.",
    summary: "Paste subtitles, adjust their timing by milliseconds or seconds, and convert between common caption formats.",
    limitation: "This tool handles SRT and WebVTT timestamps and cue text. It does not transcribe audio or validate a video player's frame rate.",
  },
  "print-size-quality-checker": {
    title: "Print-Size Quality Checker",
    description: "Estimate photo print sizes from pixel dimensions at common print resolutions.",
    summary: "Enter an image's pixel dimensions and compare effective resolution across popular print sizes.",
    limitation: "The estimate does not account for cropping, printer quality, viewing distance, or image sharpness.",
  },
  "recipe-scaler": {
    title: "Recipe Scaler and Weight Converter",
    description: "Scale ingredient quantities and convert common volume units to approximate weights using editable ingredient densities.",
    summary: "Paste one ingredient per line, choose a scale factor, and review scaled amounts with optional gram estimates.",
    limitation: "Ingredient density varies with brand, grind, packing, and preparation. Gram conversions are estimates; weigh ingredients for precision.",
  },
  "event-seating-planner": {
    title: "Event Seating Planner",
    description: "Arrange guest names at tables with drag and drop, save the layout in your browser, and export a plan.",
    summary: "Create tables and guests, move guests between seats, and keep a local draft of the seating arrangement.",
    limitation: "The plan is saved only in this browser. Export a copy before clearing site data or switching devices.",
  },
};

export function isAdditionalToolKind(value: string): value is AdditionalToolKind {
  return Object.prototype.hasOwnProperty.call(ADDITIONAL_TOOLS, value);
}

export function getToolMetadata(kind: AdditionalToolKind): Metadata {
  const tool = ADDITIONAL_TOOLS[kind];
  return {
    title: `${tool.title} | ToolsAB`,
    description: tool.description,
    alternates: { canonical: `/tools/${kind}` },
  };
}
