"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { AdditionalToolKind } from "./config";
import { downloadCanvas, FieldGrid, FileField, formatBytes, loadLocalImage, NumberField, SelectField, ToolActions, ToolButton, ToolResult } from "./ui";

type PrivacyKind = Extract<AdditionalToolKind, "file-metadata-viewer" | "screenshot-redaction-tool">;
type MetadataEntry = { name: string; value: string };

function decodeAscii(bytes: Uint8Array, start: number, length: number) {
  return new TextDecoder("ascii").decode(bytes.slice(start, start + length)).replace(/\0+$/, "").trim();
}

function parseExif(bytes: Uint8Array, base: number) {
  if (decodeAscii(bytes, base, 2) !== "II" && decodeAscii(bytes, base, 2) !== "MM") return [];
  const little = decodeAscii(bytes, base, 2) === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, little);
  const u32 = (offset: number) => view.getUint32(offset, little);
  if (u16(base + 2) !== 42) return [];
  const readIfd = (relativeOffset: number) => {
    const offset = base + relativeOffset;
    if (offset < base || offset + 2 > bytes.length) return new Map<number, { type: number; count: number; position: number; value: number }>();
    const count = Math.min(u16(offset), 512);
    const entries = new Map<number, { type: number; count: number; position: number; value: number }>();
    for (let index = 0; index < count; index += 1) {
      const position = offset + 2 + index * 12;
      if (position + 12 > bytes.length) break;
      const tag = u16(position);
      const type = u16(position + 2);
      const itemCount = u32(position + 4);
      const value = itemCount * (type === 5 || type === 10 ? 8 : type === 3 ? 2 : 1) <= 4 ? position + 8 : base + u32(position + 8);
      entries.set(tag, { type, count: itemCount, position, value });
    }
    return entries;
  };
  const valueOf = (entry: { type: number; count: number; position: number; value: number } | undefined): string => {
    if (!entry || entry.count > 5000 || entry.value < base || entry.value >= bytes.length) return "";
    if (entry.type === 2) return decodeAscii(bytes, entry.value, Math.min(entry.count, bytes.length - entry.value));
    if (entry.type === 3) {
      const values = Array.from({ length: Math.min(entry.count, 16) }, (_, index) => {
        const position = entry.count * 2 <= 4 ? entry.position + 8 + index * 2 : entry.value + index * 2;
        return position + 2 <= bytes.length ? u16(position) : 0;
      });
      return values.join(", ");
    }
    if (entry.type === 4) {
      const values = Array.from({ length: Math.min(entry.count, 16) }, (_, index) => {
        const position = entry.count * 4 <= 4 ? entry.position + 8 : entry.value + index * 4;
        return position + 4 <= bytes.length ? u32(position) : 0;
      });
      return values.join(", ");
    }
    if (entry.type === 5 && entry.count <= 3) {
      const values = Array.from({ length: entry.count }, (_, index) => {
        const position = entry.value + index * 8;
        if (position + 8 > bytes.length) return "";
        const numerator = u32(position);
        const denominator = u32(position + 4);
        return denominator ? String(numerator / denominator) : "";
      });
      return values.join(", ");
    }
    return "";
  };
  const tags = readIfd(u32(base + 4));
  const result: MetadataEntry[] = [];
  const add = (name: string, value: string) => { if (value) result.push({ name, value }); };
  add("Camera make", valueOf(tags.get(0x010f)));
  add("Camera model", valueOf(tags.get(0x0110)));
  add("Software", valueOf(tags.get(0x0131)));
  add("Image date/time", valueOf(tags.get(0x0132)));
  const exifPointer = tags.get(0x8769);
  if (exifPointer) {
    const nestedOffset = exifPointer.type === 4 ? u32(exifPointer.value) : 0;
    const nested = readIfd(nestedOffset);
    add("Original date/time", valueOf(nested.get(0x9003)));
    add("Digitized date/time", valueOf(nested.get(0x9004)));
    add("Lens", valueOf(nested.get(0xa434)));
  }
  const gpsPointer = tags.get(0x8825);
  if (gpsPointer && gpsPointer.type === 4) {
    const gps = readIfd(u32(gpsPointer.value));
    const latitude = valueOf(gps.get(2));
    const longitude = valueOf(gps.get(4));
    const latRef = valueOf(gps.get(1));
    const lonRef = valueOf(gps.get(3));
    if (latitude && longitude) add("GPS coordinates (degrees, minutes, seconds)", `${latRef} ${latitude}; ${lonRef} ${longitude}`);
    add("GPS altitude", valueOf(gps.get(6)));
  }
  return result;
}

