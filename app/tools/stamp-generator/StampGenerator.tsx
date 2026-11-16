"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type ShapeType =
  | "scallop"
  | "circle"
  | "oval"
  | "hexagon"
  | "octagon"
  | "square"
  | "rounded-square"
  | "rectangle"
  | "star"
  | "triangle"
  | "diamond"
  | "shield";

type DragTarget = "main" | "sub" | "img";
type Box = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };

const CANVAS_SIZE = 400;
const HALF = CANVAS_SIZE / 2;
const PREVIEW_DPR = 3;

const MAX_TEXT_WIDTH: Record<ShapeType, number> = {
  scallop: 180,
  circle: 180,
  oval: 240,
  hexagon: 150,
  octagon: 150,
  square: 200,
  "rounded-square": 200,
  rectangle: 240,
  star: 85,
  triangle: 120,
  diamond: 140,
  shield: 160,
};

const DEFAULT_MAIN_POS: Point = { x: 0, y: -12 };
const DEFAULT_SUB_POS: Point = { x: 0, y: 20 };
const DEFAULT_IMG_POS: Point = { x: 0, y: 0 };

const COLOR_SWATCHES = [
  "#FF5A1F",
  "#DC2626",
  "#16A34A",
  "#2563EB",
  "#7C3AED",
  "#111827",
];

const PRESETS: {
  label: string;
  main: string;
  sub: string;
  color: string;
  shape: ShapeType;
}[] = [
  {
    label: "Approved",
    main: "APPROVED",
    sub: "OFFICIAL USE",
    color: "#16A34A",
    shape: "scallop",
  },
  {
    label: "Paid",
    main: "PAID",
    sub: "THANK YOU",
    color: "#2563EB",
    shape: "circle",
  },
  {
    label: "Confidential",
    main: "CONFIDENTIAL",
    sub: "DO NOT SHARE",
    color: "#DC2626",
    shape: "rectangle",
  },
  {
    label: "Draft",
    main: "DRAFT",
    sub: "NOT FINAL",
    color: "#111827",
    shape: "rounded-square",
  },
  {
    label: "Rejected",
    main: "REJECTED",
    sub: "SEE NOTES",
    color: "#DC2626",
    shape: "octagon",
  },
  {
    label: "Verified",
    main: "VERIFIED",
    sub: "CHECKED",
    color: "#7C3AED",
    shape: "shield",
  },
];

