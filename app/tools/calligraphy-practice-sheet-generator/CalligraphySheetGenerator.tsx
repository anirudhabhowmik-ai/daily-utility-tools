"use client";

import { useMemo, useState } from "react";
import ToolShell, { NumberField, ToolLabel } from "../ToolShell";

type PageSize = "a4" | "letter";
type Orientation = "portrait" | "landscape";
type GuideStyle = "classic" | "minimal" | "dotted";

type ColorPreset = "blue" | "gray" | "purple" | "green" | "custom";

const PAGE_SIZES: Record<PageSize, { width: number; height: number; label: string }> = {
  a4: { width: 210, height: 297, label: "A4" },
  letter: { width: 215.9, height: 279.4, label: "US Letter" },
};

const COLOR_PRESETS: Record<
  Exclude<ColorPreset, "custom">,
  { label: string; baseline: string; middle: string; top: string; slant: string }
> = {
  blue: {
    label: "Classic blue",
    baseline: "#64748b",
    middle: "#94a3b8",
    top: "#cbd5e1",
    slant: "#e2e8f0",
  },
  gray: {
    label: "Soft gray",
    baseline: "#737373",
    middle: "#a3a3a3",
    top: "#d4d4d4",
    slant: "#e5e5e5",
  },
  purple: {
    label: "Lavender",
    baseline: "#8b5cf6",
    middle: "#c4b5fd",
    top: "#ddd6fe",
    slant: "#ede9fe",
  },
  green: {
    label: "Sage green",
    baseline: "#647c69",
    middle: "#9aaa9d",
    top: "#cbd5ce",
    slant: "#e2eae4",
  },
};

type GuideColors = {
  baseline: string;
  middle: string;
  top: string;
  slant: string;
};

type SheetSettings = {
  pageSize: PageSize;
  orientation: Orientation;
  lineSpacing: number;
  slantAngle: number;
  slantSpacing: number;
  margin: number;
  showSlant: boolean;
  showMiddle: boolean;
  showTop: boolean;
  showBaseline: boolean;
  guideStyle: GuideStyle;
  colorPreset: ColorPreset;
  colors: GuideColors;
  lineWidth: number;
  showBorder: boolean;
};

/* =========================================================
   Helpers
========================================================= */

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getPageDimensions(
  pageSize: PageSize,
  orientation: Orientation
) {
  const page = PAGE_SIZES[pageSize];

  const width =
    orientation === "portrait" ? page.width : page.height;

  const height =
    orientation === "portrait" ? page.height : page.width;

  return { width, height };
}

