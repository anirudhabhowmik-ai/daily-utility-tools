"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import ToolShell, { NumberField } from "../ToolShell";
import FileUploadField from "../FileUploadField";

/* ---------------------------------------------------------------- types */

type ToolMode =
  | "select"
  | "brush"
  | "rectangle"
  | "roundedRectangle"
  | "ellipse"
  | "circle"
  | "triangle"
  | "diamond"
  | "line"
  | "arrow"
  | "text"
  | "pixelate"
  | "blur";

type ShapeMode = Exclude<
  ToolMode,
  "select" | "brush" | "text" | "pixelate" | "blur"
>;
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

type Mask = {
  id: string;
  mode: ToolMode;
  color: string;
  opacity: number;
  filled: boolean;
  stroked: boolean;
  strokeWidth: number;
  shadow: boolean;
  text?: string;
  fontSize?: number;
  pixelSize?: number;
  blurRadius?: number;
  points: Point[]; // 1 point for brush stamp, 2+ for paths/shapes
};

type Tool = {
  mode: ToolMode;
  label: string;
  icon: string;
  hint: string;
};

type ExportFormat = "png" | "jpeg" | "webp";
type PanelTab = "tools" | "style";

const TOOLS: Tool[] = [
  {
    mode: "select",
    label: "Select",
    icon: "↖",
    hint: "Click a mask to select & move",
  },
  { mode: "brush", label: "Brush", icon: "✎", hint: "Paint freehand masks" },
  {
    mode: "rectangle",
    label: "Rectangle",
    icon: "▭",
    hint: "Drag a solid rectangle",
  },
  {
    mode: "roundedRectangle",
    label: "Rounded",
    icon: "▢",
    hint: "Drag a rounded rectangle",
  },
  { mode: "ellipse", label: "Ellipse", icon: "◯", hint: "Drag an ellipse" },
  { mode: "circle", label: "Circle", icon: "⬤", hint: "Drag a perfect circle" },
  { mode: "triangle", label: "Triangle", icon: "△", hint: "Drag a triangle" },
  { mode: "diamond", label: "Diamond", icon: "◇", hint: "Drag a diamond" },
  { mode: "line", label: "Line", icon: "／", hint: "Drag a line" },
  { mode: "arrow", label: "Arrow", icon: "➤", hint: "Drag an arrow" },
  { mode: "text", label: "Text", icon: "T", hint: "Click to place a label" },
  {
    mode: "pixelate",
    label: "Pixelate",
    icon: "▦",
    hint: "Drag to pixelate region",
  },
  { mode: "blur", label: "Blur", icon: "◐", hint: "Drag to blur region" },
];

const PRESETS: { label: string; color: string; hint: string }[] = [
  { label: "Solid black", color: "#111827", hint: "Standard redaction" },
  { label: "Dark gray", color: "#374151", hint: "Softer redaction" },
  { label: "White", color: "#ffffff", hint: "Cover on light images" },
  { label: "Red stamp", color: "#dc2626", hint: "Visible mark" },
];

const SHAPE_MODES: ToolMode[] = [
  "rectangle",
  "roundedRectangle",
  "ellipse",
  "circle",
  "triangle",
  "diamond",
  "line",
  "arrow",
];

const HISTORY_LIMIT = 30;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

/* -------------------------------------------------------------- helpers */

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRect(start: Point, end: Point): Rect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  };
}

