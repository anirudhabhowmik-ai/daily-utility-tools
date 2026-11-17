"use client";

import { useRef, useState, type PointerEvent } from "react";
import ToolShell, { NumberField } from "../ToolShell";
import FileUploadField from "../FileUploadField";

function downloadCanvas(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

type ToolMode =
  | "rectangle"
  | "roundedRectangle"
  | "ellipse"
  | "circle"
  | "triangle"
  | "diamond"
  | "line"
  | "arrow"
  | "brush";
type Point = { x: number; y: number };

const drawingTools: { mode: ToolMode; label: string }[] = [
  { mode: "brush", label: "Brush" },
  { mode: "rectangle", label: "Rectangle" },
  { mode: "roundedRectangle", label: "Rounded rectangle" },
  { mode: "ellipse", label: "Ellipse" },
  { mode: "circle", label: "Circle" },
  { mode: "triangle", label: "Triangle" },
  { mode: "diamond", label: "Diamond" },
  { mode: "line", label: "Line" },
  { mode: "arrow", label: "Arrow" },
];

const drawingInstructions: Record<ToolMode, string> = {
  brush: "Click or drag to paint over sensitive areas.",
  rectangle: "Click and drag to draw a solid rectangle mask.",
  roundedRectangle: "Click and drag to draw a solid rounded rectangle mask.",
  ellipse: "Click and drag to draw a solid ellipse mask.",
  circle: "Click and drag to draw a solid circle mask.",
  triangle: "Click and drag to draw a solid triangle mask.",
  diamond: "Click and drag to draw a solid diamond mask.",
  line: "Click and drag to draw a solid line mask.",
  arrow: "Click and drag to draw a solid arrow mask.",
};

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
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const boxWidth = Math.abs(width);
  const boxHeight = Math.abs(height);
  const right = left + boxWidth;
  const bottom = top + boxHeight;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (mode === "rectangle") {
    context.fillRect(left, top, boxWidth, boxHeight);
    return;
  }

  if (mode === "roundedRectangle") {
    const radius = Math.min(20, boxWidth / 2, boxHeight / 2);
    context.beginPath();
    context.moveTo(left + radius, top);
    context.lineTo(right - radius, top);
    context.quadraticCurveTo(right, top, right, top + radius);
    context.lineTo(right, bottom - radius);
    context.quadraticCurveTo(right, bottom, right - radius, bottom);
    context.lineTo(left + radius, bottom);
    context.quadraticCurveTo(left, bottom, left, bottom - radius);
    context.lineTo(left, top + radius);
    context.quadraticCurveTo(left, top, left + radius, top);
    context.closePath();
    context.fill();
    return;
  }

  if (mode === "ellipse" || mode === "circle") {
    const radiusX = mode === "circle"
      ? Math.max(Math.min(boxWidth, boxHeight) / 2, 1)
      : Math.max(boxWidth / 2, 1);
    const radiusY = mode === "circle" ? radiusX : Math.max(boxHeight / 2, 1);
    context.beginPath();
    context.ellipse(
      centerX,
      centerY,
      radiusX,
      radiusY,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    return;
  }

  if (mode === "triangle") {
    context.beginPath();
    context.moveTo(centerX, top);
    context.lineTo(right, bottom);
    context.lineTo(left, bottom);
    context.closePath();
    context.fill();
    return;
  }

  if (mode === "diamond") {
    context.beginPath();
    context.moveTo(centerX, top);
    context.lineTo(right, centerY);
    context.lineTo(centerX, bottom);
    context.lineTo(left, centerY);
    context.closePath();
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

  const uploadImage = (file: File | null) => {
    if (!file) return;
    setReady(false);
    setImageName("");
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
      <FileUploadField
        key={inputKey}
        label="Choose image to redact"
        accept="image/*"
        helperText="PNG, JPG, WebP, or another browser-supported image. Processing stays on this device."
        onFileSelect={uploadImage}
      />
      {imageName && !ready && <p className="tool-file-feedback" role="status">{imageName}</p>}

      <section className="redactor-settings" aria-label="Redaction settings">
        <div className="tool-field">
          <span>Drawing tool</span>
          <div className="redactor-tool-options" role="group" aria-label="Drawing tool">
            {drawingTools.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                className="redactor-tool-button"
                aria-pressed={toolMode === mode}
                onClick={() => setToolMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="tool-field redactor-color-field">
          <span>Mask color</span>
          <span className="redactor-color-control">
            <input
              type="color"
              value={maskColor}
              onChange={(e) => setMaskColor(e.target.value)}
              aria-label="Mask color"
            />
            <span>{maskColor.toUpperCase()}</span>
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
      </section>

      {!ready && <p className="tool-empty-state">Choose an image to start masking sensitive areas.</p>}

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="tool-canvas-preview redactor-canvas"
        style={{ display: ready ? "block" : "none", cursor: toolMode === "brush" ? "cell" : "crosshair" }}
      />

      <p className="redactor-instructions">
        {drawingInstructions[toolMode]}
      </p>

      <div className="tool-action-row redactor-actions">
        <button type="button" className="tool-secondary-button" onClick={undo} disabled={historyCount === 0}>Undo</button>
        <button type="button" className="tool-secondary-button" onClick={clear} disabled={!ready || historyCount === 0}>Clear masks</button>
        <button type="button" className="btn redactor-download" onClick={() => downloadCanvas(canvasRef.current, "redacted-image.png")} disabled={!ready}>
          Download redacted PNG
        </button>
      </div>
    </ToolShell>
  );
}