const clamp = (v: number) => Math.max(-HALF, Math.min(HALF, v));

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawShapePath(
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  scale: number,
) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(0, 0, 150 * scale, 0, Math.PI * 2);
  } else if (shape === "oval") {
    ctx.ellipse(0, 0, 170 * scale, 120 * scale, 0, 0, Math.PI * 2);
  } else if (shape === "hexagon") {
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const x = 150 * scale * Math.cos(angle);
      const y = 150 * scale * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (shape === "scallop") {
    const numScallops = 20;
    for (let i = 0; i < numScallops * 2; i++) {
      const angle = (i * Math.PI) / numScallops;
      const r = (i % 2 === 0 ? 150 : 135) * scale;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (shape === "square") {
    ctx.rect(-140 * scale, -140 * scale, 280 * scale, 280 * scale);
  } else if (shape === "rounded-square") {
    roundRectPath(
      ctx,
      -140 * scale,
      -140 * scale,
      280 * scale,
      280 * scale,
      30 * scale,
    );
  } else if (shape === "rectangle") {
    ctx.rect(-170 * scale, -110 * scale, 340 * scale, 220 * scale);
  } else if (shape === "diamond") {
    ctx.moveTo(0, -160 * scale);
    ctx.lineTo(140 * scale, 0);
    ctx.lineTo(0, 160 * scale);
    ctx.lineTo(-140 * scale, 0);
    ctx.closePath();
  } else if (shape === "octagon") {
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const x = 150 * scale * Math.cos(angle);
      const y = 150 * scale * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (shape === "triangle") {
    const r = 160 * scale;
    ctx.moveTo(0, -r);
    ctx.lineTo(r * Math.cos(Math.PI / 6), r * Math.sin(Math.PI / 6));
    ctx.lineTo(-r * Math.cos(Math.PI / 6), r * Math.sin(Math.PI / 6));
    ctx.closePath();
  } else if (shape === "star") {
    const outerRadius = 155 * scale;
    const innerRadius = 60 * scale;
    const points = 5;
    const angleStep = Math.PI / points;
    let rot = -Math.PI / 2;
    ctx.moveTo(0, -outerRadius);
    for (let i = 0; i < points; i++) {
      ctx.lineTo(outerRadius * Math.cos(rot), outerRadius * Math.sin(rot));
      rot += angleStep;
      ctx.lineTo(innerRadius * Math.cos(rot), innerRadius * Math.sin(rot));
      rot += angleStep;
    }
    ctx.closePath();
  } else if (shape === "shield") {
    ctx.moveTo(0, -160 * scale);
    ctx.lineTo(130 * scale, -160 * scale);
    ctx.lineTo(130 * scale, -50 * scale);
    ctx.quadraticCurveTo(130 * scale, 100 * scale, 0, 160 * scale);
    ctx.quadraticCurveTo(-130 * scale, 100 * scale, -130 * scale, -50 * scale);
    ctx.lineTo(-130 * scale, -160 * scale);
    ctx.closePath();
  }
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  underline: boolean,
  fontSize: number,
): number {
  let totalWidth = 0;
  if (spacing === 0) {
    totalWidth = ctx.measureText(text).width;
    ctx.fillText(text, x, y);
  } else {
    const chars = Array.from(text);
    chars.forEach((ch) => (totalWidth += ctx.measureText(ch).width + spacing));
    totalWidth -= spacing;
    let startX = x - totalWidth / 2;
    chars.forEach((ch) => {
      const w = ctx.measureText(ch).width;
      ctx.fillText(ch, startX + w / 2, y);
      startX += w + spacing;
    });
  }

  if (underline) {
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.lineWidth = Math.max(1.5, fontSize / 14);
    ctx.setLineDash([]);
    const uy = y + fontSize * 0.55;
    ctx.beginPath();
    ctx.moveTo(x - totalWidth / 2, uy);
    ctx.lineTo(x + totalWidth / 2, uy);
    ctx.stroke();
    ctx.restore();
  }
  return totalWidth;
}

// UPDATED: Added isBottom parameter to flip the curve for the subtext
function drawCurvedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  radius: number,
  letterSpacing: number,
  underline: boolean,
  fontSize: number,
  isBottom: boolean,
): number {
  const chars = Array.from(text);
  let totalAngle = 0;

  const charAngles = chars.map((ch) => {
    const w = ctx.measureText(ch).width + letterSpacing;
    const a = w / radius;
    totalAngle += a;
    return a;
  });

  // Top text: Starts at -90deg, goes clockwise
  // Bottom text: Starts at +90deg, goes counter-clockwise
  let currentAngle = isBottom
    ? Math.PI / 2 + totalAngle / 2
    : -Math.PI / 2 - totalAngle / 2;

  chars.forEach((ch, i) => {
    const angle = isBottom
      ? currentAngle - charAngles[i] / 2
      : currentAngle + charAngles[i] / 2;

    ctx.save();
    ctx.rotate(angle);
    ctx.translate(0, isBottom ? radius : -radius);

    // Flip the text upright if it's on the bottom
    if (isBottom) ctx.rotate(Math.PI);

    ctx.fillText(ch, 0, 0);

    if (underline) {
      const w = ctx.measureText(ch).width;
      ctx.beginPath();
      ctx.moveTo(-w / 2, fontSize * 0.55);
      ctx.lineTo(w / 2, fontSize * 0.55);
      ctx.stroke();
    }

    ctx.restore();
    currentAngle += isBottom ? -charAngles[i] : charAngles[i];
  });

  return totalAngle * radius;
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  unit = "",
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="form-group">
      <label
        htmlFor={id}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {label}
        <span
          style={{
            background: "#F3F4F6",
            borderRadius: "6px",
            padding: "2px 8px",
            fontSize: "0.8rem",
            fontWeight: 600,
            minWidth: "56px",
            textAlign: "center",
          }}
        >
          {value}
          {unit}
        </span>
      </label>
      <input
        id={id}
        type="range"
        className="stamp-range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

function Switch({
  id,
  label,
  checked,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="stamp-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="stamp-switch-track">
        <span className="stamp-switch-thumb" />
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function StampGenerator() {
  // Text & Font
  const [mainText, setMainText] = useState("APPROVED");
  const [subText, setSubText] = useState("OFFICIAL USE");
  const [fontFamily, setFontFamily] = useState("'Space Grotesk', sans-serif");

  // Text Styles
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [letterSpacing, setLetterSpacing] = useState(0);

  // NEW: Curve options
  const [isCurvedMain, setIsCurvedMain] = useState(false);
  const [isCurvedSub, setIsCurvedSub] = useState(false);

  // NEW: Independent Text Rotations
  const [mainTextRotation, setMainTextRotation] = useState(0);
  const [subTextRotation, setSubTextRotation] = useState(0);

  // Design Options
  const [shape, setShape] = useState<ShapeType>("scallop");
  const [color, setColor] = useState("#FF5A1F");
  const [borderWidth, setBorderWidth] = useState(8);
  const [opacity, setOpacity] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFilled, setIsFilled] = useState(false);
  const [hasInnerRing, setHasInnerRing] = useState(true);

  // Independent Scales
  const [mainTextScale, setMainTextScale] = useState(100);
  const [subTextScale, setSubTextScale] = useState(100);
  const [imageScale, setImageScale] = useState(100);

  // Image Upload State
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Positions
  const [mainPos, setMainPos] = useState<Point>(DEFAULT_MAIN_POS);
  const [subPos, setSubPos] = useState<Point>(DEFAULT_SUB_POS);
  const [imgPos, setImgPos] = useState<Point>(DEFAULT_IMG_POS);

  // Drag state
  const [dragging, setDragging] = useState<DragTarget | null>(null);
  const [hovering, setHovering] = useState(false);
  const dragRef = useRef<DragTarget | null>(null);
  const lastPoint = useRef<Point>({ x: 0, y: 0 });
  const boxesRef = useRef<Partial<Record<DragTarget, Box>>>({});

  // Export
  const [exportSize, setExportSize] = useState(1024);
  const [fontTick, setFontTick] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderStamp = useCallback(
    (canvas: HTMLCanvasElement, guide: DragTarget | null) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const k = canvas.width / CANVAS_SIZE;
      const boxes: Partial<Record<DragTarget, Box>> = {};

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, HALF * k, HALF * k);

      // Whole stamp rotation
      ctx.rotate((rotation * Math.PI) / 180);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = borderWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.globalAlpha = opacity / 100;

      drawShapePath(ctx, shape, 1.0);
      if (isFilled) ctx.fill();
      ctx.stroke();

      if (!isFilled && hasInnerRing) {
        drawShapePath(ctx, shape, 0.85);
        ctx.lineWidth = Math.max(2, borderWidth / 2);
        ctx.stroke();
      }

      if (imageObj) {
        const iw = imageObj.width || 120;
        const ih = imageObj.height || 120;
        const ratio = Math.min(120 / iw, 120 / ih);
        const w = iw * ratio * (imageScale / 100);
        const h = ih * ratio * (imageScale / 100);
        ctx.drawImage(imageObj, imgPos.x - w / 2, imgPos.y - h / 2, w, h);
        boxes.img = { x: imgPos.x - w / 2, y: imgPos.y - h / 2, w, h };
      }

      const maxTextWidth = MAX_TEXT_WIDTH[shape];
      const fontStyle = isItalic ? "italic" : "normal";
      const fontWeight = isBold ? "bold" : "normal";

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isFilled ? "#FFFFFF" : color;
      ctx.strokeStyle = ctx.fillStyle;

      const fitFont = (text: string, baseSize: number, scalePct: number) => {
        let size = baseSize;
        ctx.font = `${fontStyle} ${fontWeight} ${size}px ${fontFamily}`;
        const limit = maxTextWidth * (scalePct / 100);
        const measured = ctx.measureText(text).width;
        if (measured > limit)
          size = Math.max(6, Math.floor(size * (limit / measured)));
        ctx.font = `${fontStyle} ${fontWeight} ${size}px ${fontFamily}`;
        return size;
      };

      const main = mainText.toUpperCase();
      if (main.trim() !== "") {
        const size = fitFont(main, 40, mainTextScale);

        ctx.save();
        ctx.translate(mainPos.x, mainPos.y);
        // Apply independent text rotation
        ctx.rotate((mainTextRotation * Math.PI) / 180);

        if (isCurvedMain) {
          const radius = shape === "oval" ? 95 : 115;
          drawCurvedText(
            ctx,
            main,
            radius,
            letterSpacing,
            isUnderline,
            size,
            false,
          );
          boxes.main = {
            x: mainPos.x - radius,
            y: mainPos.y - radius,
            w: radius * 2,
            h: radius * 2,
          };
        } else {
          const w = drawSpacedText(
            ctx,
            main,
            0,
            0,
            letterSpacing,
            isUnderline,
            size,
          );
          boxes.main = {
            x: mainPos.x - w / 2,
            y: mainPos.y - size / 2,
            w,
            h: size,
          };
        }
        ctx.restore();
      }

      const sub = subText.toUpperCase();
      if (sub.trim() !== "") {
        const size = fitFont(sub, 18, subTextScale);

        ctx.save();
        ctx.translate(subPos.x, subPos.y);
        // Apply independent text rotation
        ctx.rotate((subTextRotation * Math.PI) / 180);

        if (isCurvedSub) {
          const radius = shape === "oval" ? 95 : 115;
          drawCurvedText(
            ctx,
            sub,
            radius,
            letterSpacing,
            isUnderline,
            size,
            true,
          );
          boxes.sub = {
            x: subPos.x - radius,
            y: subPos.y - radius,
            w: radius * 2,
            h: radius * 2,
          };
        } else {
          const w = drawSpacedText(
            ctx,
            sub,
            0,
            0,
            letterSpacing,
            isUnderline,
            size,
          );
          boxes.sub = {
            x: subPos.x - w / 2,
            y: subPos.y - size / 2,
            w,
            h: size,
          };
        }
        ctx.restore();
      }

      ctx.restore();

      if (guide && boxes[guide]) {
        const b = boxes[guide]!;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#2563EB";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
        ctx.restore();
      }

      boxesRef.current = boxes;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    [
      mainText,
      subText,
      shape,
      color,
      isFilled,
      borderWidth,
      opacity,
      fontFamily,
      hasInnerRing,
      mainTextScale,
      subTextScale,
      imageScale,
      imageObj,
      mainPos,
      subPos,
      imgPos,
      isBold,
      isItalic,
      isUnderline,
      letterSpacing,
      isCurvedMain,
      isCurvedSub,
      rotation,
      mainTextRotation,
      subTextRotation,
    ],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderStamp(canvas, dragging);
  }, [renderStamp, dragging, fontTick]);

  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    let cancelled = false;
    Promise.all([
      document.fonts.load(`bold 40px ${fontFamily}`),
      document.fonts.load(`italic 40px ${fontFamily}`),
      document.fonts.load(`40px ${fontFamily}`),
    ])
      .then(() => {
        if (!cancelled) setFontTick((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fontFamily]);

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = CANVAS_SIZE / rect.width;
    return {
      x: (e.clientX - rect.left) * scale - HALF,
      y: (e.clientY - rect.top) * scale - HALF,
    };
  };

  const hitTest = (p: Point, pad: number): DragTarget | null => {
    const order: DragTarget[] = ["sub", "main", "img"];
    for (const t of order) {
      const b = boxesRef.current[t];
      if (!b) continue;
      if (
        p.x >= b.x - pad &&
        p.x <= b.x + b.w + pad &&
        p.y >= b.y - pad &&
        p.y <= b.y + b.h + pad
      )
        return t;
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pad = e.pointerType === "mouse" ? 8 : 28;
    const p = toLocal(e);
    const target = hitTest(p, pad);
    if (!target) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = target;
    lastPoint.current = p;
    setDragging(target);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toLocal(e);
    if (!dragRef.current) {
      if (e.pointerType === "mouse") setHovering(hitTest(p, 8) !== null);
      return;
    }
    const dx = p.x - lastPoint.current.x;
    const dy = p.y - lastPoint.current.y;
    lastPoint.current = p;

    const move = (prev: Point): Point => ({
      x: clamp(prev.x + dx),
      y: clamp(prev.y + dy),
    });
    if (dragRef.current === "main") setMainPos(move);
    else if (dragRef.current === "sub") setSubPos(move);
    else setImgPos(move);
  };

  const endDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setDragging(null);
  };

  const resetPositions = () => {
    setMainPos(DEFAULT_MAIN_POS);
    setSubPos(DEFAULT_SUB_POS);
    setImgPos(DEFAULT_IMG_POS);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => setImageObj(img);
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageObj(null);
    setImgPos(DEFAULT_IMG_POS);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setMainText(p.main);
    setSubText(p.sub);
    setColor(p.color);
    setShape(p.shape);
    resetPositions();
  };

  const downloadImage = () => {
    const off = document.createElement("canvas");
    off.width = exportSize;
    off.height = exportSize;
    renderStamp(off, null);

    off.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `stamp-${(mainText || "stamp").replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");

    if (canvasRef.current) renderStamp(canvasRef.current, dragging);
  };

  const positionsChanged =
    mainPos.x !== DEFAULT_MAIN_POS.x ||
    mainPos.y !== DEFAULT_MAIN_POS.y ||
    subPos.x !== DEFAULT_SUB_POS.x ||
    subPos.y !== DEFAULT_SUB_POS.y ||
    imgPos.x !== DEFAULT_IMG_POS.x ||
    imgPos.y !== DEFAULT_IMG_POS.y;

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: active ? "var(--accent)" : "white",
    color: active ? "white" : "black",
    border: "1px solid #D1D5DB",
    borderRadius: "4px",
    padding: "10px",
    cursor: "pointer",
    boxShadow: "none",
    minHeight: "44px",
  });

  const sectionStyle: React.CSSProperties = {
    borderTop: "1px solid var(--border-color)",
    paddingTop: "1rem",
    marginTop: "0.5rem",
  };
  const sectionTitleStyle: React.CSSProperties = {
    display: "block",
    fontWeight: 600,
    marginBottom: "0.5rem",
    fontSize: "0.95rem",
  };
  const rowLabelStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
  };

  const checkerboard: React.CSSProperties = {
    width: "100%",
    maxWidth: CANVAS_SIZE,
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    backgroundColor: "#fff",
    backgroundImage:
      "linear-gradient(45deg, #E5E7EB 25%, transparent 25%), linear-gradient(-45deg, #E5E7EB 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E5E7EB 75%), linear-gradient(-45deg, transparent 75%, #E5E7EB 75%)",
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  };

  return (
    <div className="tool-interface">
      <style>{`
        @media (min-width: 900px) {
          .stamp-preview-sticky { position: sticky; top: 1rem; align-self: flex-start; }
        }
        .stamp-range {
          -webkit-appearance: none; appearance: none; width: 100%; height: 32px; margin: 0; background: transparent; cursor: pointer;
        }
        .stamp-range:focus { outline: none; }
        .stamp-range::-webkit-slider-runnable-track {
          height: 8px; border-radius: 999px;
          background: linear-gradient(to right, var(--accent) 0%, var(--accent) var(--pct, 50%), #E5E7EB var(--pct, 50%), #E5E7EB 100%);
        }
        .stamp-range::-moz-range-track { height: 8px; border-radius: 999px; background: #E5E7EB; }
        .stamp-range::-moz-range-progress { height: 8px; border-radius: 999px; background: var(--accent); }
        .stamp-range::-webkit-slider-thumb {
          -webkit-appearance: none; box-sizing: border-box; width: 26px; height: 26px; margin-top: -9px;
          border-radius: 50%; background: #fff; border: 3px solid var(--accent); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25); transition: transform 0.12s;
        }
        .stamp-range::-moz-range-thumb {
          box-sizing: border-box; width: 26px; height: 26px; border-radius: 50%; background: #fff; border: 3px solid var(--accent); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
        }
        .stamp-range:active::-webkit-slider-thumb { transform: scale(1.15); }
        .stamp-switch-group { display: flex; flex-wrap: wrap; gap: 4px 28px; margin-bottom: 0.75rem; }
        .stamp-switch {
          all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; font-size: 0.9rem; -webkit-tap-highlight-color: transparent;
        }
        .stamp-switch[disabled] { opacity: 0.45; cursor: not-allowed; }
        .stamp-switch-track { position: relative; flex-shrink: 0; width: 46px; height: 26px; border-radius: 999px; background: #D1D5DB; transition: background 0.2s; }
        .stamp-switch[aria-checked="true"] .stamp-switch-track { background: var(--accent); }
        .stamp-switch-thumb { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); transition: transform 0.2s; }
        .stamp-switch[aria-checked="true"] .stamp-switch-thumb { transform: translateX(20px); }
        .stamp-reset-btn {
          all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 20px;
          border-radius: 10px; border: 2px solid var(--accent); color: var(--accent); background: #fff; font-weight: 600; font-size: 0.9rem; cursor: pointer;
        }
        .stamp-reset-btn:hover:not([disabled]) { background: var(--accent); color: #fff; }
        .stamp-reset-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div className="tool-layout">
        <div className="tool-controls" style={{ gap: "1rem" }}>
          <div className="form-group">
            <label>Quick Start</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "999px",
                    border: `2px solid ${p.color}`,
                    background: "white",
                    color: p.color,
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    boxShadow: "none",
                    minHeight: "40px",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="shapeSelect">Select Shape</label>
            <select
              id="shapeSelect"
              value={shape}
              onChange={(e) => setShape(e.target.value as ShapeType)}
            >
              <option value="scallop">Scalloped Circle</option>
              <option value="circle">Simple Circle</option>
              <option value="oval">Oval</option>
              <option value="hexagon">Hexagon</option>
              <option value="octagon">Octagon</option>
              <option value="square">Square</option>
              <option value="rounded-square">Rounded Square</option>
              <option value="rectangle">Rectangle</option>
              <option value="star">Star</option>
              <option value="triangle">Triangle</option>
              <option value="diamond">Diamond</option>
              <option value="shield">Shield</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="mainText" style={rowLabelStyle}>
              Main Text <span>{mainText.length}/20</span>
            </label>
            <input
              id="mainText"
              type="text"
              value={mainText}
              onChange={(e) => setMainText(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label htmlFor="subText" style={rowLabelStyle}>
              Sub Text <span>{subText.length}/25</span>
            </label>
            <input
              id="subText"
              type="text"
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              maxLength={25}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div className="form-group">
              <label htmlFor="fontSelect">Font Style</label>
              <select
                id="fontSelect"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                <option value="'Space Grotesk', sans-serif">Modern</option>
                <option value="'Bebas Neue', sans-serif">Condensed</option>
                <option value="'Caveat', cursive">Handwritten</option>
                <option value="Impact, sans-serif">Heavy Block</option>
                <option value="'Courier New', monospace">Typewriter</option>
                <option value="Georgia, serif">Elegant Serif</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="colorInput">Ink Color</label>
              <div className="color-picker-wrapper">
                <input
                  id="colorInput"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  {color.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Use color ${c}`}
                onClick={() => setColor(c)}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: c,
                  border:
                    color.toLowerCase() === c.toLowerCase()
                      ? "3px solid #111827"
                      : "2px solid #D1D5DB",
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: "none",
                }}
              />
            ))}
          </div>

          <div style={sectionStyle}>
            <span style={sectionTitleStyle}>Text Styling</span>
            <div
              style={{
                display: "flex",
                gap: "10px",
                background: "#F3F4F6",
                padding: "10px",
                borderRadius: "8px",
              }}
            >
              <button
                type="button"
                aria-label="Bold"
                aria-pressed={isBold}
                onClick={() => setIsBold(!isBold)}
                style={{ ...toggleStyle(isBold), fontWeight: "bold" }}
              >
                B
              </button>
              <button
                type="button"
                aria-label="Italic"
                aria-pressed={isItalic}
                onClick={() => setIsItalic(!isItalic)}
                style={{ ...toggleStyle(isItalic), fontStyle: "italic" }}
              >
                I
              </button>
              <button
                type="button"
                aria-label="Underline"
                aria-pressed={isUnderline}
                onClick={() => setIsUnderline(!isUnderline)}
                style={{
                  ...toggleStyle(isUnderline),
                  textDecoration: "underline",
                }}
              >
                U
              </button>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <div className="stamp-switch-group">
                <Switch
                  id="curveMainToggle"
                  label="Curve Main Text"
                  checked={isCurvedMain}
                  onChange={setIsCurvedMain}
                />
                <Switch
                  id="curveSubToggle"
                  label="Curve Sub Text"
                  checked={isCurvedSub}
                  onChange={setIsCurvedSub}
                />
              </div>

              <Slider
                id="mainSize"
                label="Main Text Size"
                value={mainTextScale}
                min={30}
                max={150}
                unit="%"
                onChange={setMainTextScale}
              />
              <Slider
                id="subSize"
                label="Sub Text Size"
                value={subTextScale}
                min={30}
                max={150}
                unit="%"
                onChange={setSubTextScale}
              />
              <Slider
                id="spacing"
                label="Letter Spacing"
                value={letterSpacing}
                min={0}
                max={15}
                unit="px"
                onChange={setLetterSpacing}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginTop: "0.5rem",
                }}
              >
                <Slider
                  id="mainRot"
                  label="Main Text Rotate"
                  value={mainTextRotation}
                  min={-180}
                  max={180}
                  unit="°"
                  onChange={setMainTextRotation}
                />
                <Slider
                  id="subRot"
                  label="Sub Text Rotate"
                  value={subTextRotation}
                  min={-180}
                  max={180}
                  unit="°"
                  onChange={setSubTextRotation}
                />
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <span style={sectionTitleStyle}>Frame Settings</span>
            <div className="stamp-switch-group">
              <Switch
                id="fillToggle"
                label="Fill Background"
                checked={isFilled}
                onChange={setIsFilled}
              />
              <Switch
                id="ringToggle"
                label="Inner Ring"
                checked={hasInnerRing}
                onChange={setHasInnerRing}
                disabled={isFilled}
              />
            </div>
            <Slider
              id="border"
              label="Border Width"
              value={borderWidth}
              min={2}
              max={16}
              unit="px"
              onChange={setBorderWidth}
            />
            <Slider
              id="opacity"
              label="Opacity"
              value={opacity}
              min={10}
              max={100}
              unit="%"
              onChange={setOpacity}
            />
            <Slider
              id="rotation"
              label="Whole Stamp Tilt"
              value={rotation}
              min={-20}
              max={20}
              unit="°"
              onChange={setRotation}
            />
          </div>

          <div style={sectionStyle}>
            <span style={sectionTitleStyle}>Custom Graphic</span>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageUpload}
                ref={fileInputRef}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn"
                style={{
                  flex: 1,
                  background: "#F3F4F6",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "none",
                }}
              >
                {imageObj ? "Change Image" : "Select Image"}
              </button>
              {imageObj && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="btn"
                  style={{
                    background: "#FEE2E2",
                    color: "#DC2626",
                    border: "1px solid #FCA5A5",
                    boxShadow: "none",
                    padding: "0 16px",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            {imageObj && (
              <div style={{ marginTop: "10px" }}>
                <Slider
                  id="imgSize"
                  label="Image Size"
                  value={imageScale}
                  min={20}
                  max={200}
                  unit="%"
                  onChange={setImageScale}
                />
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <div className="form-group">
              <label htmlFor="exportSize">Download Size</label>
              <select
                id="exportSize"
                value={exportSize}
                onChange={(e) => setExportSize(Number(e.target.value))}
              >
                <option value={512}>512 × 512 px</option>
                <option value={1024}>1024 × 1024 px</option>
                <option value={2048}>2048 × 2048 px (print)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={downloadImage}
              className="btn"
              style={{
                width: "100%",
                marginTop: "1rem",
                background: "var(--accent)",
              }}
            >
              Download Transparent PNG
            </button>
          </div>
        </div>

        <div
          className="tool-preview stamp-preview-sticky"
          style={{ flexDirection: "column", alignItems: "center" }}
        >
          <div style={checkerboard}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE * PREVIEW_DPR}
              height={CANVAS_SIZE * PREVIEW_DPR}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                aspectRatio: "1 / 1",
                cursor: dragging ? "grabbing" : hovering ? "grab" : "default",
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              marginTop: "1rem",
            }}
          >
            <button
              type="button"
              className="stamp-reset-btn"
              onClick={resetPositions}
              disabled={!positionsChanged}
            >
              <span aria-hidden="true">↺</span> Reset Position
            </button>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                margin: 0,
                textAlign: "center",
              }}
            >
              Drag the text or image to reposition (mouse or touch).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
