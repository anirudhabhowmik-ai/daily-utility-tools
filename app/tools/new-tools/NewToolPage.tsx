import type { AdditionalToolKind } from "./config";
import { ADDITIONAL_TOOLS } from "./config";
import AdditionalToolInteractive from "./AdditionalToolInteractive";
import ToolBreadcrumb from "../ToolBreadcrumb";

const categoryDetails: Record<AdditionalToolKind, { category: string; steps: string[]; faqs: Array<{ question: string; answer: string }> }> = {
  "plug-voltage-checker": { category: "Travel", steps: ["Choose your home country and destination.", "Select the plug type on the device and enter its printed input rating.", "Review the plug, voltage, and frequency notes, then verify details on the equipment and local guidance."], faqs: [{ question: "Will a plug adapter convert voltage?", answer: "No. A plug adapter only changes the physical connection. It does not convert voltage or frequency." }] },
  "cabin-bag-size-checker": { category: "Travel", steps: ["Enter the packed bag's outside dimensions and weight.", "Compare the measurements with the sample cabin-bag references.", "Follow an official airline link and confirm your fare's current allowance before travel."], faqs: [{ question: "Are the airline limits live?", answer: "No. The included limits are reference examples and can change. Policies may also depend on route, ticket, and item category." }] },
  "jet-lag-planner": { category: "Travel", steps: ["Choose the departure and arrival time zones.", "Enter local departure and arrival dates and times.", "Review the gradual schedule and adapt it to your needs."], faqs: [{ question: "Is this medical advice?", answer: "No. The plan is a general time-zone aid, not medical guidance. Individual sleep and light needs vary." }] },
  "time-zone-overlap-finder": { category: "Travel and work", steps: ["Choose three to five city time zones.", "Select a reference date and local working hours.", "Review the shared windows in each city's local time."], faqs: [{ question: "Does it account for daylight saving?", answer: "It uses the time-zone data provided by your browser for the selected date." }] },
  "visa-photo-checker": { category: "Photos and forms", steps: ["Select a starter photo profile or set custom pixel dimensions.", "Choose a photo file from your device.", "Review file type, file size, pixel dimensions, aspect ratio, and the approximate edge-background sample."], faqs: [{ question: "Does passing mean my photo will be accepted?", answer: "No. Automated image checks cannot confirm identity, pose, face placement, or an authority's current rules." }] },
  "upload-readiness-checker": { category: "Photos and forms", steps: ["Choose an example profile or enter accepted file extensions and a size limit.", "Select your file; the browser reads its basic properties locally.", "Compare the checks with the upload portal's own instructions."], faqs: [{ question: "Does this upload my file?", answer: "No. The file is inspected in your browser and is not sent to a server by this tool." }] },
  "passport-photo-sheet-maker": { category: "Photos and forms", steps: ["Choose a photo file and the intended crop size.", "Choose how many copies to arrange on one sheet.", "Create the 4 × 6 image and print it at actual size, then check a physical measurement."], faqs: [{ question: "Will the print dimensions be exact?", answer: "The image uses a 1200 × 1800 pixel layout. Printer settings can scale it, so choose actual size and measure the result." }] },
  "cross-marketplace-price-calculator": { category: "Money and selling", steps: ["Enter product, shipping, and other costs in one currency.", "Review or edit the fee, fixed-cost, tax-reserve, and target-markup assumptions.", "Use the suggested price as an estimate and confirm the platform's current fee schedule."], faqs: [{ question: "Are the marketplace fees guaranteed?", answer: "No. Fees vary by country, category, payment method, and policy. The sample rates are editable assumptions." }] },
  "notice-period-date-calculator": { category: "Dates and planning", steps: ["Enter the notice date and number of days.", "Choose calendar days or business days and decide whether the start date counts.", "For business-day counting, optionally enter holiday dates to exclude."], faqs: [{ question: "Can this interpret my contract?", answer: "No. It applies the counting convention you choose; it does not interpret a contract or local law." }] },
  "subscription-cost-visualizer": { category: "Money and planning", steps: ["Paste entries in the format name,amount,frequency,next-date.", "Edit the list, dates, frequencies, and shared currency as needed.", "Review recurring totals or download an .ics renewal calendar."], faqs: [{ question: "Where is my subscription list stored?", answer: "The list is saved in this browser's local storage. It is not synced to an account." }] },
  "trip-expense-splitter": { category: "Money and planning", steps: ["Add travelers and enter a matching currency for all expenses.", "For each expense, choose who paid and who shares it.", "Review the balances and create a link if you want to share the trip."], faqs: [{ question: "What is inside the share link?", answer: "Trip names, expenses, and split details are encoded in its URL fragment. Anyone who receives the link can read that information." }] },
  "image-to-cross-stitch-bead-pattern": { category: "Crafts", steps: ["Select a photo and set the target grid width and palette size.", "Create and review the simplified grid and color counts.", "Download the pattern image and CSV shopping estimate."], faqs: [{ question: "Do the colors match a specific thread brand?", answer: "No. Colors are approximate RGB matches and are not tied to a manufacturer's catalog." }] },
  "lego-mosaic-planner": { category: "Crafts", steps: ["Choose an image and a mosaic width.", "Choose a maximum color count and create the block layout.", "Review the per-color part estimate before sourcing pieces."], faqs: [{ question: "Are the part counts exact product colors?", answer: "The grid counts are exact for the generated design, but color names and part availability are not verified against a product catalog." }] },
  "printable-planner-generator": { category: "Planning and print", steps: ["Choose a calendar, habit tracker, or dot-grid page.", "Select A4 or Letter paper and adjust the available options.", "Download the PDF and inspect its print preview at actual size."], faqs: [{ question: "Can I print the page at any scale?", answer: "Scaling changes the dimensions and spacing. Print at actual size when you need the selected page measurements." }] },
  "file-metadata-viewer": { category: "Privacy and files", steps: ["Select a supported JPEG, PNG, PDF, or Word .docx file.", "Review any author, device, date, location, or software fields found.", "Inspect the file with a dedicated application if it contains information this tool cannot parse."], faqs: [{ question: "Does no metadata found mean my file is clean?", answer: "No. Some metadata may be compressed, encrypted, or stored in an unsupported format." }] },
  "screenshot-redaction-tool": { category: "Privacy and files", steps: ["Choose a screenshot and a mask style.", "Draw over the sensitive areas and undo or clear masks if needed.", "Export a flattened PNG and inspect the saved image before sharing."], faqs: [{ question: "Is pixelation safe for passwords or personal details?", answer: "Solid opaque masks are safer. Pixelation or blur can leave information recognizable." }] },
  "subtitle-timing-shifter": { category: "Media", steps: ["Paste SRT or WebVTT subtitle cues.", "Choose the output format and enter a timing shift in seconds.", "Review the converted text and download the resulting subtitle file."], faqs: [{ question: "Does this create subtitles from audio?", answer: "No. It shifts and converts existing cue timing and text only." }] },
  "print-size-quality-checker": { category: "Photos and print", steps: ["Enter the image's pixel width and height.", "Set the PPI threshold and review common or custom print sizes.", "Consider crop, sharpness, viewing distance, and printer quality before printing."], faqs: [{ question: "Does the tool inspect my image?", answer: "No. It estimates print resolution from the pixel dimensions you enter." }] },
  "recipe-scaler": { category: "Cooking", steps: ["Enter the original and desired serving counts.", "Paste ingredients one per line, starting with a quantity.", "Review scaled amounts and any approximate weight conversions."], faqs: [{ question: "Are cup-to-gram conversions exact?", answer: "No. Ingredient density and packing vary, so conversions are estimates." }] },
  "event-seating-planner": { category: "Events", steps: ["Add guests and tables, then set the seat capacity for each table.", "Drag guests between tables or back to the unassigned area.", "Export a PNG and save a separate copy before switching devices."], faqs: [{ question: "Where is the seating plan saved?", answer: "It is stored in this browser's local storage and is not synced to another device." }] },
};

