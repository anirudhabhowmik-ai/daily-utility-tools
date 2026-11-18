"use client";

import type { AdditionalToolKind } from "./config";
import TravelTools from "./TravelTools";
import FormTools from "./FormTools";
import MoneyTools from "./MoneyTools";
import CraftTools from "./CraftTools";
import PrivacyTools from "./PrivacyTools";
import MediaTools from "./MediaTools";

const categoryByTool: Record<AdditionalToolKind, string> = {
  "plug-voltage-checker": "Travel and time",
  "cabin-bag-size-checker": "Travel and time",
  "jet-lag-planner": "Travel and time",
  "time-zone-overlap-finder": "Travel and time",
  "visa-photo-checker": "Photo and upload",
  "upload-readiness-checker": "Photo and upload",
  "passport-photo-sheet-maker": "Photo and upload",
  "cross-marketplace-price-calculator": "Money and planning",
  "notice-period-date-calculator": "Money and planning",
  "subscription-cost-visualizer": "Money and planning",
  "trip-expense-splitter": "Money and planning",
  "image-to-cross-stitch-bead-pattern": "Craft and print",
  "lego-mosaic-planner": "Craft and print",
  "printable-planner-generator": "Craft and print",
  "file-metadata-viewer": "Privacy and files",
  "screenshot-redaction-tool": "Privacy and files",
  "subtitle-timing-shifter": "Media and print",
  "print-size-quality-checker": "Media and print",
  "recipe-scaler": "Media and print",
  "event-seating-planner": "Media and print",
};

const toolNames: Record<AdditionalToolKind, string> = {
  "plug-voltage-checker": "Plug and voltage check",
  "cabin-bag-size-checker": "Cabin bag comparison",
  "jet-lag-planner": "Jet lag schedule",
  "time-zone-overlap-finder": "Working-hours overlap",
  "visa-photo-checker": "Photo requirements check",
  "upload-readiness-checker": "File readiness check",
  "passport-photo-sheet-maker": "4 × 6 photo sheet",
  "cross-marketplace-price-calculator": "Seller price planner",
  "notice-period-date-calculator": "Notice date calculation",
  "subscription-cost-visualizer": "Recurring-cost overview",
  "trip-expense-splitter": "Shared trip ledger",
  "image-to-cross-stitch-bead-pattern": "Stitch and bead pattern",
  "lego-mosaic-planner": "Block mosaic planner",
  "printable-planner-generator": "Printable page designer",
  "file-metadata-viewer": "Local metadata inspection",
  "screenshot-redaction-tool": "Screenshot redaction",
  "subtitle-timing-shifter": "Subtitle timing editor",
  "print-size-quality-checker": "Print resolution check",
  "recipe-scaler": "Recipe scaling",
  "event-seating-planner": "Seating layout",
};

export default function AdditionalToolInteractive({ kind }: { kind: AdditionalToolKind }) {
  const tool =
    kind === "plug-voltage-checker"
    || kind === "cabin-bag-size-checker"
    || kind === "jet-lag-planner"
    || kind === "time-zone-overlap-finder"
      ? <TravelTools kind={kind} />
      : kind === "visa-photo-checker"
        || kind === "upload-readiness-checker"
        || kind === "passport-photo-sheet-maker"
        ? <FormTools kind={kind} />
        : kind === "cross-marketplace-price-calculator"
          || kind === "notice-period-date-calculator"
          || kind === "subscription-cost-visualizer"
          || kind === "trip-expense-splitter"
          ? <MoneyTools kind={kind} />
          : kind === "image-to-cross-stitch-bead-pattern"
            || kind === "lego-mosaic-planner"
            || kind === "printable-planner-generator"
            ? <CraftTools kind={kind} />
            : kind === "file-metadata-viewer" || kind === "screenshot-redaction-tool"
              ? <PrivacyTools kind={kind} />
              : <MediaTools kind={kind} />;

  return (
    <section className="tool-interface" aria-label="Interactive tool workspace">
      <header className="tool-workspace-header">
        <div>
          <p className="tool-workspace-kicker">{categoryByTool[kind].toUpperCase()} · ToolsAB</p>
          <h2 className="tool-workspace-title">{toolNames[kind]}</h2>
          <p className="tool-workspace-caption">Configure your options, then review the result and its assumptions.</p>
        </div>
        <span className="tool-local-badge"><span aria-hidden="true">●</span> Runs in this browser</span>
      </header>
      {tool}
    </section>
  );
}
