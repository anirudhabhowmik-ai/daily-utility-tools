"use client";

import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import type { AdditionalToolKind } from "./config";
import { downloadBlob, downloadCanvas, FieldGrid, NumberField, SelectField, TextField, ToolActions, ToolButton, ToolResult, useLocalStorageState } from "./ui";

type MediaKind = Extract<
  AdditionalToolKind,
  "subtitle-timing-shifter" | "print-size-quality-checker" | "recipe-scaler" | "event-seating-planner"
>;

type Cue = { start: number; end: number; text: string };

function parseTimestamp(value: string) {
  const match = value.trim().match(/^(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) throw new Error(`Invalid subtitle timestamp: ${value.trim()}`);
  return (((Number(match[1] ?? 0) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000) + Number(match[4]);
}

function parseSubtitle(text: string) {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const cues: Cue[] = [];
  for (let index = 0; index < lines.length;) {
    while (index < lines.length && (!lines[index].trim() || lines[index].trim() === "WEBVTT")) index += 1;
    if (index >= lines.length) break;
    if (/^(NOTE|STYLE|REGION)\b/.test(lines[index].trim())) {
      while (index < lines.length && lines[index].trim()) index += 1;
      continue;
    }
    if (!lines[index].includes("-->") && index + 1 < lines.length && lines[index + 1].includes("-->")) index += 1;
    const timing = lines[index];
    if (!timing?.includes("-->")) throw new Error(`Could not find a cue timing near line ${index + 1}.`);
    const [startText, endTextRaw] = timing.split("-->");
    const endText = endTextRaw.trim().split(/\s+/)[0];
    const start = parseTimestamp(startText);
    const end = parseTimestamp(endText);
    if (end <= start) throw new Error(`Cue near line ${index + 1} ends before it starts.`);
    index += 1;
    const caption: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      caption.push(lines[index]);
      index += 1;
    }
    cues.push({ start, end, text: caption.join("\n") });
  }
  if (!cues.length) throw new Error("No subtitle cues were found.");
  return cues;
}

function formatTimestamp(milliseconds: number, format: "srt" | "vtt") {
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  const fraction = milliseconds % 1000;
  const base = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${base}${format === "srt" ? "," : "."}${String(fraction).padStart(3, "0")}`;
}

function SubtitleTool() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<"srt" | "vtt">("srt");
  const [offset, setOffset] = useState(0);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [cueCount, setCueCount] = useState(0);

  function convert() {
    setError("");
    try {
      const cues = parseSubtitle(input);
      const shifted = cues.map((cue) => {
        const start = cue.start + Math.round(offset * 1000);
        const end = cue.end + Math.round(offset * 1000);
        if (start < 0 || end < 0) throw new Error("This shift would move a subtitle before time zero. Reduce the negative offset.");
        return { ...cue, start, end };
      });
      const result = shifted.map((cue, index) => `${format === "srt" ? `${index + 1}\n` : ""}${formatTimestamp(cue.start, format)} --> ${formatTimestamp(cue.end, format)}\n${cue.text}`).join("\n\n");
      setOutput(format === "vtt" ? `WEBVTT\n\n${result}\n` : `${result}\n`);
      setCueCount(cues.length);
    } catch (reason) {
      setOutput("");
      setCueCount(0);
      setError(reason instanceof Error ? reason.message : "The subtitles could not be converted.");
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      setError("Clipboard access was denied. Select the output text and copy it manually.");
    }
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <SelectField label="Output format" value={format} onChange={(value) => setFormat(value as "srt" | "vtt")} options={[{ value: "srt", label: "SubRip (.srt)" }, { value: "vtt", label: "WebVTT (.vtt)" }]} />
        <NumberField label="Timing shift (seconds; negative moves earlier)" value={offset} onChange={setOffset} min={-86400} max={86400} step={0.05} />
      </FieldGrid>
      <label className="tool-field"><span>Paste SRT or WebVTT subtitle text</span><textarea className="tool-input tool-textarea tool-code-textarea" value={input} onChange={(event) => setInput(event.currentTarget.value)} placeholder={"1\n00:00:01,000 --> 00:00:03,000\nHello there."} spellCheck={false} /></label>
      <ToolActions>
        <ToolButton onClick={convert} disabled={!input.trim()}>Shift and convert</ToolButton>
        {output && <ToolButton secondary onClick={() => downloadBlob(`shifted-subtitles.${format}`, new Blob([output], { type: format === "vtt" ? "text/vtt;charset=utf-8" : "application/x-subrip;charset=utf-8" }))}>Download {format.toUpperCase()}</ToolButton>}
        {output && <ToolButton secondary onClick={() => { void copyOutput(); }}>Copy output</ToolButton>}
      </ToolActions>
      {error && <ToolResult><p role="alert">{error}</p></ToolResult>}
      {output && <><ToolResult><p>Processed {cueCount} subtitle cues.</p></ToolResult><label className="tool-field"><span>Converted subtitle text</span><textarea className="tool-input tool-textarea tool-code-textarea" readOnly value={output} /></label></>}
    </div>
  );
}

const printSizes = [
  { name: "4 × 6 in", width: 6, height: 4 },
  { name: "5 × 7 in", width: 7, height: 5 },
  { name: "8 × 10 in", width: 10, height: 8 },
  { name: "11 × 14 in", width: 14, height: 11 },
  { name: "A4", width: 11.69, height: 8.27 },
  { name: "A3", width: 16.54, height: 11.69 },
];

function PrintSizeChecker() {
  const [width, setWidth] = useState(3000);
  const [height, setHeight] = useState(2000);
  const [customWidth, setCustomWidth] = useState(12);
  const [customHeight, setCustomHeight] = useState(8);
  const [dpi, setDpi] = useState(300);

  function effectiveDpi(targetWidth: number, targetHeight: number) {
    const sourceRatio = width / height;
    const targetRatio = targetWidth / targetHeight;
    const croppedWidth = sourceRatio > targetRatio ? height * targetRatio : width;
    const croppedHeight = sourceRatio > targetRatio ? height : width / targetRatio;
    return Math.min(croppedWidth / targetWidth, croppedHeight / targetHeight);
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <NumberField label="Image width (pixels)" value={width} onChange={setWidth} min={1} max={100000} step={1} />
        <NumberField label="Image height (pixels)" value={height} onChange={setHeight} min={1} max={100000} step={1} />
        <NumberField label="Quality threshold (PPI)" value={dpi} onChange={setDpi} min={72} max={1200} step={1} />
        <NumberField label="Custom print width (inches)" value={customWidth} onChange={setCustomWidth} min={0.1} max={200} step={0.1} />
        <NumberField label="Custom print height (inches)" value={customHeight} onChange={setCustomHeight} min={0.1} max={200} step={0.1} />
      </FieldGrid>
      <ToolResult><p>Source: <strong>{width} × {height} px</strong></p><div className="tool-table-wrap"><table className="tool-data-table"><thead><tr><th>Print size</th><th>Effective resolution (center crop)</th><th>Guidance</th></tr></thead><tbody>
        {[...printSizes, { name: `${customWidth} × ${customHeight} in (custom)`, width: customWidth, height: customHeight }].map((size) => {
          const resolution = effectiveDpi(size.width, size.height);
          return <tr key={size.name}><td>{size.name}</td><td>{resolution.toFixed(0)} PPI</td><td><span className={resolution >= dpi ? "tool-status-good" : resolution >= dpi * 0.67 ? "tool-status-warn" : "tool-status-bad"}>{resolution >= dpi ? "Meets threshold" : resolution >= dpi * 0.67 ? "May look softer" : "Low resolution"}</span></td></tr>;
        })}
      </tbody></table></div>
        <p className="tool-muted">The estimate crops to fill the chosen print ratio. It does not evaluate sharpness, noise, viewing distance, or printer quality.</p>
      </ToolResult>
    </div>
  );
}

const volumeMl: Record<string, number> = { cup: 236.588, cups: 236.588, c: 236.588, tbsp: 14.7868, tablespoon: 14.7868, tablespoons: 14.7868, tsp: 4.92892, teaspoon: 4.92892, teaspoons: 4.92892, ml: 1, milliliter: 1, milliliters: 1, l: 1000, liter: 1000 };
const weightGrams: Record<string, number> = { g: 1, gram: 1, grams: 1, kg: 1000, kilogram: 1000, kilograms: 1000, oz: 28.3495, ounce: 28.3495, ounces: 28.3495, lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592 };
const ingredientDensities: Array<{ match: string[]; gramsPerCup: number }> = [
  { match: ["all-purpose flour", "plain flour"], gramsPerCup: 120 },
  { match: ["bread flour"], gramsPerCup: 127 },
  { match: ["sugar", "granulated sugar"], gramsPerCup: 200 },
  { match: ["brown sugar"], gramsPerCup: 220 },
  { match: ["butter"], gramsPerCup: 227 },
  { match: ["water"], gramsPerCup: 237 },
  { match: ["milk"], gramsPerCup: 244 },
  { match: ["oil"], gramsPerCup: 218 },
  { match: ["cocoa"], gramsPerCup: 85 },
  { match: ["rice"], gramsPerCup: 185 },
  { match: ["oats"], gramsPerCup: 90 },
  { match: ["honey"], gramsPerCup: 340 },
];

function parseQuantity(text: string) {
  const match = text.match(/^\s*(\d+\/\d+|\d+(?:\.\d+)?(?:\s+\d+\/\d+)?)\s*(.*)$/);
  if (!match) return null;
  const raw = match[1].trim();
  let amount = 0;
  if (raw.includes(" ")) {
    const [whole, fraction] = raw.split(/\s+/);
    const [numerator, denominator] = fraction.split("/").map(Number);
    amount = Number(whole) + numerator / denominator;
  } else if (raw.includes("/")) {
    const [numerator, denominator] = raw.split("/").map(Number);
    amount = numerator / denominator;
  } else amount = Number(raw);
  return Number.isFinite(amount) ? { amount, rest: match[2].trim() } : null;
}

function formatQuantity(value: number) {
  if (value === 0) return "0";
  const whole = Math.floor(value);
  const fractions = [2, 3, 4, 8].map((denominator) => ({ numerator: Math.round((value - whole) * denominator), denominator }));
  const close = fractions.find((fraction) => fraction.numerator > 0 && Math.abs(fraction.numerator / fraction.denominator - (value - whole)) < 0.015);
  if (close) {
    const numerator = close.numerator;
    const denominator = close.denominator;
    if (numerator === denominator) return String(whole + 1);
    if (whole === 0) return `${numerator}/${denominator}`;
    return `${whole} ${numerator}/${denominator}`;
  }
  return Number(value.toFixed(2)).toString();
}

function RecipeScaler() {
  const [recipe, setRecipe] = useState("2 cups all-purpose flour\n1/2 cup sugar\n1 cup milk\n2 eggs\n1 tsp vanilla");
  const [originalServings, setOriginalServings] = useState(4);
  const [targetServings, setTargetServings] = useState(6);
  const scale = targetServings / originalServings;
  const rows = recipe.split(/\r?\n/).map((line) => {
    const parsed = parseQuantity(line);
    if (!parsed) return { original: line, scaled: line, grams: "" };
    const scaledAmount = parsed.amount * scale;
    const firstSpace = parsed.rest.indexOf(" ");
    const unit = firstSpace < 0 ? parsed.rest : parsed.rest.slice(0, firstSpace);
    const ingredient = firstSpace < 0 ? "" : parsed.rest.slice(firstSpace + 1);
    const normalizedUnit = unit.toLowerCase().replace(/[.,]$/, "");
    let grams = "";
    if (weightGrams[normalizedUnit]) grams = `${Math.round(scaledAmount * weightGrams[normalizedUnit])} g`;
    else if (volumeMl[normalizedUnit]) {
      const density = ingredientDensities.find((item) => item.match.some((name) => ingredient.toLowerCase().includes(name)));
      if (density) grams = `${Math.round(scaledAmount * volumeMl[normalizedUnit] / 236.588 * density.gramsPerCup)} g (approx.)`;
    }
    const scaledText = `${formatQuantity(scaledAmount)}${unit ? ` ${unit}` : ""}${ingredient ? ` ${ingredient}` : ""}`;
    return { original: line, scaled: scaledText, grams };
  });

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <NumberField label="Original servings" value={originalServings} onChange={setOriginalServings} min={1} max={10000} step={1} />
        <NumberField label="Target servings" value={targetServings} onChange={setTargetServings} min={1} max={10000} step={1} />
      </FieldGrid>
      <label className="tool-field"><span>Paste ingredients (one per line; start each with a quantity)</span><textarea className="tool-input tool-textarea" value={recipe} onChange={(event) => setRecipe(event.currentTarget.value)} placeholder={"2 cups all-purpose flour\n1/2 cup sugar\n2 eggs"} /></label>
      <ToolResult><p>Scale factor: <strong>{scale.toFixed(2)}×</strong></p><div className="tool-table-wrap"><table className="tool-data-table"><thead><tr><th>Original</th><th>Scaled amount</th><th>Approx. weight</th></tr></thead><tbody>{rows.filter((row) => row.original.trim()).map((row, index) => <tr key={`${row.original}-${index}`}><td>{row.original}</td><td>{row.scaled}</td><td>{row.grams || "—"}</td></tr>)}</tbody></table></div>
        <p className="tool-muted">Volume-to-weight values are approximate estimates for listed ingredients. Unrecognized units and ingredients are scaled by quantity only; weigh ingredients for accuracy.</p>
      </ToolResult>
    </div>
  );
}

type Guest = { id: string; name: string };
type SeatingTable = { id: string; name: string; capacity: number; guestIds: string[] };
type SeatingState = { guests: Guest[]; tables: SeatingTable[] };
const starterSeating: SeatingState = {
  guests: [],
  tables: [
    { id: "table-1", name: "Table 1", capacity: 6, guestIds: [] },
    { id: "table-2", name: "Table 2", capacity: 6, guestIds: [] },
    { id: "table-3", name: "Table 3", capacity: 6, guestIds: [] },
    { id: "table-4", name: "Table 4", capacity: 6, guestIds: [] },
  ],
};

function isSeatingState(value: unknown): value is SeatingState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<SeatingState>;
  return Array.isArray(state.guests)
    && state.guests.every((guest) => guest && typeof guest.id === "string" && typeof guest.name === "string")
    && Array.isArray(state.tables)
    && state.tables.every((table) => table && typeof table.id === "string" && typeof table.name === "string" && Number.isInteger(table.capacity) && table.capacity > 0 && Array.isArray(table.guestIds) && table.guestIds.every((id) => typeof id === "string" && state.guests?.some((guest) => guest.id === id)));
}

function SeatingPlanner() {
  const [plan, setPlan, storageError] = useLocalStorageState("ToolsAB-seating-plan-v1", starterSeating, isSeatingState);
  const [guestName, setGuestName] = useState("");
  const [tableName, setTableName] = useState("");
  const [status, setStatus] = useState("");

  const assigned = useMemo(() => new Set(plan.tables.flatMap((table) => table.guestIds)), [plan.tables]);
  const unassigned = plan.guests.filter((guest) => !assigned.has(guest.id));

  function addGuest() {
    if (!guestName.trim()) return;
    setPlan((current) => ({ ...current, guests: [...current.guests, { id: crypto.randomUUID(), name: guestName.trim() }] }));
    setGuestName("");
  }

  function addTable() {
    const name = tableName.trim() || `Table ${plan.tables.length + 1}`;
    setPlan((current) => ({ ...current, tables: [...current.tables, { id: crypto.randomUUID(), name, capacity: 6, guestIds: [] }] }));
    setTableName("");
  }

  function moveGuest(guestId: string, tableId: string | null) {
    const target = tableId ? plan.tables.find((table) => table.id === tableId) : null;
    if (target && target.guestIds.length >= target.capacity && !target.guestIds.includes(guestId)) {
      setStatus(`${target.name} is full. Increase its seats or move someone first.`);
      return;
    }
    setPlan((current) => ({
      ...current,
      tables: current.tables.map((table) => ({
        ...table,
        guestIds: table.guestIds.filter((id) => id !== guestId).concat(table.id === tableId ? [guestId] : []),
      })),
    }));
    setStatus("");
  }

  function onDrop(event: DragEvent<HTMLElement>, tableId: string | null) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    if (plan.guests.some((guest) => guest.id === id)) moveGuest(id, tableId);
  }

  function exportPlan() {
    const columns = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(plan.tables.length))));
    const cardWidth = 340;
    const cardHeight = Math.max(240, ...plan.tables.map((table) => 100 + table.guestIds.length * 22));
    const rows = Math.ceil(Math.max(1, plan.tables.length) / columns);
    const canvas = document.createElement("canvas");
    canvas.width = columns * cardWidth + 80;
    canvas.height = rows * cardHeight + 170 + Math.max(0, Math.ceil(unassigned.length / 4)) * 30;
    const context = canvas.getContext("2d");
    if (!context) {
      setStatus("The browser could not create the seating image.");
      return;
    }
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#111827";
    context.font = "bold 30px sans-serif";
    context.fillText("Event Seating Plan", 40, 50);
    context.font = "16px sans-serif";
    context.fillText(`${plan.guests.length} guests · ${plan.tables.length} tables`, 40, 82);
    plan.tables.forEach((table, index) => {
      const x = 40 + (index % columns) * cardWidth;
      const y = 110 + Math.floor(index / columns) * cardHeight;
      context.strokeStyle = "#d1d5db";
      context.strokeRect(x, y, cardWidth - 20, cardHeight - 20);
      context.fillStyle = "#111827";
      context.font = "bold 18px sans-serif";
      context.fillText(`${table.name} (${table.guestIds.length}/${table.capacity})`, x + 14, y + 30);
      context.font = "14px sans-serif";
      table.guestIds.map((id) => plan.guests.find((guest) => guest.id === id)?.name ?? "").forEach((name, guestIndex) => context.fillText(name.slice(0, 36), x + 14, y + 58 + guestIndex * 22));
    });
    const assignedRows = Math.ceil(Math.max(0, plan.tables.length) / columns);
    const unassignedY = 110 + assignedRows * cardHeight;
    context.fillStyle = "#111827";
    context.font = "bold 17px sans-serif";
    context.fillText(`Unassigned (${unassigned.length})`, 40, unassignedY);
    context.font = "14px sans-serif";
    unassigned.forEach((guest, index) => context.fillText(guest.name, 40 + (index % 4) * 250, unassignedY + 28 + Math.floor(index / 4) * 22));
    downloadCanvas(canvas, "event-seating-plan.png");
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <TextField label="Guest name" value={guestName} onChange={setGuestName} placeholder="Guest name" />
        <TextField label="New table name" value={tableName} onChange={setTableName} placeholder={`Table ${plan.tables.length + 1}`} />
      </FieldGrid>
      <ToolActions><ToolButton onClick={addGuest} disabled={!guestName.trim()}>Add guest</ToolButton><ToolButton secondary onClick={addTable}>Add table</ToolButton><ToolButton secondary onClick={exportPlan}>Export seating image</ToolButton></ToolActions>
      <section className="seating-unassigned" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, null)}>
        <h3>Unassigned guests ({unassigned.length})</h3>
        <div className="tool-chip-row">{unassigned.map((guest) => <span className="tool-chip" draggable key={guest.id} onDragStart={(event) => event.dataTransfer.setData("text/plain", guest.id)}>{guest.name}</span>)}
          {!unassigned.length && <span className="tool-muted">Drop a guest here to unassign them.</span>}
        </div>
      </section>
      <div className="seating-board">{plan.tables.map((table) => <div className="seating-table-card" key={table.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, table.id)}>
        <div className="seating-table-heading"><input aria-label="Table name" className="tool-input" value={table.name} onChange={(event) => {
          const name = event.currentTarget.value;
          setPlan((current) => ({ ...current, tables: current.tables.map((item) => item.id === table.id ? { ...item, name } : item) }));
        }} />
          <label className="tool-seats-field">Seats <input type="number" min="1" max="50" value={table.capacity} onChange={(event) => {
            const capacity = event.currentTarget.valueAsNumber;
            const currentTable = plan.tables.find((item) => item.id === table.id);
            if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) return;
            if (currentTable && capacity < currentTable.guestIds.length) {
              setStatus(`Move guests out of ${table.name} before reducing capacity below ${currentTable.guestIds.length}.`);
              return;
            }
            setPlan((current) => ({ ...current, tables: current.tables.map((item) => item.id === table.id ? { ...item, capacity } : item) }));
            setStatus("");
          }} /></label>
          <button type="button" className="tool-text-button" onClick={() => setPlan((current) => ({ ...current, tables: current.tables.filter((item) => item.id !== table.id) }))}>Remove</button>
        </div>
        <p className="tool-muted">{table.guestIds.length} of {table.capacity} seats used. Drag guests here.</p>
        <div className="tool-chip-row">{table.guestIds.map((id) => plan.guests.find((guest) => guest.id === id)).filter((guest): guest is Guest => Boolean(guest)).map((guest) => <span className="tool-chip" draggable key={guest.id} onDragStart={(event) => event.dataTransfer.setData("text/plain", guest.id)}>{guest.name}</span>)}</div>
      </div>)}</div>
      {(status || storageError) && <ToolResult><p role="status">{status || storageError}</p></ToolResult>}
      <p className="tool-muted">The plan is saved in this browser only. Drag guests to tables, and export a PNG before clearing browser data or changing devices.</p>
    </div>
  );
}

export default function MediaTools({ kind }: { kind: MediaKind }) {
  if (kind === "subtitle-timing-shifter") return <SubtitleTool />;
  if (kind === "print-size-quality-checker") return <PrintSizeChecker />;
  if (kind === "recipe-scaler") return <RecipeScaler />;
  return <SeatingPlanner />;
}