export default function NewToolPage({ kind }: { kind: AdditionalToolKind }) {
  const tool = ADDITIONAL_TOOLS[kind];
  const details = categoryDetails[kind];
  return (
    <article className="animate-fade-in">
      <ToolBreadcrumb title={tool.title} />
      <header className="new-tool-page-header">
        <p className="tool-page-category">{details.category}</p>
        <h1>{tool.title}</h1>
        <p>{tool.summary}</p>
      </header>
      <AdditionalToolInteractive kind={kind} />
      <div className="article-content">
        <h2>About this tool</h2>
        <p>{tool.description} The controls are designed to make the inputs and assumptions visible so you can review a result before using it.</p>
        <h2>How to use it</h2>
        <ol>{details.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        {tool.dataNote && <><h2>Data and assumptions</h2><p>{tool.dataNote}</p></>}
        <h2>Important limitations</h2>
        <p>{tool.limitation}</p>
        <h2>Frequently asked questions</h2>
        <div className="tool-faq-list">
          {details.faqs.map((faq) => (
            <div className="tool-faq-item" key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </div>
        <div className="tool-local-note"><strong>Privacy note</strong><p>File processing and calculations run in your browser. Some tools save a working copy in browser storage or place data in a shareable link; the page explains those cases before you use them.</p></div>
      </div>
    </article>
  );
}
