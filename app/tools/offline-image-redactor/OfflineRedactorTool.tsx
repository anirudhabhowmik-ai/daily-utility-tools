"use client";

import { useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import ToolShell, { NumberField } from "../ToolShell";

function downloadCanvas(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

type ToolMode = "rectangle" | "ellipse" | "line" | "arrow" | "brush";
type Point = { x: number; y: number };

const drawingTools: { mode: ToolMode; label: string }[] = [
  { mode: "brush", label: "Brush" },
  { mode: "rectangle", label: "Rectangle" },
  { mode: "ellipse", label: "Ellipse" },
  { mode: "line", label: "Line" },
  { mode: "arrow", label: "Arrow" },
];

function drawShape(
  context: CanvasRenderingContext2D,
  mode: Exclude<ToolMode, "brush">,
  start: Point,
  end: Point,
  color: string,
  lineWidth: number,
) {
  const width = end.x - start.x;
  const height = end.y - start.y;
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (mode === "rectangle") {
    context.fillRect(
      Math.min(start.x, end.x),
      Math.min(start.y, end.y),
      Math.abs(width),
      Math.abs(height),
    );
    return;
  }

  if (mode === "ellipse") {
    context.beginPath();
    context.ellipse(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2,
      Math.max(Math.abs(width) / 2, 1),
      Math.max(Math.abs(height) / 2, 1),
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    return;
  }

  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  if (mode === "arrow") {
    const angle = Math.atan2(height, width);
    const headLength = Math.max(lineWidth * 2, 12);
    context.moveTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6),
    );
    context.lineTo(end.x, end.y);
    context.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6),
    );
  }
  context.stroke();
}

function drawBrushSegment(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  size: number,
  color: string,
) {
  context.strokeStyle = color;
  context.lineWidth = size;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
}