function parseJpeg(bytes: Uint8Array) {
  const entries: MetadataEntry[] = [];
  let offset = 2;
  while (offset + 4 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) break;
    const dataStart = offset + 4;
    if (marker === 0xe1 && decodeAscii(bytes, dataStart, 6) === "Exif") entries.push(...parseExif(bytes, dataStart + 6));
    if (marker === 0xed) entries.push({ name: "IPTC data", value: "An IPTC metadata segment is present; its fields are not decoded by this viewer." });
    offset += 2 + length;
  }
  return entries;
}

function xmlValues(text: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("This document's metadata XML could not be read.");
  const tags = ["creator", "lastModifiedBy", "created", "modified", "Application", "Company", "TotalTime"];
  return tags.flatMap((tag) => Array.from(document.getElementsByTagName("*"))
    .filter((element) => element.localName.toLowerCase() === tag.toLowerCase())
    .map((element) => ({ name: tag, value: element.textContent?.trim() ?? "" }))
    .filter((entry) => entry.value));
}

async function extractDocx(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65558); index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      end = index;
      break;
    }
  }
  if (end < 0) throw new Error("Word archive index was not found. The document may be unsupported or damaged.");
  const totalEntries = view.getUint16(end + 10, true);
  let central = view.getUint32(end + 16, true);
  const wanted = new Set(["docProps/core.xml", "docProps/app.xml"]);
  const found: MetadataEntry[] = [];
  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(central, true) !== 0x02014b50) break;
    const method = view.getUint16(central + 10, true);
    const compressedSize = view.getUint32(central + 20, true);
    const nameLength = view.getUint16(central + 28, true);
    const extraLength = view.getUint16(central + 30, true);
    const commentLength = view.getUint16(central + 32, true);
    const localOffset = view.getUint32(central + 42, true);
    const name = decodeAscii(bytes, central + 46, nameLength);
    if (wanted.has(name)) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
      let data: Uint8Array;
      if (method === 0) data = compressed;
      else if (method === 8 && typeof DecompressionStream !== "undefined") {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
        data = new Uint8Array(await new Response(stream).arrayBuffer());
      } else throw new Error("This Word file uses a compression method not supported by this browser.");
      found.push(...xmlValues(new TextDecoder("utf-8").decode(data)));
    }
    central += 46 + nameLength + extraLength + commentLength;
  }
  return found;
}

function parsePdf(bytes: Uint8Array) {
  const text = new TextDecoder("windows-1252").decode(bytes);
  const fields: MetadataEntry[] = [];
  for (const [key, label] of [["Author", "Author"], ["Creator", "Creator"], ["Producer", "Producer"], ["CreationDate", "Created"], ["ModDate", "Modified"]] as const) {
    const matcher = new RegExp(`/${key}\\s*\\(([^)]{1,1000})\\)`);
    const match = text.match(matcher);
    if (match) fields.push({ name: label, value: match[1].replace(/\\([()\\])/g, "$1") });
  }
  const xmp = text.match(/<\?xpacket[^>]*\?>([\s\S]{0,100000})<\?xpacket end=/);
  if (xmp) fields.push(...xmlValues(xmp[1]));
  if (text.includes("/Encrypt")) fields.push({ name: "Encryption", value: "This PDF appears encrypted; some metadata may not be readable." });
  return fields;
}

function parsePng(bytes: Uint8Array) {
  const fields: MetadataEntry[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    if (length > bytes.length - offset - 12) break;
    const type = decodeAscii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    if (type === "eXIf") fields.push(...parseExif(bytes, dataStart));
    if (type === "tEXt") {
      const data = decodeAscii(bytes, dataStart, length);
      const separator = data.indexOf("\0");
      if (separator > 0) fields.push({ name: data.slice(0, separator), value: data.slice(separator + 1) });
    }
    if (type === "iTXt") {
      const data = decodeAscii(bytes, dataStart, length);
      const separator = data.indexOf("\0");
      if (separator > 0) fields.push({ name: data.slice(0, separator), value: data.slice(separator + 1).replace(/^\0[^\0]*\0[^\0]*\0/, "") });
    }
    offset += length + 12;
  }
  return fields;
}

function FileMetadataViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<MetadataEntry[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function inspect(selected: File | null) {
    setFile(selected);
    setFields([]);
    setStatus("");
    if (!selected) return;
    setBusy(true);
    try {
      if (selected.size > 50 * 1024 * 1024) throw new Error("Files over 50 MB are not inspected to avoid using excessive browser memory.");
      const bytes = new Uint8Array(await selected.arrayBuffer());
      const name = selected.name.toLowerCase();
      let metadata: MetadataEntry[] = [];
      if (selected.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) metadata = parseJpeg(bytes);
      else if (selected.type === "image/png" || name.endsWith(".png")) metadata = parsePng(bytes);
      else if (selected.type === "application/pdf" || name.endsWith(".pdf")) metadata = parsePdf(bytes);
      else if (name.endsWith(".docx")) metadata = await extractDocx(bytes);
      else {
        setStatus("The file type is not supported for embedded metadata extraction. Only basic file properties are shown.");
        return;
      }
      setFields(metadata);
      setStatus(metadata.length ? `${metadata.length} metadata field(s) found.` : "No supported metadata fields were detected. This does not prove that the file has no hidden information.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "The file could not be inspected.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FileField label="Choose a photo, PDF, or Word .docx file (processed locally)" accept="image/jpeg,image/png,application/pdf,.docx" onChange={(selected) => { void inspect(selected); }} />
      {file && <ToolResult><p><strong>{file.name}</strong> · {file.type || "type not reported"} · {formatBytes(file.size)}</p><p>File modified: {new Date(file.lastModified).toLocaleString()}</p></ToolResult>}
      {busy && <ToolResult><p>Inspecting file locally...</p></ToolResult>}
      {status && <ToolResult><p role="status">{status}</p></ToolResult>}
      {fields.length > 0 && <div className="tool-table-wrap"><table className="tool-data-table"><thead><tr><th>Field</th><th>Value found</th></tr></thead><tbody>{fields.map((field, index) => <tr key={`${field.name}-${index}`}><th scope="row">{field.name}</th><td className="tool-metadata-value">{field.value}</td></tr>)}</tbody></table></div>}
      <p className="tool-muted">Supported: common JPEG EXIF, PNG text/EXIF, basic PDF info/XMP, and standard Word .docx properties. Compressed, encrypted, or uncommon metadata may not be exposed; Word .doc files are not supported. No file is uploaded.</p>
    </div>
  );
}

type MaskMode = "black" | "pixelate";
type RedactionStroke = { mode: MaskMode; points: Array<{ x: number; y: number }>; size: number };

function ScreenshotRedactionTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<RedactionStroke[]>([]);
  const activeRef = useRef<RedactionStroke | null>(null);
  const pointerRef = useRef<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<MaskMode>("black");
  const [brush, setBrush] = useState(30);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [canvasReady, setCanvasReady] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  const draw = useCallback((strokes = strokesRef.current, active = activeRef.current) => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    if (!canvas || !base) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(base, 0, 0);
    const all = [...strokes, ...(active ? [active] : [])];
    const pixelated = all.filter((stroke) => stroke.mode === "pixelate");
    for (const stroke of pixelated) {
      context.save();
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const point of stroke.points.slice(1)) context.lineTo(point.x, point.y);
      if (stroke.points.length === 1) context.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1);
      context.lineWidth = stroke.size;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
      context.clip();
      const reduced = document.createElement("canvas");
      reduced.width = Math.max(1, Math.ceil(canvas.width / 14));
      reduced.height = Math.max(1, Math.ceil(canvas.height / 14));
      const reducedContext = reduced.getContext("2d");
      if (reducedContext) {
        reducedContext.drawImage(base, 0, 0, reduced.width, reduced.height);
        context.imageSmoothingEnabled = false;
        context.drawImage(reduced, 0, 0, canvas.width, canvas.height);
      }
      context.restore();
    }
    for (const stroke of all.filter((item) => item.mode === "black")) {
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const point of stroke.points.slice(1)) context.lineTo(point.x, point.y);
      if (stroke.points.length === 1) context.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1);
      context.lineWidth = stroke.size;
      context.lineCap = "square";
      context.lineJoin = "round";
      context.strokeStyle = "#000";
      context.stroke();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    if (canvas && base && (canvas.width !== base.width || canvas.height !== base.height)) {
      canvas.width = base.width;
      canvas.height = base.height;
    }
    draw();
  }, [draw, version]);

  async function loadScreenshot(selected: File | null) {
    setFile(selected);
    setError("");
    strokesRef.current = [];
    activeRef.current = null;
    baseRef.current = null;
    setCanvasReady(false);
    setStrokeCount(0);
    setVersion((current) => current + 1);
    if (!selected) return;
    try {
      const image = await loadLocalImage(selected);
      const scale = Math.min(1, 1800 / image.naturalWidth, 1800 / image.naturalHeight);
      const base = document.createElement("canvas");
      base.width = Math.max(1, Math.round(image.naturalWidth * scale));
      base.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = base.getContext("2d");
      if (!context) throw new Error("The browser could not prepare the screenshot.");
      context.drawImage(image, 0, 0, base.width, base.height);
      baseRef.current = base;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = base.width;
        canvas.height = base.height;
      }
      draw([]);
      setCanvasReady(true);
      setVersion((current) => current + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The screenshot could not be opened.");
    }
  }

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (canvas.width / bounds.width), y: (event.clientY - bounds.top) * (canvas.height / bounds.height) };
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!baseRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = event.pointerId;
    activeRef.current = { mode, points: [pointFromEvent(event)], size: brush };
    draw();
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (pointerRef.current !== event.pointerId || !activeRef.current) return;
    activeRef.current.points.push(pointFromEvent(event));
    draw();
  }

  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (pointerRef.current !== event.pointerId || !activeRef.current) return;
    strokesRef.current = [...strokesRef.current, activeRef.current];
    setStrokeCount(strokesRef.current.length);
    activeRef.current = null;
    pointerRef.current = null;
    draw();
    setVersion((current) => current + 1);
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <FileField label="Screenshot (processed locally)" accept="image/*" onChange={(selected) => { void loadScreenshot(selected); }} />
        <SelectField label="Mask style" value={mode} onChange={(value) => setMode(value as MaskMode)} options={[{ value: "black", label: "Solid black mask (recommended)" }, { value: "pixelate", label: "Pixelate (less secure)" }]} />
        <NumberField label="Brush width (source pixels)" value={brush} onChange={setBrush} min={4} max={300} step={2} />
      </FieldGrid>
      <ToolActions>
        <ToolButton secondary onClick={() => { strokesRef.current = strokesRef.current.slice(0, -1); setStrokeCount(strokesRef.current.length); draw(); setVersion((current) => current + 1); }} disabled={strokeCount === 0}>Undo last mask</ToolButton>
        <ToolButton secondary onClick={() => { strokesRef.current = []; activeRef.current = null; setStrokeCount(0); draw([]); setVersion((current) => current + 1); }} disabled={strokeCount === 0}>Clear masks</ToolButton>
        <ToolButton onClick={() => { if (canvasRef.current) downloadCanvas(canvasRef.current, "redacted-screenshot.png"); }} disabled={!canvasReady}>Export flattened PNG</ToolButton>
      </ToolActions>
      {error && <ToolResult><p role="alert">{error}</p></ToolResult>}
      {file && canvasReady && <div className="tool-image-preview redaction-canvas-wrap"><canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-label="Screenshot redaction canvas" /></div>}
      <p className="tool-muted">Draw over sensitive areas. Solid black is safest; pixelation can leave details recognizable. Export creates a flattened PNG with fresh image data; inspect the exported file before sharing.</p>
    </div>
  );
}

export default function PrivacyTools({ kind }: { kind: PrivacyKind }) {
  if (kind === "file-metadata-viewer") return <FileMetadataViewer />;
  return <ScreenshotRedactionTool />;
}
