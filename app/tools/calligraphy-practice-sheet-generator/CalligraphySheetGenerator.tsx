"use client";

import { useState } from "react";
import ToolShell, { NumberField, ToolLabel } from "../ToolShell";

type PageSize = "letter" | "a4";

export default function CalligraphySheetGenerator() {
  const [lineSpacing, setLineSpacing] = useState(32);
  const [slant, setSlant] = useState(55);
  const [pageSize, setPageSize] = useState<PageSize>("letter");
  const sheetWidth = pageSize === "letter" ? 816 : 794;
  const sheetHeight = pageSize === "letter" ? 1056 : 1123;

  const reset = () => {
    setLineSpacing(32);
    setSlant(55);
    setPageSize("letter");
  };

  const downloadCalligraphy = () => {
    const width = pageSize === "letter" ? 816 : 794;
    const height = pageSize === "letter" ? 1056 : 1123;
    const lines = Array.from({ length: Math.floor((height - 100) / lineSpacing) }, (_, index) => {
      const y = 50 + (index + 1) * lineSpacing;
      return `<line x1="40" y1="${y}" x2="${width - 40}" y2="${y}" stroke="#cbd5e1" stroke-width="1"/><line x1="40" y1="${y - lineSpacing / 3}" x2="${width - 40}" y2="${y - lineSpacing / 3}" stroke="#e2e8f0" stroke-width="1"/>`;
    }).join("");
    const slantLines = Array.from({ length: Math.ceil(width / 34) }, (_, index) => {
      const x = index * 34;
      return `<line x1="${x}" y1="0" x2="${x + height / Math.tan((slant * Math.PI) / 180)}" y2="${height}" stroke="#f1f5f9" stroke-width="1"/>`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>${slantLines}${lines}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "calligraphy-practice-sheet.svg";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const guides = Array.from({ length: Math.floor((sheetHeight - 100) / lineSpacing) }, (_, index) => {
    const y = 50 + (index + 1) * lineSpacing;
    return (
      <g key={`guide-${index}`}>
        <line x1="40" y1={y} x2={sheetWidth - 40} y2={y} />
        <line className="practice-midline" x1="40" y1={y - lineSpacing / 3} x2={sheetWidth - 40} y2={y - lineSpacing / 3} />
      </g>
    );
  });
  const slantGuides = Array.from({ length: Math.ceil(sheetWidth / 34) }, (_, index) => {
    const x = index * 34;
    return <line key={`slant-${index}`} className="practice-slant" x1={x} y1="0" x2={x + sheetHeight / Math.tan((slant * Math.PI) / 180)} y2={sheetHeight} />;
  });

  return (
    <ToolShell title="Practice sheet designer" onReset={reset}>
      <NumberField label="Guide line spacing (px)" value={lineSpacing} min={16} onChange={setLineSpacing} />
      <NumberField label="Slant guide angle (degrees)" value={slant} min={35} max={80} onChange={setSlant} />
      <ToolLabel>Paper size<select className="tool-input" value={pageSize} onChange={(event) => setPageSize(event.target.value as PageSize)}><option value="letter">US Letter</option><option value="a4">A4</option></select></ToolLabel>
      <svg className="calligraphy-sheet-preview" viewBox={`0 0 ${sheetWidth} ${sheetHeight}`} role="img" aria-label={`${pageSize === "letter" ? "US Letter" : "A4"} calligraphy practice sheet preview`}>
        <rect width={sheetWidth} height={sheetHeight} fill="#fff" />
        {slantGuides}
        <g className="practice-guides">{guides}</g>
      </svg>
      <button type="button" className="btn" onClick={downloadCalligraphy}>Download practice sheet</button>
      <p>The preview updates as you adjust it. Download the SVG for crisp printing at any scale.</p>
    </ToolShell>
  );
}