function getGuideDash(style: GuideStyle): string {
  if (style === "dotted") return "1 2";
  if (style === "minimal") return "none";
  return "4 3";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* =========================================================
   SVG Generator
========================================================= */

function generateCalligraphySvg(settings: SheetSettings): string {
  const { width, height } = getPageDimensions(
    settings.pageSize,
    settings.orientation
  );

  const margin = clamp(settings.margin, 5, 25);
  const lineSpacing = clamp(settings.lineSpacing, 6, 20);
  const slantAngle = clamp(settings.slantAngle, 35, 80);
  const slantSpacing = clamp(settings.slantSpacing, 5, 20);
  const lineWidth = clamp(settings.lineWidth, 0.1, 1.2);

  const innerWidth = width - margin * 2;
  const innerHeight = height - margin * 2;

  const rowCount = Math.floor(innerHeight / lineSpacing);

  const radians = (slantAngle * Math.PI) / 180;

  // Angle is measured from the horizontal baseline.
  // Horizontal drift from top to bottom of the page.
  const horizontalDrift = height / Math.tan(radians);

  const colors = settings.colors;

  const strokeLinecap = "round";

  const horizontalLines: string[] = [];

  for (let index = 0; index < rowCount; index++) {
    const topY = margin + index * lineSpacing;
    const middleY = topY + lineSpacing / 2;

    if (settings.showTop) {
      horizontalLines.push(
        `<line x1="${margin}" y1="${topY}" x2="${width - margin}" y2="${topY}" stroke="${escapeXml(
          colors.top
        )}" stroke-width="${lineWidth}" />`
      );
    }

    if (settings.showMiddle) {
      horizontalLines.push(
        `<line x1="${margin}" y1="${middleY}" x2="${width - margin}" y2="${middleY}" stroke="${escapeXml(
          colors.middle
        )}" stroke-width="${lineWidth}" stroke-dasharray="${getGuideDash(
          settings.guideStyle
        )}" />`
      );
    }
  }

  // Draw the final bottom baseline separately.
  const finalBaselineY = margin + rowCount * lineSpacing;

  if (settings.showBaseline && rowCount > 0) {
    horizontalLines.push(
      `<line x1="${margin}" y1="${finalBaselineY}" x2="${width - margin}" y2="${finalBaselineY}" stroke="${escapeXml(
        colors.baseline
      )}" stroke-width="${lineWidth * 1.4}" />`
    );
  }

  // Draw the baseline for each row.
  // It also acts as the top line of the following row.
  if (settings.showBaseline) {
    for (let index = 0; index < rowCount; index++) {
      const baselineY = margin + (index + 1) * lineSpacing;

      horizontalLines.push(
        `<line x1="${margin}" y1="${baselineY}" x2="${width - margin}" y2="${baselineY}" stroke="${escapeXml(
          colors.baseline
        )}" stroke-width="${lineWidth * 1.4}" />`
      );
    }
  }

  const slantLines: string[] = [];

  if (settings.showSlant) {
    // Lines are spaced by their x-coordinate at the top edge.
    // Extend the starting coordinates so the entire writing area is covered.
    const firstX = margin - horizontalDrift - slantSpacing;
    const lastX = width - margin;

    const numberOfSlantLines =
      Math.ceil((lastX - firstX) / slantSpacing) + 1;

    for (let index = 0; index < numberOfSlantLines; index++) {
      const x = firstX + index * slantSpacing;

      const bottomX = x + horizontalDrift;

      slantLines.push(
        `<line x1="${x}" y1="0" x2="${bottomX}" y2="${height}" stroke="${escapeXml(
          colors.slant
        )}" stroke-width="${lineWidth}" />`
      );
    }
  }

  const border = settings.showBorder
    ? `<rect x="${margin}" y="${margin}" width="${innerWidth}" height="${innerHeight}" fill="none" stroke="#e5e7eb" stroke-width="0.3" />`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}mm"
     height="${height}mm"
     viewBox="0 0 ${width} ${height}">
  <title>Calligraphy Practice Sheet</title>
  <desc>${PAGE_SIZES[settings.pageSize].label} calligraphy practice sheet with ${lineSpacing}mm writing spacing and ${slantAngle} degree slant guides.</desc>
  <defs>
    <clipPath id="writing-area">
      <rect x="${margin}" y="${margin}" width="${innerWidth}" height="${innerHeight}" />
    </clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="#ffffff" />
  <g clip-path="url(#writing-area)">
    ${slantLines.join("\n")}
    ${horizontalLines.join("\n")}
  </g>
  ${border}
</svg>`;
}

/* =========================================================
   Component
========================================================= */

export default function CalligraphySheetGenerator() {
  const [pageSize, setPageSize] = useState<PageSize>("letter");
  const [orientation, setOrientation] =
    useState<Orientation>("portrait");

  const [lineSpacing, setLineSpacing] = useState(12);
  const [slantAngle, setSlantAngle] = useState(55);
  const [slantSpacing, setSlantSpacing] = useState(8);
  const [margin, setMargin] = useState(12);
  const [lineWidth, setLineWidth] = useState(0.3);

  const [showSlant, setShowSlant] = useState(true);
  const [showMiddle, setShowMiddle] = useState(true);
  const [showTop, setShowTop] = useState(true);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showBorder, setShowBorder] = useState(false);

  const [guideStyle, setGuideStyle] =
    useState<GuideStyle>("classic");

  const [colorPreset, setColorPreset] =
    useState<ColorPreset>("blue");

  const [customColors, setCustomColors] = useState<GuideColors>(
    COLOR_PRESETS.blue
  );

  const [activeTab, setActiveTab] = useState<
    "layout" | "guides" | "style"
  >("layout");

  const [showAdvanced, setShowAdvanced] = useState(false);

  const colors =
    colorPreset === "custom"
      ? customColors
      : COLOR_PRESETS[colorPreset];

  const settings: SheetSettings = {
    pageSize,
    orientation,
    lineSpacing,
    slantAngle,
    slantSpacing,
    margin,
    showSlant,
    showMiddle,
    showTop,
    showBaseline,
    guideStyle,
    colorPreset,
    colors,
    lineWidth,
    showBorder,
  };

  const dimensions = useMemo(
    () => getPageDimensions(pageSize, orientation),
    [pageSize, orientation]
  );

  const innerWidth = dimensions.width - margin * 2;
  const innerHeight = dimensions.height - margin * 2;

  const rowCount = Math.floor(innerHeight / lineSpacing);

  const previewSvg = useMemo(
    () => generateCalligraphySvg(settings),
    [
      pageSize,
      orientation,
      lineSpacing,
      slantAngle,
      slantSpacing,
      margin,
      showSlant,
      showMiddle,
      showTop,
      showBaseline,
      guideStyle,
      colorPreset,
      customColors,
      lineWidth,
      showBorder,
    ]
  );

  const reset = () => {
    setPageSize("letter");
    setOrientation("portrait");
    setLineSpacing(12);
    setSlantAngle(55);
    setSlantSpacing(8);
    setMargin(12);
    setLineWidth(0.3);

    setShowSlant(true);
    setShowMiddle(true);
    setShowTop(true);
    setShowBaseline(true);
    setShowBorder(false);

    setGuideStyle("classic");
    setColorPreset("blue");
    setCustomColors(COLOR_PRESETS.blue);

    setActiveTab("layout");
    setShowAdvanced(false);
  };

  const downloadSvg = () => {
    const blob = new Blob([previewSvg], {
      type: "image/svg+xml;charset=utf-8",
    });

    downloadBlob(blob, `calligraphy-${pageSize}-${orientation}.svg`);
  };

  const printSheet = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      window.alert(
        "Your browser blocked the print window. Please allow pop-ups for this website."
      );
      return;
    }

    const page = PAGE_SIZES[pageSize];

    const printWidth =
      orientation === "portrait" ? page.width : page.height;

    const printHeight =
      orientation === "portrait" ? page.height : page.width;

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Calligraphy Practice Sheet</title>
          <meta charset="UTF-8" />
          <style>
            @page {
              size: ${printWidth}mm ${printHeight}mm;
              margin: 0;
            }

            html, body {
              width: ${printWidth}mm;
              height: ${printHeight}mm;
              margin: 0;
              padding: 0;
              background: white;
            }

            svg {
              display: block;
              width: ${printWidth}mm;
              height: ${printHeight}mm;
            }
          </style>
        </head>
        <body>
          ${previewSvg}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const updateColor = (
    key: keyof GuideColors,
    value: string
  ) => {
    setColorPreset("custom");

    setCustomColors((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const tabs = [
    { id: "layout" as const, label: "Page layout" },
    { id: "guides" as const, label: "Writing guides" },
    { id: "style" as const, label: "Appearance" },
  ];

  return (
    <ToolShell title="Calligraphy sheet designer" onReset={reset} wide>
      <div className="cs-wrapper">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="cs-header">
          <div>
            <span className="cs-eyebrow">CALLIGRAPHY WORKSPACE</span>
            <h2>Design your practice sheet</h2>
            <p>
              Create printable lettering guides with adjustable writing
              lines, slant angles, and paper layouts.
            </p>
          </div>

          <div className="cs-header-icon">✒️</div>
        </div>

        {/* =================================================
            MAIN GRID
        ================================================= */}

        <div className="cs-main-grid">
          {/* LEFT: SETTINGS */}

          <div className="cs-settings-column">
            <section className="cs-card">
              <div className="cs-card-heading">
                <div>
                  <span className="cs-step">01</span>
                  <h3>Customize your sheet</h3>
                </div>
              </div>

              <div className="cs-tabs" role="tablist" aria-label="Sheet settings">
                {tabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={activeTab === tab.id ? "cs-tab cs-tab-active" : "cs-tab"}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* PAGE LAYOUT */}

              {activeTab === "layout" && (
                <div className="cs-tab-content">
                  <ToolLabel>
                    Paper size
                    <select
                      className="tool-input"
                      value={pageSize}
                      onChange={(event) =>
                        setPageSize(event.target.value as PageSize)
                      }
                    >
                      <option value="letter">US Letter — 8.5 × 11 in</option>
                      <option value="a4">A4 — 210 × 297 mm</option>
                    </select>
                  </ToolLabel>

                  <ToolLabel>
                    Page orientation
                    <select
                      className="tool-input"
                      value={orientation}
                      onChange={(event) =>
                        setOrientation(event.target.value as Orientation)
                      }
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </ToolLabel>

                  <NumberField
                    label="Page margin (mm)"
                    value={margin}
                    min={5}
                    max={25}
                    onChange={(value) =>
                      setMargin(clamp(value, 5, 25))
                    }
                  />

                  <div className="cs-dimension-box">
                    <div>
                      <span>Page width</span>
                      <strong>{dimensions.width.toFixed(1)} mm</strong>
                    </div>

                    <div>
                      <span>Page height</span>
                      <strong>{dimensions.height.toFixed(1)} mm</strong>
                    </div>

                    <div>
                      <span>Writing width</span>
                      <strong>{innerWidth.toFixed(1)} mm</strong>
                    </div>

                    <div>
                      <span>Writing height</span>
                      <strong>{innerHeight.toFixed(1)} mm</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* WRITING GUIDES */}

              {activeTab === "guides" && (
                <div className="cs-tab-content">
                  <NumberField
                    label="Writing line spacing (mm)"
                    value={lineSpacing}
                    min={6}
                    max={20}
                    onChange={(value) =>
                      setLineSpacing(clamp(value, 6, 20))
                    }
                  />

                  <div className="cs-range-presets">
                    <span>Quick spacing</span>

                    {[8, 10, 12, 15, 18].map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={
                          lineSpacing === value
                            ? "cs-preset cs-preset-active"
                            : "cs-preset"
                        }
                        onClick={() => setLineSpacing(value)}
                      >
                        {value} mm
                      </button>
                    ))}
                  </div>

                  <NumberField
                    label="Slant angle (degrees)"
                    value={slantAngle}
                    min={35}
                    max={80}
                    onChange={(value) =>
                      setSlantAngle(clamp(value, 35, 80))
                    }
                  />

                  <div className="cs-range-presets">
                    <span>Common angles</span>

                    {[45, 52, 55, 60, 65].map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={
                          slantAngle === value
                            ? "cs-preset cs-preset-active"
                            : "cs-preset"
                        }
                        onClick={() => setSlantAngle(value)}
                      >
                        {value}°
                      </button>
                    ))}
                  </div>

                  <NumberField
                    label="Slant guide spacing (mm)"
                    value={slantSpacing}
                    min={5}
                    max={20}
                    onChange={(value) =>
                      setSlantSpacing(clamp(value, 5, 20))
                    }
                  />

                  <div className="cs-toggle-list">
                    <label className="cs-switch">
                      <span>
                        <strong>Slant guides</strong>
                        <small>Diagonal lettering guides</small>
                      </span>

                      <input
                        type="checkbox"
                        checked={showSlant}
                        onChange={(event) =>
                          setShowSlant(event.target.checked)
                        }
                      />
                      <span className="cs-switch-track" aria-hidden="true">
                        <span className="cs-switch-thumb" />
                      </span>
                    </label>

                    <label className="cs-switch">
                      <span>
                        <strong>Top writing lines</strong>
                        <small>Upper boundary of each writing row</small>
                      </span>

                      <input
                        type="checkbox"
                        checked={showTop}
                        onChange={(event) =>
                          setShowTop(event.target.checked)
                        }
                      />
                      <span className="cs-switch-track" aria-hidden="true">
                        <span className="cs-switch-thumb" />
                      </span>
                    </label>

                    <label className="cs-switch">
                      <span>
                        <strong>Middle lines</strong>
                        <small>Letter-height reference guides</small>
                      </span>

                      <input
                        type="checkbox"
                        checked={showMiddle}
                        onChange={(event) =>
                          setShowMiddle(event.target.checked)
                        }
                      />
                      <span className="cs-switch-track" aria-hidden="true">
                        <span className="cs-switch-thumb" />
                      </span>
                    </label>

                    <label className="cs-switch">
                      <span>
                        <strong>Baseline guides</strong>
                        <small>Bottom writing boundaries</small>
                      </span>

                      <input
                        type="checkbox"
                        checked={showBaseline}
                        onChange={(event) =>
                          setShowBaseline(event.target.checked)
                        }
                      />
                      <span className="cs-switch-track" aria-hidden="true">
                        <span className="cs-switch-thumb" />
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* APPEARANCE */}

              {activeTab === "style" && (
                <div className="cs-tab-content">
                  <ToolLabel>
                    Guide color theme
                    <select
                      className="tool-input"
                      value={colorPreset}
                      onChange={(event) =>
                        setColorPreset(event.target.value as ColorPreset)
                      }
                    >
                      <option value="blue">Classic blue</option>
                      <option value="gray">Soft gray</option>
                      <option value="purple">Lavender</option>
                      <option value="green">Sage green</option>
                      <option value="custom">Custom colors</option>
                    </select>
                  </ToolLabel>

                  <ToolLabel>
                    Middle line style
                    <select
                      className="tool-input"
                      value={guideStyle}
                      onChange={(event) =>
                        setGuideStyle(event.target.value as GuideStyle)
                      }
                    >
                      <option value="classic">Dashed</option>
                      <option value="minimal">Solid</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  </ToolLabel>

                  <div className="cs-color-list">
                    {(
                      [
                        ["baseline", "Baseline"],
                        ["middle", "Middle line"],
                        ["top", "Top line"],
                        ["slant", "Slant guides"],
                      ] as const
                    ).map(([key, label]) => (
                      <label className="cs-color-field" key={key}>
                        <span>{label}</span>
                        <input
                          type="color"
                          value={colors[key]}
                          onChange={(event) =>
                            updateColor(key, event.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>

                  <NumberField
                    label="Guide line thickness (mm)"
                    value={lineWidth}
                    min={0.1}
                    max={1.2}
                    onChange={(value) =>
                      setLineWidth(clamp(value, 0.1, 1.2))
                    }
                  />

                  <label className="cs-switch">
                    <span>
                      <strong>Writing area border</strong>
                      <small>Show a light border around the printable area</small>
                    </span>

                    <input
                      type="checkbox"
                      checked={showBorder}
                      onChange={(event) =>
                        setShowBorder(event.target.checked)
                      }
                    />
                    <span className="cs-switch-track" aria-hidden="true">
                      <span className="cs-switch-thumb" />
                    </span>
                  </label>
                </div>
              )}

              <button
                type="button"
                className="cs-advanced-button"
                onClick={() => setShowAdvanced((current) => !current)}
              >
                {showAdvanced ? "Hide" : "Show"} sheet information
                <span>{showAdvanced ? "−" : "+"}</span>
              </button>

              {showAdvanced && (
                <div className="cs-advanced-info">
                  <div>
                    <span>Writing rows</span>
                    <strong>{rowCount}</strong>
                  </div>

                  <div>
                    <span>Slant angle</span>
                    <strong>{slantAngle}°</strong>
                  </div>

                  <div>
                    <span>Horizontal drift</span>
                    <strong>
                      {(
                        dimensions.height /
                        Math.tan((slantAngle * Math.PI) / 180)
                      ).toFixed(1)}{" "}
                      mm
                    </strong>
                  </div>

                  <div>
                    <span>Printable dimensions</span>
                    <strong>
                      {innerWidth.toFixed(1)} × {innerHeight.toFixed(1)} mm
                    </strong>
                  </div>
                </div>
              )}
            </section>

            {/* DOWNLOAD PANEL */}

            <section className="cs-card cs-download-card">
              <div className="cs-card-heading">
                <div>
                  <span className="cs-step">02</span>
                  <h3>Export your sheet</h3>
                </div>
              </div>

              <p>
                Download a scalable SVG or print the page at its intended
                physical dimensions.
              </p>

              <button
                type="button"
                className="btn cs-download-button"
                onClick={downloadSvg}
              >
                ↓ Download SVG sheet
              </button>

              <button
                type="button"
                className="cs-print-button"
                onClick={printSheet}
              >
                ⎙ Print practice sheet
              </button>

              <div className="cs-export-note">
                <strong>Print setting</strong>
                <span>
                  Select 100% / Actual Size and disable browser headers and
                  footers. Avoid Fit to Page if exact dimensions matter.
                </span>
              </div>
            </section>
          </div>

          {/* RIGHT: LIVE PREVIEW */}

          <div className="cs-preview-column">
            <section className="cs-card cs-preview-card">
              <div className="cs-preview-heading">
                <div>
                  <span className="cs-eyebrow">LIVE PREVIEW</span>
                  <h3>Your practice sheet</h3>
                  <p>
                    {PAGE_SIZES[pageSize].label} · {orientation} ·{" "}
                    {dimensions.width.toFixed(1)} ×{" "}
                    {dimensions.height.toFixed(1)} mm
                  </p>
                </div>

                <span className="cs-live-badge">
                  <span />
                  Live
                </span>
              </div>

              <div className="cs-paper-stage">
                <div
                  className={`cs-paper ${
                    orientation === "landscape"
                      ? "cs-paper-landscape"
                      : ""
                  }`}
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
              </div>

              <div className="cs-preview-footer">
                <div>
                  <span>Writing rows</span>
                  <strong>{rowCount}</strong>
                </div>

                <div>
                  <span>Line spacing</span>
                  <strong>{lineSpacing} mm</strong>
                </div>

                <div>
                  <span>Slant angle</span>
                  <strong>{slantAngle}°</strong>
                </div>
              </div>
            </section>

            {/* GUIDE EXPLANATION */}

            <section className="cs-card cs-guide-card">
              <h3>Understanding your guides</h3>

              <div className="cs-guide-explanation">
                <div className="cs-guide-sample cs-sample-top" />
                <div>
                  <strong>Top line</strong>
                  <p>Upper boundary for letter height.</p>
                </div>
              </div>

              <div className="cs-guide-explanation">
                <div className="cs-guide-sample cs-sample-middle" />
                <div>
                  <strong>Middle line</strong>
                  <p>Reference for the height of lowercase letters.</p>
                </div>
              </div>

              <div className="cs-guide-explanation">
                <div className="cs-guide-sample cs-sample-baseline" />
                <div>
                  <strong>Baseline</strong>
                  <p>Bottom boundary where letters sit.</p>
                </div>
              </div>

              <div className="cs-guide-explanation">
                <div className="cs-guide-sample cs-sample-slant" />
                <div>
                  <strong>Slant guides</strong>
                  <p>Help maintain consistent letter angles.</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* FOOTNOTE */}

        <div className="cs-footer-note">
          <strong>Printing tip:</strong> SVG files are vector-based, so the
          guides stay sharp when enlarged. For accurate paper dimensions,
          print at actual size with the correct paper selected in your printer
          settings.
        </div>
      </div>

      {/* =====================================================
          STYLES
      ===================================================== */}

      <style jsx>{`
        .cs-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          min-width: 0;
        }

        .cs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 21px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 13px;
          background: var(--tool-surface, #f8fafc);
        }

        .cs-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .cs-header h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 800;
          line-height: 1.3;
        }

        .cs-header p {
          max-width: 560px;
          margin: 6px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 13px;
          line-height: 1.6;
        }

        .cs-header-icon {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 13px;
          background: var(--tool-card, #fff);
          font-size: 26px;
        }

        /* Main layout */

        .cs-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          align-items: start;
          gap: 20px;
          width: 100%;
          min-width: 0;
        }

        .cs-settings-column,
        .cs-preview-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }

        .cs-preview-column {
          position: sticky;
          top: 18px;
        }

        .cs-card {
          min-width: 0;
          padding: 19px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 13px;
          background: var(--tool-card, #fff);
        }

        .cs-card-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 17px;
        }

        .cs-card-heading > div {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .cs-card-heading h3,
        .cs-preview-heading h3,
        .cs-guide-card h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }

        .cs-step {
          display: grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border-radius: 7px;
          background: var(--tool-surface, #f1f5f9);
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          font-weight: 800;
        }

        /* Tabs */

        .cs-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 5px;
          margin-bottom: 20px;
          padding: 4px;
          border-radius: 9px;
          background: var(--tool-surface, #f1f5f9);
        }

        .cs-tab {
          min-width: 0;
          padding: 9px 5px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: var(--tool-muted, #64748b);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .cs-tab-active {
          background: var(--tool-card, #fff);
          color: var(--tool-text, #111827);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .cs-tab-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }

        .cs-tab-content :global(.tool-input) {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }

        /* Dimension information */

        .cs-dimension-box {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 5px;
          padding: 13px;
          border-radius: 9px;
          background: var(--tool-surface, #f8fafc);
        }

        .cs-dimension-box > div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .cs-dimension-box span,
        .cs-advanced-info span {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
        }

        .cs-dimension-box strong,
        .cs-advanced-info strong {
          font-size: 12px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }

        /* Presets */

        .cs-range-presets {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
          margin: -4px 0 10px;
        }

        .cs-range-presets > span {
          width: 100%;
          color: var(--tool-muted, #64748b);
          font-size: 10px;
        }

        .cs-preset {
          padding: 7px 10px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 7px;
          background: var(--tool-card, #fff);
          color: var(--tool-text, inherit);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .cs-preset-active {
          border-color: var(--tool-primary, #64748b);
          background: var(--tool-surface, #f1f5f9);
        }

        /* Toggle switch list */

        .cs-toggle-list {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-top: 4px;
          border-top: 1px solid var(--tool-border, #e5e7eb);
        }

        /* Shared switch row */

        .cs-switch {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--tool-border, #e5e7eb);
          cursor: pointer;
          user-select: none;
        }

        .cs-toggle-list .cs-switch:last-child {
          border-bottom: 0;
        }

        .cs-switch > span:first-of-type {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .cs-switch strong {
          font-size: 12px;
          font-weight: 700;
        }

        .cs-switch small {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          line-height: 1.4;
        }

        /* Hidden native checkbox */

        .cs-switch input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          pointer-events: none;
        }

        /* Track */

        .cs-switch-track {
          position: relative;
          flex-shrink: 0;
          width: 44px;
          height: 26px;
          border-radius: 999px;
          background: #cbd5e1;
          border: 1px solid #cbd5e1;
          transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
        }

        /* Thumb */

        .cs-switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, .25);
          transition: transform .2s ease;
        }

        /* Checked state */

        .cs-switch input:checked + .cs-switch-track {
          background: #ff5a1f;
          border-color: #ff5a1f;
          box-shadow: 0 2px 6px rgba(37, 99, 235, .25);
        }

        .cs-switch input:checked + .cs-switch-track .cs-switch-thumb {
          transform: translateX(18px);
        }

        /* Focus ring */

        .cs-switch input:focus-visible + .cs-switch-track {
          outline: 3px solid rgba(37, 99, 235, .25);
          outline-offset: 2px;
        }

        /* Color settings */

        .cs-color-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin: 4px 0 12px;
        }

        .cs-color-field {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          font-weight: 650;
        }

        .cs-color-field input {
          width: 42px;
          height: 28px;
          padding: 2px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 6px;
          background: white;
          cursor: pointer;
        }

        /* Advanced info */

        .cs-advanced-button {
          display: flex;
          justify-content: space-between;
          width: 100%;
          margin-top: 17px;
          padding: 13px 0 0;
          border: 0;
          border-top: 1px solid var(--tool-border, #e5e7eb);
          background: transparent;
          color: var(--tool-text, inherit);
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .cs-advanced-button span {
          font-size: 17px;
        }

        .cs-advanced-info {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
          padding: 13px;
          border-radius: 9px;
          background: var(--tool-surface, #f8fafc);
        }

        .cs-advanced-info > div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        /* Download */

        .cs-download-card > p {
          margin: -5px 0 15px;
          color: var(--tool-muted, #64748b);
          font-size: 12px;
          line-height: 1.6;
        }

        .cs-download-button,
        .cs-print-button {
          width: 100%;
          min-height: 42px;
        }

        .cs-print-button {
          margin-top: 9px;
          padding: 10px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 8px;
          background: var(--tool-surface, #f8fafc);
          color: var(--tool-text, inherit);
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .cs-export-note {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 15px;
          padding: 12px;
          border-radius: 8px;
          background: var(--tool-surface, #f8fafc);
        }

        .cs-export-note strong {
          font-size: 11px;
        }

        .cs-export-note span {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          line-height: 1.6;
        }

        /* Preview */

        .cs-preview-card {
          padding: 16px;
        }

        .cs-preview-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 16px;
        }

        .cs-preview-heading h3 {
          font-size: 16px;
        }

        .cs-preview-heading p {
          margin: 5px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 10px;
        }

        .cs-live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 20px;
          font-size: 10px;
          font-weight: 750;
        }

        .cs-live-badge span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #16a34a;
        }

        .cs-paper-stage {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          min-width: 0;
          max-height: 760px;
          overflow: auto;
          padding: 13px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 10px;
          background: var(--tool-surface, #f1f5f9);
        }

        .cs-paper {
          width: 100%;
          max-width: 460px;
          flex: 0 0 auto;
          overflow: hidden;
          background: white;
          box-shadow: 0 2px 9px rgba(15, 23, 42, 0.12);
          aspect-ratio: 210 / 297;
        }

        .cs-paper-landscape {
          max-width: 100%;
          aspect-ratio: 297 / 210;
        }

        .cs-paper :global(svg) {
          display: block;
          width: 100%;
          height: 100%;
        }

        .cs-preview-footer {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
        }

        .cs-preview-footer > div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
          padding: 10px;
          border-radius: 8px;
          background: var(--tool-surface, #f8fafc);
        }

        .cs-preview-footer span {
          color: var(--tool-muted, #64748b);
          font-size: 9px;
        }

        .cs-preview-footer strong {
          font-size: 12px;
          font-weight: 800;
        }

        /* Guide explanation */

        .cs-guide-card h3 {
          margin-bottom: 15px;
        }

        .cs-guide-explanation {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 0;
          border-top: 1px solid var(--tool-border, #e5e7eb);
        }

        .cs-guide-sample {
          width: 37px;
          height: 3px;
          flex: 0 0 auto;
          border-radius: 3px;
        }

        .cs-sample-top {
          background: #cbd5e1;
        }

        .cs-sample-middle {
          height: 0;
          border-top: 2px dashed #94a3b8;
        }

        .cs-sample-baseline {
          height: 3px;
          background: #64748b;
        }

        .cs-sample-slant {
          width: 3px;
          height: 30px;
          transform: rotate(25deg);
          background: #e2e8f0;
        }

        .cs-guide-explanation strong {
          font-size: 11px;
        }

        .cs-guide-explanation p {
          margin: 3px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          line-height: 1.5;
        }

        .cs-footer-note {
          padding: 14px 16px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 9px;
          background: var(--tool-surface, #f8fafc);
          color: var(--tool-muted, #64748b);
          font-size: 11px;
          line-height: 1.7;
        }

        .cs-footer-note strong {
          color: var(--tool-text, inherit);
        }

        /* Tablet */

        @media (max-width: 900px) {
          .cs-main-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .cs-preview-column {
            position: static;
          }

          .cs-paper {
            max-width: 480px;
          }
        }

        /* Mobile */

        @media (max-width: 540px) {
          .cs-header {
            padding: 15px;
          }

          .cs-header h2 {
            font-size: 18px;
          }

          .cs-header-icon {
            width: 42px;
            height: 42px;
            font-size: 21px;
          }

          .cs-card {
            padding: 14px;
          }

          .cs-tabs {
            gap: 2px;
          }

          .cs-tab {
            font-size: 10px;
            padding: 9px 3px;
          }

          .cs-paper-stage {
            padding: 8px;
          }

          .cs-preview-footer {
            gap: 5px;
          }

          .cs-preview-footer > div {
            padding: 8px;
          }

          .cs-preview-footer strong {
            font-size: 10px;
          }

          .cs-preview-footer span {
            font-size: 8px;
          }
        }
      `}</style>
    </ToolShell>
  );
}