export default function OfflineRedactorTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const source = useRef<ImageData | null>(null);
  const history = useRef<ImageData[]>([]);
  
  // Drawing States
  const drawing = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const startPos = useRef<Point>({ x: 0, y: 0 });
  const lastPos = useRef<Point>({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null);
  
  // UI States
  const [ready, setReady] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [brushSize, setBrushSize] = useState(28);
  const [imageName, setImageName] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [toolMode, setToolMode] = useState<ToolMode>("rectangle");
  const [maskColor, setMaskColor] = useState("#111827"); // Default dark gray/black

  const reset = () => {
    setReady(false);
    setHistoryCount(0);
    setBrushSize(28);
    setImageName("");
    setInputKey((current) => current + 1);
    source.current = null;
    history.current = [];
    drawing.current = false;
    activePointerId.current = null;
    snapshot.current = null;
    setToolMode("rectangle");
    setMaskColor("#111827");
    if (canvasRef.current) {
      canvasRef.current.width = 0;
      canvasRef.current.height = 0;
    }
  };

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReady(false);
    drawing.current = false;
    activePointerId.current = null;
    snapshot.current = null;
    history.current = [];
    setHistoryCount(0);
    if (!file.type.startsWith("image/")) {
      setImageName("Please choose an image file.");
      return;
    }
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (context) {
        source.current = context.getImageData(0, 0, canvas.width, canvas.height);
        history.current = [];
        setHistoryCount(0);
        setReady(true);
      }
      URL.revokeObjectURL(objectUrl);
      setImageName(file.name);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setImageName("The selected image could not be opened.");
      setReady(false);
    };
    image.src = objectUrl;
  };

  const getCoords = (event: PointerEvent<HTMLCanvasElement>, clampToImage = false): Point | null => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height || !canvas.width || !canvas.height) return null;
    const scale = Math.min(width / canvas.width, height / canvas.height);
    const renderedWidth = canvas.width * scale;
    const renderedHeight = canvas.height * scale;
    const offsetX = (width - renderedWidth) / 2;
    const offsetY = (height - renderedHeight) / 2;
    const x = (event.clientX - bounds.left - canvas.clientLeft - offsetX) / scale;
    const y = (event.clientY - bounds.top - canvas.clientTop - offsetY) / scale;
    if (!clampToImage && (x < 0 || x > canvas.width || y < 0 || y > canvas.height)) return null;
    return {
      x: Math.max(0, Math.min(canvas.width, x)),
      y: Math.max(0, Math.min(canvas.height, y)),
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context || !ready || event.button !== 0) return;
    const point = getCoords(event);
    if (!point) return;

    // Save state for Undo (do this at the START of a new action)
    history.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > 10) history.current.shift(); // Keep last 10 actions
    setHistoryCount(history.current.length);

    const { x, y } = point;
    startPos.current = { x, y };
    lastPos.current = { x, y };
    drawing.current = true;
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (toolMode !== "brush") {
      snapshot.current = context.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      context.fillStyle = maskColor;
      context.beginPath();
      context.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      context.fill();
    }
  };

  const drawToPoint = (context: CanvasRenderingContext2D, point: Point) => {
    if (toolMode === "brush") {
      drawBrushSegment(context, lastPos.current, point, brushSize, maskColor);
      lastPos.current = point;
    } else if (snapshot.current) {
      context.putImageData(snapshot.current, 0, 0);
      drawShape(context, toolMode, startPos.current, point, maskColor, brushSize);
    }
  };

  const finishDrawing = (event: PointerEvent<HTMLCanvasElement>, commit: boolean) => {
    if (!drawing.current || activePointerId.current !== event.pointerId) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;

    if (commit) {
      const point = getCoords(event, true);
      if (point) drawToPoint(context, point);
    } else {
      const previous = history.current.pop();
      if (previous) context.putImageData(previous, 0, 0);
      setHistoryCount(history.current.length);
    }
    drawing.current = false;
    activePointerId.current = null;
    snapshot.current = null;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || activePointerId.current !== event.pointerId) return;
    const context = event.currentTarget.getContext("2d");
    const point = getCoords(event, true);
    if (context && point) drawToPoint(context, point);
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => finishDrawing(event, true);
  const handlePointerCancel = (event: PointerEvent<HTMLCanvasElement>) => finishDrawing(event, false);

  const undo = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const previous = history.current.pop();
    if (!canvas || !context || !previous) return;
    context.putImageData(previous, 0, 0);
    setHistoryCount(history.current.length);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !source.current) return;
    context.putImageData(source.current, 0, 0);
    history.current = [];
    setHistoryCount(0);
  };

  return (
    <ToolShell title="Image redaction studio" onReset={reset}>
      
      <label className="tool-field">
        Choose image
        <input key={inputKey} className="tool-input" type="file" accept="image/*" onChange={uploadImage} />
      </label>
      
      <div className="tool-field">
        <span>Drawing tool</span>
        <div className="tool-inline-options" role="group" aria-label="Drawing tool">
          {drawingTools.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              className="tool-secondary-button"
              aria-pressed={toolMode === mode}
              onClick={() => setToolMode(mode)}
              style={toolMode === mode ? {
                background: "var(--text-main)",
                borderColor: "var(--text-main)",
                color: "#FFFFFF",
              } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="tool-field">
        <span>Mask color</span>
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input 
            type="color" 
            value={maskColor} 
            onChange={(e) => setMaskColor(e.target.value)} 
            aria-label="Mask color"
            style={{ width: "40px", height: "40px", padding: "0", border: "none", cursor: "pointer", borderRadius: "6px" }}
          />
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{maskColor.toUpperCase()}</span>
        </span>
      </label>

      {(toolMode === "brush" || toolMode === "line" || toolMode === "arrow") && (
        <NumberField
          label={toolMode === "brush" ? "Brush size (image pixels)" : "Line width (image pixels)"}
          value={brushSize}
          min={4}
          max={300}
          onChange={setBrushSize}
        />
      )}

      {imageName && <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>{imageName}</p>}
      {!ready && <p className="tool-empty-state">Choose an image to start masking sensitive areas.</p>}

      {/* Canvas */}
      <canvas 
        ref={canvasRef} 
        onPointerDown={handlePointerDown} 
        onPointerMove={handlePointerMove} 
        onPointerUp={handlePointerUp} 
        onPointerCancel={handlePointerCancel} 
        className="tool-canvas-preview" 
        style={{ 
          display: ready ? "block" : "none", 
          touchAction: "none", 
          cursor: toolMode === "brush" ? "cell" : "crosshair",
          maxWidth: "100%",
          marginTop: "1rem",
          border: "1px solid var(--border-color)",
          borderRadius: "8px"
        }} 
      />
      
      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
        {toolMode === "brush"
          ? "Click or drag to paint over sensitive areas."
          : `Click and drag to draw a ${toolMode} mask. The shape anchors at your first click.`}
      </p>

      <div className="tool-action-row">
        <button type="button" className="tool-secondary-button" onClick={undo} disabled={historyCount === 0}>Undo</button>
        <button type="button" className="tool-secondary-button" onClick={clear} disabled={!ready || historyCount === 0}>Clear masks</button>
      </div>
      
      <button type="button" className="btn" onClick={() => downloadCanvas(canvasRef.current, "redacted-image.png")} disabled={!ready}>
        Download redacted PNG
      </button>

    </ToolShell>
  );
}