function pointInRect(point: Point, rect: Rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

function imageDataRectBounds(mask: Mask): Rect {
  if (mask.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  if (mask.points.length === 1) {
    const p = mask.points[0];
    const r = (mask.strokeWidth || 10) / 2;
    return { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 };
  }
  const start = mask.points[0];
  const end = mask.points[mask.points.length - 1];
  return normalizeRect(start, end);
}

/* ---------------------------------------------------------- canvas draw */

function drawShapePath(
  context: CanvasRenderingContext2D,
  mode: ShapeMode,
  start: Point,
  end: Point,
) {
  const {
    x: left,
    y: top,
    w: boxWidth,
    h: boxHeight,
  } = normalizeRect(start, end);
  const right = left + boxWidth;
  const bottom = top + boxHeight;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  context.beginPath();

  if (mode === "rectangle") {
    context.rect(left, top, boxWidth, boxHeight);
    return;
  }

  if (mode === "roundedRectangle") {
    const radius = Math.min(24, boxWidth / 2, boxHeight / 2);
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
    return;
  }

  if (mode === "ellipse" || mode === "circle") {
    const radiusX =
      mode === "circle"
        ? Math.max(Math.min(boxWidth, boxHeight) / 2, 1)
        : Math.max(boxWidth / 2, 1);
    const radiusY = mode === "circle" ? radiusX : Math.max(boxHeight / 2, 1);
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    return;
  }

  if (mode === "triangle") {
    context.moveTo(centerX, top);
    context.lineTo(right, bottom);
    context.lineTo(left, bottom);
    context.closePath();
    return;
  }

  if (mode === "diamond") {
    context.moveTo(centerX, top);
    context.lineTo(right, centerY);
    context.lineTo(centerX, bottom);
    context.lineTo(left, centerY);
    context.closePath();
    return;
  }

  if (mode === "line" || mode === "arrow") {
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    if (mode === "arrow") {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLength = Math.max(14, 12);
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
  }
}

function applyMaskToContext(
  context: CanvasRenderingContext2D,
  mask: Mask,
  sourceContext: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
) {
  const color = mask.color;
  context.save();
  context.globalAlpha = clamp(mask.opacity, 0, 1);

  /* Pixelate & blur sample from the source layer */
  if (mask.mode === "pixelate" || mask.mode === "blur") {
    const start = mask.points[0];
    const end = mask.points[mask.points.length - 1];
    const rect = normalizeRect(start, end);
    if (rect.w < 1 || rect.h < 1) {
      context.restore();
      return;
    }
    const x = Math.max(0, Math.floor(rect.x));
    const y = Math.max(0, Math.floor(rect.y));
    const w = Math.min(canvasWidth - x, Math.ceil(rect.w));
    const h = Math.min(canvasHeight - y, Math.ceil(rect.h));
    if (w <= 0 || h <= 0) {
      context.restore();
      return;
    }
    const source = sourceContext.getImageData(x, y, w, h);

    if (mask.mode === "pixelate") {
      const size = Math.max(2, mask.pixelSize ?? 12);
      const temp = document.createElement("canvas");
      temp.width = Math.max(1, Math.floor(w / size));
      temp.height = Math.max(1, Math.floor(h / size));
      const tempCtx = temp.getContext("2d");
      if (!tempCtx) {
        context.restore();
        return;
      }
      const sourceTemp = document.createElement("canvas");
      sourceTemp.width = w;
      sourceTemp.height = h;
      sourceTemp.getContext("2d")?.putImageData(source, 0, 0);
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(sourceTemp, 0, 0, temp.width, temp.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(temp, 0, 0, temp.width, temp.height, x, y, w, h);
      context.imageSmoothingEnabled = true;
    } else {
      const radius = Math.max(1, mask.blurRadius ?? 8);
      const temp = document.createElement("canvas");
      temp.width = w;
      temp.height = h;
      const tempCtx = temp.getContext("2d");
      if (!tempCtx) {
        context.restore();
        return;
      }
      const sourceTemp = document.createElement("canvas");
      sourceTemp.width = w;
      sourceTemp.height = h;
      sourceTemp.getContext("2d")?.putImageData(source, 0, 0);
      tempCtx.filter = `blur(${radius}px)`;
      tempCtx.drawImage(sourceTemp, 0, 0);
      context.drawImage(temp, x, y);
    }
    context.restore();
    return;
  }

  /* Text labels */
  if (mask.mode === "text") {
    if (!mask.text) {
      context.restore();
      return;
    }
    const fontSize = mask.fontSize ?? 22;
    context.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    context.textBaseline = "top";
    context.fillStyle = color;
    context.fillText(mask.text, mask.points[0].x, mask.points[0].y);
    context.restore();
    return;
  }

  /* Brush */
  if (mask.mode === "brush") {
    context.strokeStyle = color;
    context.lineWidth = mask.strokeWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (mask.shadow) {
      context.shadowColor = "rgba(0,0,0,0.35)";
      context.shadowBlur = 4;
    }
    if (mask.points.length === 1) {
      const p = mask.points[0];
      context.beginPath();
      context.arc(p.x, p.y, mask.strokeWidth / 2, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.restore();
      return;
    }
    context.beginPath();
    context.moveTo(mask.points[0].x, mask.points[0].y);
    for (let i = 1; i < mask.points.length; i += 1) {
      context.lineTo(mask.points[i].x, mask.points[i].y);
    }
    context.stroke();
    context.restore();
    return;
  }

  /* Shape modes */
  if (SHAPE_MODES.includes(mask.mode)) {
    const start = mask.points[0];
    const end = mask.points[mask.points.length - 1];
    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineWidth = mask.strokeWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (mask.shadow) {
      context.shadowColor = "rgba(0,0,0,0.35)";
      context.shadowBlur = 4;
    }
    drawShapePath(context, mask.mode as ShapeMode, start, end);
    const isLineLike = mask.mode === "line" || mask.mode === "arrow";
    if (isLineLike) {
      context.stroke();
    } else {
      if (mask.filled) context.fill();
      if (mask.stroked) context.stroke();
    }
    context.restore();
    return;
  }

  context.restore();
}

/* ------------------------------------------------------------- component */

export default function OfflineRedactorTool() {
  /* ---- image ---- */
  const [imageName, setImageName] = useState("");
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  /* ---- masks ---- */
  const [masks, setMasks] = useState<Mask[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ---- tooling ---- */
  const [toolMode, setToolMode] = useState<ToolMode>("rectangle");
  const [maskColor, setMaskColor] = useState("#111827");
  const [opacity, setOpacity] = useState(1);
  const [filled, setFilled] = useState(true);
  const [stroked, setStroked] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(14);
  const [shadow, setShadow] = useState(false);
  const [brushSize, setBrushSize] = useState(28);
  const [fontSize, setFontSize] = useState(22);
  const [pixelSize, setPixelSize] = useState(12);
  const [blurRadius, setBlurRadius] = useState(8);
  const [textValue, setTextValue] = useState("REDACTED");
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [pendingTextPoint, setPendingTextPoint] = useState<Point | null>(null);

  /* ---- view ---- */
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });

  /* ---- export ---- */
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(0.92);
  const [exportName, setExportName] = useState("redacted-image");

  /* ---- history ---- */
  const [historyCount, setHistoryCount] = useState(0);
  const [futureCount, setFutureCount] = useState(0);

  /* ---- misc ui ---- */
  const [status, setStatus] = useState(
    "Choose an image to start masking sensitive areas.",
  );
  const [tone, setTone] = useState<"idle" | "active" | "success" | "warn">(
    "idle",
  );
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("tools");

  /* ---- refs ---- */
  const previewRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const baseCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const historyRef = useRef<Mask[][]>([]);
  const futureRef = useRef<Mask[][]>([]);
  const drawingRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);
  const startPosRef = useRef<Point>({ x: 0, y: 0 });
  const lastPosRef = useRef<Point>({ x: 0, y: 0 });
  const currentMaskRef = useRef<Mask | null>(null);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const dragStartPointRef = useRef<Point>({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const panningRef = useRef(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* -------------------------------------------------------------- helpers */

  const flash = useCallback(
    (
      message: string,
      kind: "idle" | "active" | "success" | "warn" = "idle",
    ) => {
      setStatus(message);
      setTone(kind);
    },
    [],
  );

  const reset = useCallback(() => {
    setReady(false);
    setHistoryCount(0);
    setFutureCount(0);
    setImageName("");
    setImageSize(null);
    setInputKey((k) => k + 1);
    setMasks([]);
    setSelectedId(null);
    setToolMode("rectangle");
    setMaskColor("#111827");
    setOpacity(1);
    setFilled(true);
    setStroked(false);
    setStrokeWidth(14);
    setShadow(false);
    setBrushSize(28);
    setFontSize(22);
    setPixelSize(12);
    setBlurRadius(8);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setShowTextDialog(false);
    setPendingTextPoint(null);
    setActiveTab("tools");
    historyRef.current = [];
    futureRef.current = [];
    baseRef.current = null;
    baseCtxRef.current = null;
    maskCanvasRef.current = null;
    maskCtxRef.current = null;
    currentMaskRef.current = null;
    drawingRef.current = false;
    activePointerRef.current = null;
    if (previewRef.current) {
      previewRef.current.width = 0;
      previewRef.current.height = 0;
    }
    flash("Choose an image to start masking sensitive areas.");
  }, [flash]);

  /* -------------------------------------------------------- compose layers */

  const compose = useCallback(() => {
    const preview = previewRef.current;
    const base = baseRef.current;
    const mask = maskCanvasRef.current;
    if (!preview || !base || !mask) return;
    const ctx = preview.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(base, 0, 0);
    ctx.drawImage(mask, 0, 0);
  }, []);

  const redrawMaskLayer = useCallback(
    (maskList: Mask[]) => {
      const mask = maskCanvasRef.current;
      const baseCtx = baseCtxRef.current;
      const maskCtx = maskCtxRef.current;
      if (!mask || !baseCtx || !maskCtx) return;
      maskCtx.clearRect(0, 0, mask.width, mask.height);
      for (const m of maskList) {
        applyMaskToContext(maskCtx, m, baseCtx, mask.width, mask.height);
      }
      compose();
    },
    [compose],
  );

  /* Keep mask canvas visually in sync with state. */
  useEffect(() => {
    redrawMaskLayer(masks);
  }, [masks, redrawMaskLayer]);

  /* --------------------------------------------------------------- history */

  const pushHistory = useCallback((snapshot: Mask[]) => {
    historyRef.current.push(snapshot);
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    futureRef.current = [];
    setHistoryCount(historyRef.current.length);
    setFutureCount(0);
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current.pop()!;
    futureRef.current.push(masks);
    setMasks(previous);
    setHistoryCount(historyRef.current.length);
    setFutureCount(futureRef.current.length);
    setSelectedId(null);
    flash("Undone.", "warn");
  }, [masks, flash]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(masks);
    setMasks(next);
    setHistoryCount(historyRef.current.length);
    setFutureCount(futureRef.current.length);
    setSelectedId(null);
    flash("Redone.", "success");
  }, [masks, flash]);

  /* ------------------------------------------------------------- upload */

  const uploadImage = useCallback(
    (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        flash("Please choose an image file.", "warn");
        return;
      }
      setReady(false);
      setMasks([]);
      setSelectedId(null);
      historyRef.current = [];
      futureRef.current = [];
      setHistoryCount(0);
      setFutureCount(0);

      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        const preview = previewRef.current;
        if (!preview) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        const maxDimension = 2000;
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));

        preview.width = width;
        preview.height = height;

        const base = document.createElement("canvas");
        base.width = width;
        base.height = height;
        const baseCtx = base.getContext("2d", { willReadFrequently: true });
        if (!baseCtx) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        baseCtx.drawImage(image, 0, 0, width, height);
        baseRef.current = base;
        baseCtxRef.current = baseCtx;

        const mask = document.createElement("canvas");
        mask.width = width;
        mask.height = height;
        const maskCtx = mask.getContext("2d");
        if (!maskCtx) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        maskCanvasRef.current = mask;
        maskCtxRef.current = maskCtx;

        compose();
        setImageSize({ w: width, h: height });
        setImageName(file.name);
        setExportName(file.name.replace(/\.[^.]+$/, "") + "-redacted");
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setReady(true);
        flash(
          `Loaded ${width}×${height}px — ${file.name}. Pick a tool to start.`,
          "active",
        );
        URL.revokeObjectURL(objectUrl);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        flash("The selected image could not be opened.", "warn");
        setReady(false);
      };
      image.src = objectUrl;
    },
    [compose, flash],
  );

  /* ------------------------------------------------------------ pointer math */

  const getCoords = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    clampToImage = false,
  ): Point | null => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    if (!canvas.width || !canvas.height) return null;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let x = (event.clientX - rect.left) * scaleX;
    let y = (event.clientY - rect.top) * scaleY;
    if (
      !clampToImage &&
      (x < 0 || x > canvas.width || y < 0 || y > canvas.height)
    ) {
      return null;
    }
    x = clamp(x, 0, canvas.width);
    y = clamp(y, 0, canvas.height);
    return { x, y };
  };

  /* ---------------------------------------------------------- interactions */

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    /* Middle-button or alt-pan */
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      event.preventDefault();
      panningRef.current = true;
      panStartRef.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    const point = getCoords(event);
    if (!point) return;

    /* Select existing mask */
    if (toolMode === "select") {
      const hit = [...masks].reverse().find((m) => {
        if (m.mode === "brush") {
          return m.points.some((p) => {
            const dx = p.x - point.x;
            const dy = p.y - point.y;
            return Math.hypot(dx, dy) <= m.strokeWidth / 2 + 4;
          });
        }
        if (m.mode === "text") {
          return (
            Math.abs(m.points[0].x - point.x) < 40 &&
            Math.abs(m.points[0].y - point.y) < 40
          );
        }
        return pointInRect(point, imageDataRectBounds(m));
      });
      setSelectedId(hit?.id ?? null);
      if (hit) {
        dragStartPointRef.current = point;
        dragOffsetRef.current = { x: point.x, y: point.y };
        dragMovedRef.current = false;
        drawingRef.current = true;
        activePointerRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        flash(
          `Selected ${hit.mode} mask — drag to move, Del to remove.`,
          "active",
        );
      } else {
        flash("Nothing selected.", "idle");
      }
      return;
    }

    if (toolMode === "text") {
      setPendingTextPoint(point);
      setShowTextDialog(true);
      return;
    }

    /* Begin new mask */
    const startMask: Mask = {
      id: createId(),
      mode: toolMode,
      color: maskColor,
      opacity,
      filled,
      stroked,
      strokeWidth:
        SHAPE_MODES.includes(toolMode) &&
        toolMode !== "line" &&
        toolMode !== "arrow"
          ? strokeWidth
          : brushSize,
      shadow,
      fontSize,
      pixelSize,
      blurRadius,
      text: undefined,
      points: [point],
    };

    startPosRef.current = point;
    lastPosRef.current = point;
    currentMaskRef.current = startMask;
    drawingRef.current = true;
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);

    /* Live preview */
    redrawMaskLayer([...masks, startMask]);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (panningRef.current) {
      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      panStartRef.current = { x: event.clientX, y: event.clientY };
      return;
    }
    if (!drawingRef.current || activePointerRef.current !== event.pointerId)
      return;
    const point = getCoords(event, true);
    if (!point) return;

    /* Move selected */
    if (toolMode === "select" && selectedId) {
      dragMovedRef.current = true;
      const dx = point.x - dragStartPointRef.current.x;
      const dy = point.y - dragStartPointRef.current.y;
      setMasks((prev) =>
        prev.map((m) =>
          m.id === selectedId
            ? {
                ...m,
                points: m.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
              }
            : m,
        ),
      );
      dragStartPointRef.current = point;
      return;
    }

    const current = currentMaskRef.current;
    if (!current) return;

    if (current.mode === "brush") {
      current.points.push(point);
      lastPosRef.current = point;
    } else {
      current.points = [startPosRef.current, point];
    }

    redrawMaskLayer([...masks, current]);
  };

  const finishDrawing = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    commit: boolean,
  ) => {
    if (panningRef.current) {
      panningRef.current = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }
    if (!drawingRef.current || activePointerRef.current !== event.pointerId)
      return;

    const canvas = event.currentTarget;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    drawingRef.current = false;
    activePointerRef.current = null;

    if (toolMode === "select" && selectedId) {
      if (dragMovedRef.current) {
        pushHistory([...masks]);
        flash("Moved mask.", "success");
      }
      dragMovedRef.current = false;
      return;
    }

    const current = currentMaskRef.current;
    currentMaskRef.current = null;

    if (!commit || !current) {
      redrawMaskLayer(masks);
      return;
    }

    /* Reject tiny accidental drags */
    if (current.mode !== "brush") {
      const start = current.points[0];
      const end = current.points[current.points.length - 1] || start;
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      if (w < 3 && h < 3) {
        redrawMaskLayer(masks);
        flash("Too small — drag a bit further.", "warn");
        return;
      }
    }

    pushHistory([...masks]);
    const next = [...masks, current];
    setMasks(next);
    setSelectedId(current.id);
    flash("Mask added.", "success");
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) =>
    finishDrawing(event, true);
  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) =>
    finishDrawing(event, false);

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom((z) => clamp(z * factor, MIN_ZOOM, MAX_ZOOM));
  };

  /* -------------------------------------------------------- mask operations */

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    pushHistory([...masks]);
    setMasks((prev) => prev.filter((m) => m.id !== selectedId));
    setSelectedId(null);
    flash("Mask removed.", "success");
  }, [selectedId, masks, pushHistory, flash]);

  const clearMasks = useCallback(() => {
    if (masks.length === 0) return;
    pushHistory([...masks]);
    setMasks([]);
    setSelectedId(null);
    flash("All masks cleared.", "success");
  }, [masks, pushHistory, flash]);

  const placeText = useCallback(() => {
    if (!pendingTextPoint) return;
    if (!textValue.trim()) {
      setShowTextDialog(false);
      setPendingTextPoint(null);
      return;
    }
    const newMask: Mask = {
      id: createId(),
      mode: "text",
      color: maskColor,
      opacity,
      filled: true,
      stroked: false,
      strokeWidth: 0,
      shadow,
      text: textValue.trim(),
      fontSize,
      points: [pendingTextPoint],
    };
    pushHistory([...masks]);
    setMasks((prev) => [...prev, newMask]);
    setSelectedId(newMask.id);
    setShowTextDialog(false);
    setPendingTextPoint(null);
    flash("Text label placed.", "success");
  }, [
    pendingTextPoint,
    textValue,
    maskColor,
    opacity,
    shadow,
    fontSize,
    masks,
    pushHistory,
    flash,
  ]);

  /* ---------------------------------------------------------------- export */

  const exportImage = useCallback(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const filename = `${(exportName || "redacted").replace(/[\\/:*?"<>|]/g, "_")}.${
      format === "jpeg" ? "jpg" : format
    }`;
    const mime =
      format === "png"
        ? "image/png"
        : format === "jpeg"
          ? "image/jpeg"
          : "image/webp";
    const link = document.createElement("a");
    link.download = filename;
    if (format === "png") {
      link.href = preview.toDataURL(mime);
    } else {
      link.href = preview.toDataURL(mime, quality);
    }
    document.body.appendChild(link);
    link.click();
    link.remove();
    flash(`Exported ${filename}.`, "success");
  }, [exportName, format, quality, flash]);

  /* --------------------------------------------------------------- keyboard */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return;
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === "z" && !event.shiftKey) {
          event.preventDefault();
          undo();
        } else if (
          (event.key.toLowerCase() === "z" && event.shiftKey) ||
          event.key.toLowerCase() === "y"
        ) {
          event.preventDefault();
          redo();
        }
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedId) {
          event.preventDefault();
          deleteSelected();
        }
        return;
      }
      if (event.key === "Escape") {
        setSelectedId(null);
        setShowTextDialog(false);
        setPendingTextPoint(null);
        return;
      }
      if (event.key === "v" || event.key === "V") setToolMode("select");
      if (event.key === "b" || event.key === "B") setToolMode("brush");
      if (event.key === "r" || event.key === "R") setToolMode("rectangle");
      if (event.key === "e" || event.key === "E") setToolMode("ellipse");
      if (event.key === "l" || event.key === "L") setToolMode("line");
      if (event.key === "t" || event.key === "T") setToolMode("text");
      if (event.key === "p" || event.key === "P") setToolMode("pixelate");
      if (event.key === "0") {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, deleteSelected, selectedId]);

  /* ------------------------------------------------------------- view helpers */

  const fitToScreen = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  /* ------------------------------------------------------------- derived */

  const selectedMask = useMemo(
    () => masks.find((m) => m.id === selectedId) ?? null,
    [masks, selectedId],
  );

  const isLineTool = toolMode === "line" || toolMode === "arrow";
  const needsStrokeWidth =
    toolMode === "brush" || isLineTool || SHAPE_MODES.includes(toolMode);
  const needsShapeStyle = SHAPE_MODES.includes(toolMode) && !isLineTool;
  const needsShadow = toolMode === "brush" || SHAPE_MODES.includes(toolMode);
  const needsPixelSize = toolMode === "pixelate";
  const needsBlurRadius = toolMode === "blur";
  const needsFontSize = toolMode === "text";

  const currentTool = TOOLS.find((t) => t.mode === toolMode) ?? TOOLS[0];

  const statusIcon =
    tone === "success"
      ? "✓"
      : tone === "warn"
        ? "!"
        : tone === "active"
          ? "◉"
          : "◆";

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "tools", label: "Tools" },
    { id: "style", label: "Appearance" },
  ];

  const helpSteps = [
    ["Upload an image", "It stays in this browser — nothing is uploaded."],
    ["Draw masks", "Pick a shape or brush and drag over anything private."],
    [
      "Pixelate or blur",
      "For text-heavy regions, pixelate or blur instead of covering.",
    ],
    [
      "Select & adjust",
      "Use the Select tool to move or delete a mask after drawing.",
    ],
    ["Export", "Download as PNG (lossless), JPG or WebP."],
  ];

  /* ---------------------------------------------------------------- render */

  return (
    <ToolShell title="Image redaction studio" onReset={reset} wide>
      <div className="rd-wrapper">
        {/* =================================================
            HEADER
        ================================================= */}
        <div className="rd-header">
          <div>
            <span className="rd-eyebrow">REDACTION WORKSPACE</span>
            <h2>Redact sensitive details</h2>
            <p>
              Cover, blur or pixelate private areas of an image. Everything
              runs on this device, so nothing is uploaded.
            </p>
          </div>

          <div className="rd-header-stat">
            <span>Masks</span>
            <strong>{masks.length}</strong>
          </div>
        </div>

        {/* =================================================
            MAIN GRID
        ================================================= */}
        <div className="rd-main-grid">
          {/* LEFT: CONTROLS */}
          <div className="rd-settings-column">
            {/* STEP 1: UPLOAD */}
            <section className="rd-card">
              <div className="rd-card-heading">
                <div>
                  <span className="rd-step">01</span>
                  <h3>Choose your image</h3>
                </div>
              </div>

              <FileUploadField
                key={inputKey}
                label="Choose image to redact"
                accept="image/*"
                helperText="PNG, JPG, WebP, GIF. Processing stays entirely on this device — nothing is uploaded."
                onFileSelect={uploadImage}
              />
              {imageName && !ready && (
                <p className="rd-feedback" role="status">
                  {imageName}
                </p>
              )}
            </section>

            {/* STEP 2: CUSTOMIZE */}
            <section className="rd-card">
              <div className="rd-card-heading">
                <div>
                  <span className="rd-step">02</span>
                  <h3>Customize your masks</h3>
                </div>
                <span className="rd-badge">{currentTool.label}</span>
              </div>

              <div
                className="rd-tabs"
                role="tablist"
                aria-label="Mask settings"
              >
                {tabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={
                      activeTab === tab.id ? "rd-tab rd-tab-active" : "rd-tab"
                    }
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TOOLS TAB */}
              {activeTab === "tools" && (
                <div className="rd-tab-content">
                  <p className="rd-tool-hint">{currentTool.hint}</p>

                  <div
                    className="rd-tools"
                    role="toolbar"
                    aria-label="Drawing tools"
                  >
                    {TOOLS.map((t) => (
                      <button
                        key={t.mode}
                        type="button"
                        className={`rd-tool ${toolMode === t.mode ? "is-active" : ""}`}
                        aria-pressed={toolMode === t.mode}
                        onClick={() => setToolMode(t.mode)}
                        title={t.hint}
                      >
                        <span className="rd-tool-icon">{t.icon}</span>
                        <span className="rd-tool-label">{t.label}</span>
                      </button>
                    ))}
                  </div>

                  {(needsStrokeWidth ||
                    needsFontSize ||
                    needsPixelSize ||
                    needsBlurRadius) && (
                    <div className="rd-tool-options">
                      {needsStrokeWidth && (
                        <NumberField
                          label={
                            toolMode === "brush"
                              ? "Brush size (px)"
                              : isLineTool
                                ? "Line width (px)"
                                : "Stroke width (px)"
                          }
                          value={toolMode === "brush" ? brushSize : strokeWidth}
                          min={2}
                          max={200}
                          onChange={(v) => {
                            if (toolMode === "brush") setBrushSize(v);
                            else setStrokeWidth(v);
                          }}
                        />
                      )}

                      {needsFontSize && (
                        <NumberField
                          label="Font size (px)"
                          value={fontSize}
                          min={10}
                          max={120}
                          onChange={setFontSize}
                        />
                      )}

                      {needsPixelSize && (
                        <NumberField
                          label="Pixel block size (px)"
                          value={pixelSize}
                          min={4}
                          max={48}
                          onChange={setPixelSize}
                        />
                      )}

                      {needsBlurRadius && (
                        <NumberField
                          label="Blur radius (px)"
                          value={blurRadius}
                          min={2}
                          max={40}
                          onChange={setBlurRadius}
                        />
                      )}
                    </div>
                  )}

                  {needsFontSize && (
                    <label className="rd-field">
                      <span>Label text</span>
                      <input
                        type="text"
                        className="tool-input"
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        maxLength={120}
                        placeholder="REDACTED"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* APPEARANCE TAB */}
              {activeTab === "style" && (
                <div className="rd-tab-content">
                  <div
                    className="rd-presets"
                    role="group"
                    aria-label="Mask presets"
                  >
                    <span>Quick colors</span>
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className={`rd-preset ${maskColor.toLowerCase() === p.color.toLowerCase() ? "is-active" : ""}`}
                        onClick={() => setMaskColor(p.color)}
                        title={p.hint}
                      >
                        <span
                          className="rd-preset-swatch"
                          style={{ background: p.color }}
                        />
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <label className="rd-color-field">
                    <span>Mask color</span>
                    <span className="rd-color-control">
                      <input
                        type="color"
                        value={maskColor}
                        onChange={(e) => setMaskColor(e.target.value)}
                        aria-label="Mask color"
                      />
                      <span>{maskColor.toUpperCase()}</span>
                    </span>
                  </label>

                  <label className="rd-field">
                    <span>Opacity · {Math.round(opacity * 100)}%</span>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                    />
                  </label>

                  {opacity < 1 && (
                    <p className="rd-warning">
                      Below 100% opacity the content underneath stays partly
                      visible. Use 100% for real redaction.
                    </p>
                  )}

                  {(needsShapeStyle || needsShadow) && (
                    <div className="rd-toggle-list">
                      {needsShapeStyle && (
                        <>
                          <label className="rd-switch">
                            <span>
                              <strong>Filled</strong>
                              <small>Cover the whole shape with color</small>
                            </span>
                            <input
                              type="checkbox"
                              checked={filled}
                              onChange={(e) => setFilled(e.target.checked)}
                            />
                            <span
                              className="rd-switch-track"
                              aria-hidden="true"
                            >
                              <span className="rd-switch-thumb" />
                            </span>
                          </label>

                          <label className="rd-switch">
                            <span>
                              <strong>Outline</strong>
                              <small>Draw an edge using the stroke width</small>
                            </span>
                            <input
                              type="checkbox"
                              checked={stroked}
                              onChange={(e) => setStroked(e.target.checked)}
                            />
                            <span
                              className="rd-switch-track"
                              aria-hidden="true"
                            >
                              <span className="rd-switch-thumb" />
                            </span>
                          </label>
                        </>
                      )}

                      {needsShadow && (
                        <label className="rd-switch">
                          <span>
                            <strong>Soft shadow</strong>
                            <small>Add a light shadow around the mask</small>
                          </span>
                          <input
                            type="checkbox"
                            checked={shadow}
                            onChange={(e) => setShadow(e.target.checked)}
                          />
                          <span className="rd-switch-track" aria-hidden="true">
                            <span className="rd-switch-thumb" />
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                className="rd-advanced-button"
                onClick={() => setShowHelp((v) => !v)}
                aria-expanded={showHelp}
              >
                {showHelp ? "Hide" : "Show"} how to use
                <span>{showHelp ? "−" : "+"}</span>
              </button>

              {showHelp && (
                <div className="rd-help">
                  {helpSteps.map(([title, body], index) => (
                    <div className="rd-help-step" key={title}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{title}</strong>
                        <p>{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* STEP 3: EXPORT */}
            <section className="rd-card">
              <div className="rd-card-heading">
                <div>
                  <span className="rd-step">03</span>
                  <h3>Export your image</h3>
                </div>
              </div>

              <div className="rd-export-grid">
                <label className="rd-field">
                  <span>Filename</span>
                  <input
                    type="text"
                    className="tool-input"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    maxLength={120}
                  />
                </label>

                <label className="rd-field">
                  <span>Format</span>
                  <select
                    className="tool-input"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  >
                    <option value="png">PNG (lossless)</option>
                    <option value="jpeg">JPG (lossy)</option>
                    <option value="webp">WebP</option>
                  </select>
                </label>

                {format !== "png" && (
                  <label className="rd-field rd-field-wide">
                    <span>Quality · {Math.round(quality * 100)}%</span>
                    <input
                      type="range"
                      min={0.4}
                      max={1}
                      step={0.01}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>

              <button
                type="button"
                className="rd-download-button"
                onClick={exportImage}
                disabled={!ready}
              >
                ↓ Download redacted image
              </button>

              <div className="rd-export-note">
                <strong>Privacy</strong>
                <span>
                  Everything happens on this device. Your images are never sent
                  to a server.
                </span>
              </div>
            </section>
          </div>

          {/* RIGHT: CANVAS */}
          <div className="rd-preview-column">
            <section className="rd-card rd-stage-card">
              <div className="rd-preview-heading">
                <div>
                  <span className="rd-eyebrow">LIVE CANVAS</span>
                  <h3>Your image</h3>
                  <p>
                    {ready && imageSize
                      ? `${imageName} · ${imageSize.w} × ${imageSize.h} px`
                      : "No image loaded yet"}
                  </p>
                </div>

                <span className="rd-live-badge">
                  <span />
                  {ready ? "Live" : "Idle"}
                </span>
              </div>

              <div className="rd-stage-bar">
                <div className="rd-zoom-controls">
                  <button
                    type="button"
                    className="rd-mini-btn"
                    onClick={() =>
                      setZoom((z) => clamp(z / 1.25, MIN_ZOOM, MAX_ZOOM))
                    }
                    aria-label="Zoom out"
                    disabled={!ready}
                  >
                    −
                  </button>
                  <span className="rd-zoom-value">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    className="rd-mini-btn"
                    onClick={() =>
                      setZoom((z) => clamp(z * 1.25, MIN_ZOOM, MAX_ZOOM))
                    }
                    aria-label="Zoom in"
                    disabled={!ready}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="rd-mini-btn"
                    onClick={fitToScreen}
                    disabled={!ready}
                  >
                    Fit
                  </button>
                </div>

                <div className="rd-stage-actions">
                  <button
                    type="button"
                    className="rd-mini-btn"
                    onClick={undo}
                    disabled={historyCount === 0}
                    title="Undo (Ctrl+Z)"
                  >
                    ↶ Undo
                  </button>
                  <button
                    type="button"
                    className="rd-mini-btn"
                    onClick={redo}
                    disabled={futureCount === 0}
                    title="Redo (Ctrl+Shift+Z)"
                  >
                    ↷ Redo
                  </button>
                  <button
                    type="button"
                    className="rd-mini-btn"
                    onClick={deleteSelected}
                    disabled={!selectedId}
                    title="Delete selected (Del)"
                  >
                    Delete mask
                  </button>
                  <button
                    type="button"
                    className="rd-mini-btn rd-mini-btn-danger"
                    onClick={clearMasks}
                    disabled={masks.length === 0}
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div
                ref={containerRef}
                className="rd-canvas-wrap"
                style={{ cursor: toolMode === "select" ? "default" : "crosshair" }}
              >
                {!ready && (
                  <div className="rd-empty">
                    <span className="rd-empty-icon">🖼</span>
                    Choose an image to start masking sensitive areas.
                  </div>
                )}
                <canvas
                  ref={previewRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onWheel={handleWheel}
                  onContextMenu={(e) => e.preventDefault()}
                  className="rd-canvas"
                  style={{
                    display: ready ? "block" : "none",
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                />
              </div>

              <div className="rd-preview-footer">
                <div>
                  <span>Image</span>
                  <strong>
                    {imageSize ? `${imageSize.w}×${imageSize.h}` : "—"}
                  </strong>
                </div>
                <div>
                  <span>Zoom</span>
                  <strong>{Math.round(zoom * 100)}%</strong>
                </div>
                <div>
                  <span>Masks</span>
                  <strong>{masks.length}</strong>
                </div>
                <div>
                  <span>Selected</span>
                  <strong>{selectedMask ? selectedMask.mode : "—"}</strong>
                </div>
              </div>

              <div
                className={`rd-status rd-status-${tone}`}
                role="status"
                aria-live="polite"
              >
                <span className="rd-status-icon">{statusIcon}</span>
                <span>{status}</span>
              </div>
            </section>
          </div>
        </div>

        {/* FOOTNOTE */}
        <div className="rd-footer-note">
          <strong>Tip:</strong> Drag to draw · <kbd>Ctrl</kbd>+wheel to zoom ·{" "}
          <kbd>Alt</kbd>+drag to pan · <kbd>Del</kbd> removes the selected mask
          · <kbd>Esc</kbd> deselects. Shortcuts: <kbd>V</kbd> select,{" "}
          <kbd>B</kbd> brush, <kbd>R</kbd> rectangle, <kbd>E</kbd> ellipse,{" "}
          <kbd>L</kbd> line, <kbd>T</kbd> text, <kbd>P</kbd> pixelate.
        </div>

        {/* TEXT DIALOG */}
        {showTextDialog && (
          <div
            className="rd-dialog-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rd-dialog-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowTextDialog(false);
                setPendingTextPoint(null);
              }
            }}
          >
            <div className="rd-dialog">
              <h4 id="rd-dialog-title" className="rd-dialog-title">
                Add text label
              </h4>
              <p className="rd-dialog-body">
                This will be placed where you clicked. Leave blank to cancel.
              </p>
              <label className="rd-field" style={{ marginTop: 10 }}>
                <span>Label text</span>
                <input
                  type="text"
                  className="tool-input"
                  autoFocus
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  maxLength={120}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      placeText();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setShowTextDialog(false);
                      setPendingTextPoint(null);
                    }
                  }}
                />
              </label>
              <div className="rd-dialog-actions">
                <button
                  type="button"
                  className="rd-btn rd-btn-ghost"
                  onClick={() => {
                    setShowTextDialog(false);
                    setPendingTextPoint(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rd-btn rd-btn-pri"
                  onClick={placeText}
                >
                  Place label
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          STYLES
      ===================================================== */}

      <style jsx>{`
        .rd-wrapper {
          --rd-primary: #ff5a1f;
          --rd-primary-dark: #e64a14;
          --rd-primary-soft: #fff3ed;
          --rd-primary-hover: #ffb69d;

          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          min-width: 0;
          color: var(--tool-text, #172033);
        }

        .rd-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 21px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 13px;
          background: var(--tool-surface, #f8fafc);
        }

        .rd-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .rd-header h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 800;
          line-height: 1.3;
        }

        .rd-header p {
          max-width: 560px;
          margin: 6px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 13px;
          line-height: 1.6;
        }

        .rd-header-stat {
          display: flex;
          flex: 0 0 auto;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 64px;
          padding: 10px 14px;
          border-radius: 13px;
          background: var(--tool-card, #fff);
        }

        .rd-header-stat span {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          font-weight: 700;
        }

        .rd-header-stat strong {
          color: var(--rd-primary);
          font-size: 22px;
          font-weight: 800;
          line-height: 1.2;
          font-variant-numeric: tabular-nums;
        }

        /* Main layout */

        .rd-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
          align-items: start;
          gap: 20px;
          width: 100%;
          min-width: 0;
        }

        .rd-settings-column,
        .rd-preview-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }

        .rd-card {
          min-width: 0;
          padding: 19px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 13px;
          background: var(--tool-card, #fff);
        }

        .rd-card-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 17px;
        }

        .rd-card-heading > div {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .rd-card-heading h3,
        .rd-preview-heading h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }

        .rd-step {
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

        .rd-badge {
          padding: 4px 10px;
          border-radius: 999px;
          background: var(--rd-primary-soft);
          color: var(--rd-primary);
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .rd-feedback {
          margin: 8px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 11px;
          font-weight: 600;
        }

        /* Tabs */

        .rd-tabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5px;
          margin-bottom: 20px;
          padding: 4px;
          border-radius: 9px;
          background: var(--tool-surface, #f1f5f9);
        }

        .rd-tab {
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

        .rd-tab-active {
          background: var(--tool-card, #fff);
          color: var(--tool-text, #111827);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .rd-tab-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }

        .rd-tool-hint {
          margin: 0;
          color: var(--tool-muted, #64748b);
          font-size: 11px;
        }

        /* Tool grid */

        .rd-tools {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
          gap: 6px;
        }

        .rd-tool {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 9px 6px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 9px;
          background: var(--tool-card, #fff);
          color: var(--tool-text, inherit);
          cursor: pointer;
          transition:
            border-color 150ms ease,
            background 150ms ease;
        }

        .rd-tool:hover {
          border-color: var(--rd-primary-hover);
          background: var(--tool-surface, #f8fafc);
        }

        .rd-tool.is-active {
          border-color: var(--rd-primary);
          background: var(--rd-primary-soft);
          box-shadow: inset 0 0 0 1px var(--rd-primary);
        }

        .rd-tool-icon {
          font-size: 15px;
          line-height: 1;
        }

        .rd-tool-label {
          font-size: 10px;
          font-weight: 750;
        }

        .rd-tool.is-active .rd-tool-label {
          color: var(--rd-primary);
        }

        .rd-tool-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 12px;
          border-top: 1px solid var(--tool-border, #e5e7eb);
        }

        /* Fields */

        .rd-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .rd-field > span {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          font-weight: 700;
        }

        .rd-field :global(.tool-input),
        .rd-field input[type="text"],
        .rd-field select {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }

        .rd-field input[type="range"] {
          width: 100%;
          accent-color: var(--rd-primary);
          cursor: pointer;
        }

        /* Presets */

        .rd-presets {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
        }

        .rd-presets > span {
          width: 100%;
          color: var(--tool-muted, #64748b);
          font-size: 10px;
        }

        .rd-preset {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 7px;
          background: var(--tool-card, #fff);
          color: var(--tool-text, inherit);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .rd-preset.is-active {
          border-color: var(--rd-primary);
          background: var(--rd-primary-soft);
          color: var(--rd-primary);
        }

        .rd-preset-swatch {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          border: 1px solid rgba(0, 0, 0, 0.15);
        }

        .rd-color-field {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          font-weight: 650;
        }

        .rd-color-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rd-color-control input[type="color"] {
          width: 42px;
          height: 28px;
          padding: 2px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 6px;
          background: white;
          cursor: pointer;
        }

        .rd-color-control > span {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .rd-warning {
          margin: 0;
          padding: 9px 11px;
          border-radius: 8px;
          background: #fffbeb;
          color: #b45309;
          font-size: 10px;
          line-height: 1.6;
        }

        /* Switches */

        .rd-toggle-list {
          display: flex;
          flex-direction: column;
          margin-top: 2px;
          border-top: 1px solid var(--tool-border, #e5e7eb);
        }

        .rd-switch {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--tool-border, #e5e7eb);
          cursor: pointer;
          user-select: none;
        }

        .rd-toggle-list .rd-switch:last-child {
          border-bottom: 0;
        }

        .rd-switch > span:first-of-type {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .rd-switch strong {
          font-size: 12px;
          font-weight: 700;
        }

        .rd-switch small {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          line-height: 1.4;
        }

        .rd-switch input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          pointer-events: none;
        }

        .rd-switch-track {
          position: relative;
          flex-shrink: 0;
          width: 44px;
          height: 26px;
          border-radius: 999px;
          background: #cbd5e1;
          border: 1px solid #cbd5e1;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .rd-switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
          transition: transform 0.2s ease;
        }

        .rd-switch input:checked + .rd-switch-track {
          background: var(--rd-primary);
          border-color: var(--rd-primary);
          box-shadow: 0 2px 6px rgba(255, 90, 31, 0.25);
        }

        .rd-switch input:checked + .rd-switch-track .rd-switch-thumb {
          transform: translateX(18px);
        }

        .rd-switch input:focus-visible + .rd-switch-track {
          outline: 3px solid rgba(255, 90, 31, 0.3);
          outline-offset: 2px;
        }

        /* Help */

        .rd-advanced-button {
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

        .rd-advanced-button span {
          font-size: 17px;
        }

        .rd-help {
          margin-top: 14px;
          padding: 4px 13px;
          border-radius: 9px;
          background: var(--tool-surface, #f8fafc);
        }

        .rd-help-step {
          display: flex;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid var(--tool-border, #e5e7eb);
        }

        .rd-help-step:last-child {
          border-bottom: 0;
        }

        .rd-help-step > span {
          display: grid;
          place-items: center;
          width: 24px;
          height: 24px;
          flex: 0 0 24px;
          border-radius: 7px;
          background: var(--rd-primary-soft);
          color: var(--rd-primary);
          font-size: 9px;
          font-weight: 800;
        }

        .rd-help-step strong {
          display: block;
          margin-bottom: 2px;
          font-size: 11px;
        }

        .rd-help-step p {
          margin: 0;
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          line-height: 1.5;
        }

        /* Export */

        .rd-export-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 15px;
        }

        .rd-field-wide {
          grid-column: 1 / -1;
        }

        .rd-download-button {
          width: 100%;
          min-height: 42px;
          border: 1px solid #e74e1b;
          border-radius: 8px;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
          transition:
            transform 150ms ease,
            box-shadow 150ms ease;
        }

        .rd-download-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(255, 90, 31, 0.28);
        }

        .rd-download-button:focus-visible {
          outline: 3px solid var(--rd-primary-hover);
          outline-offset: 2px;
        }

        .rd-download-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .rd-export-note {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 15px;
          padding: 12px;
          border-radius: 8px;
          background: var(--tool-surface, #f8fafc);
        }

        .rd-export-note strong {
          font-size: 11px;
        }

        .rd-export-note span {
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          line-height: 1.6;
        }

        /* Canvas card */

        .rd-stage-card {
          padding: 16px;
        }

        .rd-preview-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 16px;
        }

        .rd-preview-heading h3 {
          font-size: 16px;
        }

        .rd-preview-heading p {
          margin: 5px 0 0;
          color: var(--tool-muted, #64748b);
          font-size: 10px;
          overflow-wrap: anywhere;
        }

        .rd-live-badge {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 20px;
          font-size: 10px;
          font-weight: 750;
        }

        .rd-live-badge span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #16a34a;
        }

        .rd-stage-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .rd-zoom-controls,
        .rd-stage-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .rd-zoom-value {
          min-width: 48px;
          text-align: center;
          font-size: 11px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .rd-mini-btn {
          padding: 6px 10px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 7px;
          background: var(--tool-card, #fff);
          color: var(--tool-text, inherit);
          font-size: 10px;
          font-weight: 750;
          white-space: nowrap;
          cursor: pointer;
          transition:
            border-color 150ms ease,
            color 150ms ease;
        }

        .rd-mini-btn:hover:not(:disabled) {
          border-color: var(--rd-primary-hover);
          color: var(--rd-primary);
        }

        .rd-mini-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .rd-mini-btn-danger {
          color: #b91c1c;
          border-color: #fecaca;
        }

        .rd-mini-btn-danger:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #991b1b;
        }

        .rd-canvas-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          padding: 13px;
          overflow: hidden;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 10px;
          background:
            repeating-conic-gradient(#e9edf3 0 25%, transparent 0 50%) 0 0 /
              16px 16px,
            var(--tool-surface, #f1f5f9);
        }

        .rd-canvas {
          max-width: 100%;
          height: auto;
          transition: transform 120ms ease-out;
          touch-action: none;
          user-select: none;
          box-shadow: 0 2px 9px rgba(15, 23, 42, 0.12);
        }

        .rd-empty {
          padding: 28px 20px;
          text-align: center;
          color: var(--tool-muted, #64748b);
          font-size: 12px;
          font-weight: 600;
        }

        .rd-empty-icon {
          display: block;
          margin-bottom: 8px;
          font-size: 30px;
        }

        .rd-preview-footer {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
        }

        .rd-preview-footer > div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
          padding: 10px;
          border-radius: 8px;
          background: var(--tool-surface, #f8fafc);
        }

        .rd-preview-footer span {
          color: var(--tool-muted, #64748b);
          font-size: 9px;
        }

        .rd-preview-footer strong {
          font-size: 12px;
          font-weight: 800;
          overflow-wrap: anywhere;
          font-variant-numeric: tabular-nums;
        }

        /* Status */

        .rd-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 9px;
          background: var(--tool-surface, #f8fafc);
          color: var(--tool-muted, #64748b);
          font-size: 11px;
          font-weight: 600;
        }

        .rd-status-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #475569;
          font-size: 10px;
          font-weight: 900;
        }

        .rd-status-active {
          background: var(--rd-primary-soft);
          color: var(--rd-primary-dark);
        }

        .rd-status-active .rd-status-icon {
          background: #ffe2d5;
          color: var(--rd-primary);
        }

        .rd-status-success {
          background: #ecfdf5;
          color: #166534;
        }

        .rd-status-success .rd-status-icon {
          background: #dcfce7;
          color: #15803d;
        }

        .rd-status-warn {
          background: #fffbeb;
          color: #b45309;
        }

        .rd-status-warn .rd-status-icon {
          background: #fef3c7;
          color: #b45309;
        }

        /* Footnote */

        .rd-footer-note {
          padding: 14px 16px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 9px;
          background: var(--tool-surface, #f8fafc);
          color: var(--tool-muted, #64748b);
          font-size: 11px;
          line-height: 1.9;
        }

        .rd-footer-note strong {
          color: var(--tool-text, inherit);
        }

        .rd-footer-note kbd {
          display: inline-block;
          padding: 1px 5px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 4px;
          background: var(--tool-card, #fff);
          color: var(--tool-text, inherit);
          font-size: 9px;
          font-weight: 800;
        }

        /* Dialog */

        .rd-dialog-backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(23, 32, 51, 0.5);
          backdrop-filter: blur(3px);
          animation: rdFade 160ms ease-out;
        }

        .rd-dialog {
          width: 100%;
          max-width: 380px;
          padding: 18px 18px 14px;
          border: 1px solid var(--tool-border, #e5e7eb);
          border-radius: 14px;
          background: var(--tool-card, #fff);
          box-shadow: 0 20px 50px rgba(23, 32, 51, 0.25);
          animation: rdPop 200ms ease-out;
        }

        .rd-dialog-title {
          margin: 0 0 6px;
          font-size: 15px;
          font-weight: 800;
        }

        .rd-dialog-body {
          margin: 0;
          color: var(--tool-muted, #64748b);
          font-size: 12px;
          line-height: 1.55;
        }

        .rd-dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--tool-border, #e5e7eb);
        }

        .rd-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 16px;
          border: 1px solid transparent;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .rd-btn:focus-visible {
          outline: 3px solid var(--rd-primary-hover);
          outline-offset: 2px;
        }

        .rd-btn-pri {
          border-color: #e74e1b;
          background: linear-gradient(135deg, #ff682f, #e94b18);
          color: #fff;
          box-shadow: 0 3px 10px rgba(255, 90, 31, 0.2);
        }

        .rd-btn-ghost {
          background: transparent;
          color: var(--tool-muted, #64748b);
        }

        .rd-btn-ghost:hover {
          color: var(--rd-primary);
          background: var(--rd-primary-soft);
        }

        @keyframes rdFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes rdPop {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Tablet */

        @media (max-width: 900px) {
          .rd-main-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          /* Show the canvas first on narrow screens */
          .rd-preview-column {
            order: -1;
          }
        }

        /* Mobile */

        @media (max-width: 540px) {
          .rd-header {
            padding: 15px;
          }

          .rd-header h2 {
            font-size: 18px;
          }

          .rd-card {
            padding: 14px;
          }

          .rd-stage-card {
            padding: 12px;
          }

          .rd-tabs {
            gap: 2px;
          }

          .rd-canvas-wrap {
            min-height: 220px;
            padding: 8px;
          }

          .rd-export-grid {
            grid-template-columns: 1fr;
          }

          .rd-preview-footer {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 5px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rd-canvas,
          .rd-download-button,
          .rd-switch-track,
          .rd-switch-thumb,
          .rd-dialog-backdrop,
          .rd-dialog {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </ToolShell>
  );
}