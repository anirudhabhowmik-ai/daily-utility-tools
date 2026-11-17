"use client";

import { useState } from "react";
import type { AdditionalToolKind } from "./config";
import {
  downloadBlob,
  downloadCanvas,
  FieldGrid,
  FileField,
  localDateString,
  loadLocalImage,
  NumberField,
  SelectField,
  TextField,
  ToolActions,
  ToolButton,
  ToolResult,
} from "./ui";

type CraftKind = Extract<AdditionalToolKind, "image-to-cross-stitch-bead-pattern" | "lego-mosaic-planner" | "printable-planner-generator">;
type PatternResult = { canvas: HTMLCanvasElement; palette: Array<{ hex: string; count: number }>; width: number; height: number };

function colorHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function createPattern(data: Uint8ClampedArray, width: number, height: number, colors: number, mosaic: boolean): PatternResult {
  const pixels: Array<[number, number, number]> = [];
  for (let index = 0; index < data.length; index += 4) pixels.push([data[index], data[index + 1], data[index + 2]]);
  const clusters: Array<[number, number, number]> = [];
  for (let index = 0; index < colors; index += 1) {
    const pixel = pixels[Math.min(pixels.length - 1, Math.floor(((index + 0.5) / colors) * pixels.length))];
    clusters.push([...pixel]);
  }
  const assignments = new Array<number>(pixels.length).fill(0);
  for (let round = 0; round < 6; round += 1) {
    const sums = clusters.map(() => [0, 0, 0, 0]);
    pixels.forEach((pixel, index) => {
      let closest = 0;
      let distance = Number.POSITIVE_INFINITY;
      clusters.forEach((cluster, clusterIndex) => {
        const score = (pixel[0] - cluster[0]) ** 2 + (pixel[1] - cluster[1]) ** 2 + (pixel[2] - cluster[2]) ** 2;
        if (score < distance) {
          distance = score;
          closest = clusterIndex;
        }
      });
      assignments[index] = closest;
      sums[closest][0] += pixel[0];
      sums[closest][1] += pixel[1];
      sums[closest][2] += pixel[2];
      sums[closest][3] += 1;
    });
    sums.forEach((sum, index) => {
      if (sum[3] > 0) clusters[index] = [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]];
    });
  }
  const counts = clusters.map(() => 0);
  assignments.forEach((cluster) => { counts[cluster] += 1; });
  const canvas = document.createElement("canvas");
  const cellSize = mosaic ? 18 : 20;
  canvas.width = width * cellSize;
  canvas.height = height * cellSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The browser could not draw the pattern.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  assignments.forEach((clusterIndex, index) => {
    const x = (index % width) * cellSize;
    const y = Math.floor(index / width) * cellSize;
    const color = clusters[clusterIndex];
    context.fillStyle = colorHex(color[0], color[1], color[2]);
    context.fillRect(x, y, cellSize, cellSize);
    if (mosaic) {
      context.beginPath();
      context.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.34, 0, Math.PI * 2);
      context.fillStyle = "rgba(255,255,255,0.22)";
      context.fill();
      context.strokeStyle = "rgba(0,0,0,0.24)";
      context.stroke();
    } else {
      context.strokeStyle = "rgba(0,0,0,0.24)";
      context.lineWidth = 1;
      context.strokeRect(x, y, cellSize, cellSize);
    }
  });
  if (!mosaic) {
    context.strokeStyle = "rgba(0,0,0,0.65)";
    context.lineWidth = 2;
    for (let x = 0; x <= width; x += 10) {
      context.beginPath();
      context.moveTo(x * cellSize, 0);
      context.lineTo(x * cellSize, canvas.height);
      context.stroke();
    }
    for (let y = 0; y <= height; y += 10) {
      context.beginPath();
      context.moveTo(0, y * cellSize);
      context.lineTo(canvas.width, y * cellSize);
      context.stroke();
    }
  }
  const palette = clusters
    .map((color, index) => ({ hex: colorHex(color[0], color[1], color[2]), count: counts[index] }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
  return { canvas, palette, width, height };
}

function PatternMaker({ mosaic }: { mosaic: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [gridWidth, setGridWidth] = useState(mosaic ? 48 : 60);
  const [colorCount, setColorCount] = useState(12);
  const [result, setResult] = useState<PatternResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const image = await loadLocalImage(file);
      const width = Math.max(1, Math.round(gridWidth));
      const height = Math.max(1, Math.round(width * image.naturalHeight / image.naturalWidth));
      if (height > 180) throw new Error("This aspect ratio creates a grid taller than 180 units. Reduce grid width or crop the source image.");
      const sample = document.createElement("canvas");
      sample.width = width;
      sample.height = height;
      const context = sample.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("The browser could not sample this image.");
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      setResult(createPattern(pixels, width, height, Math.round(colorCount), mosaic));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The pattern could not be created.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  function exportPalette() {
    if (!result) return;
    const rows = ["Color,Approximate hex,Stitches or pieces", ...result.palette.map((item, index) => `${index + 1},${item.hex},${item.count}`)];
    downloadBlob("pattern-color-counts.csv", new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <FileField label="Source photo (processed locally)" accept="image/*" onChange={(selected) => { setFile(selected); setResult(null); setError(""); }} />
        <NumberField label={mosaic ? "Mosaic width (blocks)" : "Pattern width (stitches/beads)"} value={gridWidth} onChange={setGridWidth} min={10} max={150} step={1} />
        <NumberField label="Maximum palette colors" value={colorCount} onChange={setColorCount} min={2} max={32} step={1} />
      </FieldGrid>
      <ToolActions>
        <ToolButton onClick={() => { void generate(); }} disabled={!file || busy}>{busy ? "Creating pattern..." : "Create pattern"}</ToolButton>
        {result && <ToolButton secondary onClick={() => downloadCanvas(result.canvas, mosaic ? "block-mosaic.png" : "stitch-bead-pattern.png")}>Download pattern PNG</ToolButton>}
        {result && <ToolButton secondary onClick={exportPalette}>Download color counts CSV</ToolButton>}
      </ToolActions>
      {error && <ToolResult><p role="alert">{error}</p></ToolResult>}
      {result && <>
        <ToolResult><p>Grid: <strong>{result.width} × {result.height}</strong> · {result.palette.reduce((sum, color) => sum + color.count, 0)} total {mosaic ? "pieces" : "stitches or beads"}</p>
          <div className="tool-palette">{result.palette.map((color, index) => <span className="tool-palette-item" key={color.hex}><i style={{ backgroundColor: color.hex }} />Color {index + 1} · {color.hex} · {color.count}</span>)}</div>
        </ToolResult>
        <div className="tool-image-preview"><canvas width={result.canvas.width} height={result.canvas.height} ref={(canvas) => {
          if (!canvas) return;
          const context = canvas.getContext("2d");
          context?.drawImage(result.canvas, 0, 0);
        }} aria-label="Generated image pattern preview" /></div>
      </>}
      <p className="tool-muted">Colors are approximations based on this image; compare actual thread, bead, or building-block colors before buying materials.</p>
    </div>
  );
}

function escapePdfText(value: string) {
  return value.replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfText(text: string, x: number, y: number, size: number) {
  return `BT /F1 ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET\n`;
}

function createPdf(width: number, height: number, content: string) {
  const stream = content;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream`,
  ];
  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(new TextEncoder().encode(document).length);
    document += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(document).length;
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { document += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([new TextEncoder().encode(document)], { type: "application/pdf" });
}

function PrintablePlanner() {
  const [pageSize, setPageSize] = useState("letter");
  const [style, setStyle] = useState("calendar");
  const [month, setMonth] = useState(localDateString().slice(0, 7));
  const [habits, setHabits] = useState(8);
  const [dotSpacing, setDotSpacing] = useState(18);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  function createPlanner() {
    setError("");
    const isLetter = pageSize === "letter";
    const width = isLetter ? 612 : 595.28;
    const height = isLetter ? 792 : 841.89;
    const margin = 38;
    let content = "0.5 w\n0.12 G\n";
    content += pdfText(style === "calendar" ? "Monthly Calendar" : style === "habit" ? "Habit Tracker" : "Dot Grid", margin, height - 48, 20);
    content += pdfText("Created with DailyTools - print at actual size", margin, height - 66, 9);
    if (style === "calendar") {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        setError("Choose a valid month.");
        return;
      }
      const [year, selectedMonth] = month.split("-").map(Number);
      const monthName = new Date(year, selectedMonth - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      content += pdfText(monthName, margin, height - 103, 14);
      const top = height - 132;
      const bottom = margin + 18;
      const cellWidth = (width - 2 * margin) / 7;
      const cellHeight = (top - bottom) / 6;
      const firstDay = new Date(year, selectedMonth - 1, 1).getDay();
      const daysInMonth = new Date(year, selectedMonth, 0).getDate();
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day, column) => { content += pdfText(day, margin + column * cellWidth + 4, top + 8, 8); });
      for (let row = 0; row < 6; row += 1) {
        for (let column = 0; column < 7; column += 1) {
          const x = margin + column * cellWidth;
          const y = top - (row + 1) * cellHeight;
          content += `${x.toFixed(2)} ${y.toFixed(2)} ${cellWidth.toFixed(2)} ${cellHeight.toFixed(2)} re S\n`;
          const dayNumber = row * 7 + column - firstDay + 1;
          if (dayNumber >= 1 && dayNumber <= daysInMonth) content += pdfText(String(dayNumber), x + 5, y + cellHeight - 14, 9);
        }
      }
    } else if (style === "habit") {
      content += pdfText("Mark each day you complete a habit.", margin, height - 103, 10);
      const labelWidth = 92;
      const top = height - 135;
      const rowHeight = 38;
      const dayWidth = (width - 2 * margin - labelWidth) / 31;
      for (let day = 1; day <= 31; day += 1) content += pdfText(String(day), margin + labelWidth + (day - 1) * dayWidth + 2, top + 8, 6);
      for (let row = 0; row < Math.round(habits); row += 1) {
        const y = top - (row + 1) * rowHeight;
        content += pdfText(`Habit ${row + 1}`, margin + 2, y + 14, 8);
        content += `${margin} ${y} ${width - 2 * margin} ${rowHeight} re S\n`;
        for (let day = 1; day <= 31; day += 1) content += `${(margin + labelWidth + (day - 1) * dayWidth).toFixed(2)} ${y} ${dayWidth.toFixed(2)} ${rowHeight} re S\n`;
      }
    } else {
      const spacing = dotSpacing * 72 / 25.4;
      for (let x = margin; x <= width - margin; x += spacing) {
        for (let y = margin; y <= height - 100; y += spacing) content += `${(x - 0.45).toFixed(2)} ${(y - 0.45).toFixed(2)} 0.9 0.9 re f\n`;
      }
      content += pdfText(`Dot spacing: ${dotSpacing} mm`, margin, height - 100, 10);
    }
    setReady(true);
    downloadBlob(`dailytools-${style}-${pageSize}.pdf`, createPdf(width, height, content));
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <SelectField label="Planner style" value={style} onChange={(value) => { setStyle(value); setReady(false); }} options={[{ value: "calendar", label: "Monthly calendar" }, { value: "habit", label: "Habit tracker" }, { value: "dots", label: "Dot grid" }]} />
        <SelectField label="Paper size" value={pageSize} onChange={setPageSize} options={[{ value: "letter", label: "US Letter" }, { value: "a4", label: "A4" }]} />
        {style === "calendar" && <TextField label="Calendar month" type="date" value={`${month}-01`} onChange={(value) => setMonth(value.slice(0, 7))} />}
        {style === "habit" && <NumberField label="Number of habit rows" value={habits} onChange={setHabits} min={1} max={14} step={1} />}
        {style === "dots" && <NumberField label="Dot spacing (mm)" value={dotSpacing} onChange={setDotSpacing} min={8} max={36} step={1} />}
      </FieldGrid>
      <ToolActions><ToolButton onClick={createPlanner}>Generate and download PDF</ToolButton></ToolActions>
      {error && <ToolResult><p role="alert">{error}</p></ToolResult>}
      {ready && <ToolResult><p>Your PDF was generated locally. Open it and review the print preview before printing.</p></ToolResult>}
    </div>
  );
}

export default function CraftTools({ kind }: { kind: CraftKind }) {
  if (kind === "image-to-cross-stitch-bead-pattern") return <PatternMaker mosaic={false} />;
  if (kind === "lego-mosaic-planner") return <PatternMaker mosaic />;
  return <PrintablePlanner />;
}
