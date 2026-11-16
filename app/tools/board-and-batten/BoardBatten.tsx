"use client";

import { useRef, useState } from "react";

type ObstacleType = "door" | "window" | "switch" | "outlet" | "custom";
type UnitType = "in" | "ft" | "cm";

type Opening = {
  id: string;
  type: ObstacleType;
  width: number;
  offset: number;
  height: number;
  bottomOffset: number;
  label?: string;
};

type ObstacleRange = {
  start: number;
  end: number;
  bottom: number;
  top: number;
};

type BattenPiece = {
  id: string;
  left: number;
  bottom: number;
  height: number;
};

const CM_PER_INCH = 2.54;
const STOCK_BOARD_LENGTH_IN = 96;
const MAX_PREVIEW_BATTENS = 500;
const MAX_LAYOUT_BATTENS = 1000;
const MAX_LAYOUT_CUT_PIECES = 5000;

function estimateStockBoards(cutLengths: number[]) {
  const longPieceBoards = cutLengths.reduce(
    (total, length) =>
      total + (length > STOCK_BOARD_LENGTH_IN
        ? Math.ceil(length / STOCK_BOARD_LENGTH_IN)
        : 0),
    0
  );
  const packableLengths = cutLengths
    .filter(length => length <= STOCK_BOARD_LENGTH_IN)
    .sort((a, b) => b - a);
  const remainingLengths: number[] = [];

  packableLengths.forEach(length => {
    const boardIndex = remainingLengths.findIndex(
      remaining => remaining + 1e-9 >= length
    );
    if (boardIndex === -1) {
      remainingLengths.push(STOCK_BOARD_LENGTH_IN - length);
    } else {
      remainingLengths[boardIndex] -= length;
    }
  });

  return longPieceBoards + remainingLengths.length;
}

export default function BoardBatten() {
  // Unit State
  const [unit, setUnit] = useState<UnitType>("in");

  // Measurements are stored in inches regardless of the selected display unit.
  const [wallWidth, setWallWidth] = useState<number>(144);
  const [wallHeight, setWallHeight] = useState<number>(96);
  const [battenWidth, setBattenWidth] = useState<number>(3.5);
  const [targetGap, setTargetGap] = useState<number>(16);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const nextOpeningId = useRef(0);

  // All calculations are performed in inches.
  const toInches = (val: number) => {
    if (unit === "ft") return val * 12;
    if (unit === "cm") return val / CM_PER_INCH;
    return val;
  };

  const fromInches = (val: number) => {
    if (unit === "ft") return val / 12;
    if (unit === "cm") return val * CM_PER_INCH;
    return val;
  };

  const inputValue = (val: number) => Number(fromInches(val).toFixed(6));

  const handleUnitChange = (newUnit: UnitType) => {
    setUnit(newUnit);
  };

  const addOpening = () => {
    setOpenings(current => [...current, {
      id: `opening-${nextOpeningId.current++}`,
      type: "window",
      width: 36,
      offset: 36,
      height: 48,
      bottomOffset: 36
    }]);
  };

  const updateOpening = (id: string, field: keyof Opening, value: string | number) => {
    setOpenings(current => current.map(o => {
      if (o.id !== id) return o;
      const storedValue =
        typeof value === "number" &&
        (field === "width" || field === "offset" || field === "height" || field === "bottomOffset")
          ? toInches(value)
          : value;
      const updated = { ...o, [field]: storedValue };
      
      if (field === "type") {
        const defaults =
          value === "door" ? { width: 32, height: 80, bottomOffset: 0 } :
          value === "window" ? { width: 36, height: 48, bottomOffset: 36 } :
          value === "switch" ? { width: 4, height: 4, bottomOffset: 46 } :
          value === "outlet" ? { width: 3, height: 3, bottomOffset: 10 } :
          null;
        if (defaults) Object.assign(updated, defaults);
      }
      return updated;
    }));
  };

  const removeOpening = (id: string) => setOpenings(current => current.filter(o => o.id !== id));

  const wallWidthIn = wallWidth;
  const wallHeightIn = wallHeight;
  const battenWidthIn = battenWidth;
  const targetGapIn = targetGap;

  const validWallWidth = Number.isFinite(wallWidthIn) && wallWidthIn > 0;
  const validWallHeight = Number.isFinite(wallHeightIn) && wallHeightIn > 0;
  const validBattenWidth = Number.isFinite(battenWidthIn) && battenWidthIn > 0;
  const validTargetGap = Number.isFinite(targetGapIn) && targetGapIn >= 0;
  const validOpenings = openings.every(op => {
    return Number.isFinite(op.width) && op.width > 0 &&
      Number.isFinite(op.offset) && op.offset >= 0 &&
      Number.isFinite(op.offset + op.width) &&
      Number.isFinite(op.height) && op.height > 0 &&
      Number.isFinite(op.bottomOffset) && op.bottomOffset >= 0 &&
      Number.isFinite(op.bottomOffset + op.height);
  });
  const canCalculate = validWallWidth && validWallHeight && validBattenWidth && validTargetGap && validOpenings;

  const openingRanges = openings
    .map(op => ({
      ...op,
      start: op.offset,
      end: op.offset + op.width,
      bottom: op.bottomOffset,
      top: op.bottomOffset + op.height
    }))
    .filter(range =>
      Number.isFinite(range.start) &&
      Number.isFinite(range.end) &&
      Number.isFinite(range.bottom) &&
      Number.isFinite(range.top) &&
      range.end > range.start &&
      range.top > range.bottom
    )
    .sort((a, b) => a.start - b.start);
  const clippedOpeningRanges = validWallWidth && validWallHeight
    ? openingRanges.map(range => ({
        ...range,
        start: Math.max(0, Math.min(wallWidthIn, range.start)),
        end: Math.max(0, Math.min(wallWidthIn, range.end)),
        bottom: Math.max(0, Math.min(wallHeightIn, range.bottom)),
        top: Math.max(0, Math.min(wallHeightIn, range.top))
      })).filter(range => range.end > range.start && range.top > range.bottom)
    : [];
  const hasOutOfBoundsOpening = validWallWidth && validWallHeight && openingRanges.some(
    range =>
      range.start < 0 ||
      range.end > wallWidthIn ||
      range.bottom < 0 ||
      range.top > wallHeightIn
  );
  const hasOverlappingOpenings = clippedOpeningRanges.some((range, index) =>
    clippedOpeningRanges.slice(0, index).some(previous =>
      range.start < previous.end &&
      range.end > previous.start &&
      range.bottom < previous.top &&
      range.top > previous.bottom
    )
  );
  const fullHeightRanges = clippedOpeningRanges
    .filter(range => range.bottom === 0 && range.top === wallHeightIn)
    .sort((a, b) => a.start - b.start);

  let currentX = 0;
  const segments: { start: number; end: number; width: number }[] = [];

  if (canCalculate) {
    fullHeightRanges.forEach(range => {
      const start = Math.min(wallWidthIn, Math.max(0, range.start));
      const end = Math.min(wallWidthIn, Math.max(0, range.end));
      if (start > currentX) {
        segments.push({ start: currentX, end: start, width: start - currentX });
      }
      currentX = Math.max(currentX, end);
    });

    if (currentX < wallWidthIn) {
      segments.push({ start: currentX, end: wallWidthIn, width: wallWidthIn - currentX });
    }
  }

  const segmentLayouts = segments.map(seg => {
    const fitRatio = (seg.width - targetGapIn) / (battenWidthIn + targetGapIn);
    const roundingTolerance = Number.EPSILON * Math.max(1, Math.abs(fitRatio)) * 8;
    const numBattens = Math.max(
      0,
      Math.floor(fitRatio + roundingTolerance)
    );
    const actualGapIn =
      (seg.width - numBattens * battenWidthIn) / (numBattens + 1);

    return {
      ...seg,
      numBattens,
      actualGapIn
    };
  });

  const totalBattens = segmentLayouts.reduce((total, segment) => total + segment.numBattens, 0);
  const canBuildBattenLayout =
    canCalculate &&
    Number.isSafeInteger(totalBattens) &&
    totalBattens <= MAX_LAYOUT_BATTENS;
  const cutLengths: number[] = [];
  let cutPieceOverflow = false;
  const segmentResults = canBuildBattenLayout
    ? segmentLayouts.map((segment, segmentIndex) => {
        const battens: BattenPiece[] = [];

        for (let index = 0; index < segment.numBattens && !cutPieceOverflow; index++) {
          const left = segment.start + segment.actualGapIn +
            index * (battenWidthIn + segment.actualGapIn);
          const right = left + battenWidthIn;
          const blockedVerticalRanges = clippedOpeningRanges
            .filter(range => range.start < right && range.end > left)
            .map(range => ({ bottom: range.bottom, top: range.top }))
            .sort((a, b) => a.bottom - b.bottom);
          let currentBottom = 0;
          let pieceIndex = 0;

          const addPiece = (bottom: number, top: number) => {
            if (top <= bottom) return;
            if (cutLengths.length >= MAX_LAYOUT_CUT_PIECES) {
              cutPieceOverflow = true;
              return;
            }
            const piece = {
              id: `${segmentIndex}-${index}-${pieceIndex++}`,
              left,
              bottom,
              height: top - bottom
            };
            battens.push(piece);
            cutLengths.push(piece.height);
          };

          for (const blocked of blockedVerticalRanges) {
            if (blocked.top <= currentBottom) continue;
            if (blocked.bottom > currentBottom) {
              addPiece(currentBottom, blocked.bottom);
            }
            currentBottom = Math.max(currentBottom, blocked.top);
            if (currentBottom >= wallHeightIn || cutPieceOverflow) break;
          }

          if (!cutPieceOverflow && currentBottom < wallHeightIn) {
            addPiece(currentBottom, wallHeightIn);
          }
        }

        return { ...segment, battens, numCutPieces: battens.length };
      })
    : [];

  const totalLinearInches = cutLengths.reduce((total, length) => total + length, 0);
  const totalLinearFeet = totalLinearInches / 12;
  const rawStockBoards = cutPieceOverflow ? 0 : estimateStockBoards(cutLengths);
  const stockBoardsNeeded = Math.ceil((rawStockBoards * 11) / 10);
  const canShowEstimate =
    canBuildBattenLayout &&
    !cutPieceOverflow &&
    Number.isSafeInteger(rawStockBoards) &&
    Number.isSafeInteger(stockBoardsNeeded) &&
    Number.isFinite(totalLinearFeet);
  const canRenderBattenPreview =
    canShowEstimate && totalBattens <= MAX_PREVIEW_BATTENS;
  const previewBattens = canRenderBattenPreview
    ? segmentResults.flatMap(segment => segment.battens)
    : [];

  const previewWallWidth = validWallWidth ? wallWidthIn : 1;
  const previewWallHeight = validWallHeight ? wallHeightIn : 1;
  const previewOpenings = clippedOpeningRanges.map(range => ({
    ...range,
    left: (range.start / previewWallWidth) * 100,
    width: ((range.end - range.start) / previewWallWidth) * 100,
    top: ((previewWallHeight - range.top) / previewWallHeight) * 100,
    height: ((range.top - range.bottom) / previewWallHeight) * 100
  }));

  const getObstacleColor = (type: ObstacleType) => {
    if (type === "door" || type === "window") return { bg: "#FFFFFF", border: "#94A3B8" };
    if (type === "switch" || type === "outlet") return { bg: "#FEF08A", border: "#CA8A04" }; 
    return { bg: "#F3E8FF", border: "#9333EA" }; 
  };

  return (
    <div className="tool-interface">
      <style>{`
        @media (min-width: 900px) {
          .board-batten-preview-sticky { position: sticky; top: 1rem; align-self: flex-start; }
        }
      `}</style>
      <div className="tool-layout">
        
        {/* Controls */}
        <div className="tool-controls">
          
          {/* Unit Selector */}
          <div className="form-group">
            <label>Measurement Unit</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {(["in", "ft", "cm"] as UnitType[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={unit === u}
                  onClick={() => handleUnitChange(u)}
                  style={{
                    flex: 1, padding: "8px", borderRadius: "6px", cursor: "pointer", fontWeight: 600,
                    background: unit === u ? "var(--text-main)" : "white",
                    color: unit === u ? "white" : "var(--text-main)",
                    border: `1px solid ${unit === u ? "var(--text-main)" : "#D1D5DB"}`
                  }}
                >
                  {u === "in" ? "Inches" : u === "ft" ? "Feet" : "Centimeters"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
            <div className="form-group">
              <label htmlFor="wall-width">Wall Width ({unit})</label>
              <input id="wall-width" type="number" value={inputValue(wallWidth)} onChange={(e) => setWallWidth(toInches(Number(e.target.value)))} min="0.01" step="any" />
            </div>
            <div className="form-group">
              <label htmlFor="wall-height">Wall Height ({unit})</label>
              <input id="wall-height" type="number" value={inputValue(wallHeight)} onChange={(e) => setWallHeight(toInches(Number(e.target.value)))} min="0.01" step="any" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="batten-width">Batten Width ({unit})</label>
              <input id="batten-width" type="number" min="0.01" step="any" value={inputValue(battenWidth)} onChange={(e) => setBattenWidth(toInches(Number(e.target.value)))} />
            </div>
            <div className="form-group">
              <label htmlFor="target-gap">Minimum Clear Gap ({unit})</label>
              <input id="target-gap" type="number" min="0" step="any" value={inputValue(targetGap)} onChange={(e) => setTargetGap(toInches(Number(e.target.value)))} />
            </div>
          </div>

          {!canCalculate && (
            <p role="alert" style={{ margin: 0, color: "#B91C1C", fontSize: "0.9rem" }}>
              Enter positive wall and batten dimensions, a non-negative gap, and valid obstacle dimensions and offsets to calculate the layout.
            </p>
          )}
          {canCalculate && !canBuildBattenLayout && (
            <p role="alert" style={{ margin: 0, color: "#B91C1C", fontSize: "0.9rem" }}>
              This layout contains more than {MAX_LAYOUT_BATTENS} batten positions. Increase the minimum gap or batten width.
            </p>
          )}
          {canBuildBattenLayout && cutPieceOverflow && (
            <p role="alert" style={{ margin: 0, color: "#B91C1C", fontSize: "0.9rem" }}>
              This layout creates more than {MAX_LAYOUT_CUT_PIECES} cut pieces. Simplify the obstacles to calculate material safely.
            </p>
          )}
          {canBuildBattenLayout && !cutPieceOverflow && !canShowEstimate && (
            <p role="alert" style={{ margin: 0, color: "#B91C1C", fontSize: "0.9rem" }}>
              These dimensions are too large to calculate safely. Check the measurements and try smaller values.
            </p>
          )}

          <div className="form-group" style={{ marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <label style={{ margin: 0 }}>Wall Obstacles</label>
              <button type="button" onClick={addOpening} style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none", padding: "6px 12px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                + Add Obstacle
              </button>
            </div>
            <p style={{ margin: "-0.5rem 0 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Enter each opening’s width, height, and offsets from the left wall edge and floor.
            </p>

            {(hasOutOfBoundsOpening || hasOverlappingOpenings) && (
              <p role="status" style={{ margin: "0 0 1rem", color: "#92400E", fontSize: "0.9rem" }}>
                {hasOutOfBoundsOpening && "Obstacles outside the wall are clipped to its edges. "}
                {hasOverlappingOpenings && "Overlapping obstacle areas are combined."}
              </p>
            )}
            
            {openings.map((op) => {
              const colors = getObstacleColor(op.type);
              return (
                <div key={op.id} style={{ background: "#F9FAFB", padding: "12px", borderRadius: "8px", marginBottom: "10px", border: `1px solid ${colors.border}` }}>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                    <select aria-label="Obstacle type" value={op.type} onChange={(e) => updateOpening(op.id, "type", e.target.value)} style={{ flex: 1, padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}>
                      <option value="window">Window</option>
                      <option value="door">Door</option>
                      <option value="switch">Light Switch</option>
                      <option value="outlet">Electrical Outlet</option>
                      <option value="custom">Custom Obstacle</option>
                    </select>
                    <button type="button" aria-label="Remove obstacle" onClick={() => removeOpening(op.id)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                  </div>
                  
                  {op.type === "custom" && (
                    <div style={{ marginBottom: "8px" }}>
                      <input aria-label="Custom obstacle label" type="text" placeholder="Label (e.g., HVAC)" value={op.label || ""} onChange={(e) => updateOpening(op.id, "label", e.target.value)} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }} />
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label htmlFor={`${op.id}-width`} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Width ({unit})</label>
                      <input id={`${op.id}-width`} type="number" min="0.01" step="any" value={inputValue(op.width)} onChange={(e) => updateOpening(op.id, "width", Number(e.target.value))} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }} />
                    </div>
                    <div>
                      <label htmlFor={`${op.id}-offset`} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Left Edge Offset ({unit})</label>
                      <input id={`${op.id}-offset`} type="number" min="0" step="any" value={inputValue(op.offset)} onChange={(e) => updateOpening(op.id, "offset", Number(e.target.value))} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }} />
                    </div>
                    <div>
                      <label htmlFor={`${op.id}-height`} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Height ({unit})</label>
                      <input id={`${op.id}-height`} type="number" min="0.01" step="any" value={inputValue(op.height)} onChange={(e) => updateOpening(op.id, "height", Number(e.target.value))} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }} />
                    </div>
                    <div>
                      <label htmlFor={`${op.id}-bottom-offset`} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Bottom Edge Offset ({unit})</label>
                      <input id={`${op.id}-bottom-offset`} type="number" min="0" step="any" value={inputValue(op.bottomOffset)} onChange={(e) => updateOpening(op.id, "bottomOffset", Number(e.target.value))} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Visual Preview & Results */}
        <div className="tool-preview board-batten-preview-sticky" style={{ flexDirection: "column", alignItems: "stretch", background: "white", padding: "0", overflow: "hidden" }}>
          
          <div role="img" aria-label="Wall layout preview with rectangular openings and vertical batten pieces" style={{ position: "relative", height: "200px", background: "#F8FAFC", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
              {segmentResults.map((seg, i) => (
                <div key={i} style={{ 
                  position: "absolute", 
                  left: `${(seg.start / previewWallWidth) * 100}%`,
                  width: `${(seg.width / previewWallWidth) * 100}%`,
                  height: "100%", 
                  background: "#E2E8F0",
                  boxSizing: "border-box",
                  borderRight: i === segmentResults.length - 1 ? "none" : "2px solid #CBD5E1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.8rem", color: "#64748B", fontWeight: 600
                }}>
                  {fromInches(seg.width).toFixed(1)} {unit}
                </div>
              ))}
              {previewBattens.map(batten => (
                <div key={batten.id} aria-hidden="true" style={{
                  position: "absolute",
                  left: `${(batten.left / previewWallWidth) * 100}%`,
                  width: `${(battenWidthIn / previewWallWidth) * 100}%`,
                  top: `${((previewWallHeight - batten.bottom - batten.height) / previewWallHeight) * 100}%`,
                  height: `${(batten.height / previewWallHeight) * 100}%`,
                  boxSizing: "border-box",
                  background: "var(--accent)",
                  opacity: 0.85,
                  zIndex: 5
                }} />
              ))}
              {previewOpenings.filter(op => op.width > 0 && op.height > 0).map(op => {
                const colors = getObstacleColor(op.type);
                return (
                  <div key={op.id} style={{
                    position: "absolute",
                    left: `${op.left}%`,
                    width: `${op.width}%`,
                    top: `${op.top}%`,
                    height: `${op.height}%`,
                    background: colors.bg,
                    border: `2px dashed ${colors.border}`,
                    boxSizing: "border-box",
                    zIndex: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.7rem", color: colors.border, fontWeight: 600, textAlign: "center", padding: "2px"
                  }}>
                    {op.type === "custom" ? (op.label || "CUSTOM") : op.type.toUpperCase()}
                  </div>
                );
              })}
            </div>
          </div>
          <div aria-hidden="true" style={{ display: "flex", flexWrap: "wrap", gap: "12px", padding: "10px 1rem", borderBottom: "1px solid #E5E7EB", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <span><span style={{ display: "inline-block", width: "12px", height: "12px", marginRight: "5px", background: "#E2E8F0", verticalAlign: "middle" }} />Wall segment</span>
            <span><span style={{ display: "inline-block", width: "12px", height: "12px", marginRight: "5px", background: "var(--accent)", verticalAlign: "middle" }} />Vertical batten</span>
            <span><span style={{ display: "inline-block", width: "12px", height: "12px", marginRight: "5px", border: "1px dashed #64748B", verticalAlign: "middle" }} />Opening</span>
          </div>
          {canShowEstimate && !canRenderBattenPreview && (
            <p role="status" style={{ margin: 0, padding: "0.75rem 1rem", color: "#92400E", fontSize: "0.9rem" }}>
              The preview is hidden because it contains more than {MAX_PREVIEW_BATTENS} battens.
            </p>
          )}

          <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem" }}>Segment Layout</h3>
            
            {canShowEstimate && segmentResults.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>No usable wall segments remain after accounting for obstacles.</p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {canShowEstimate && segmentResults.map((res, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div>
                    <strong>Segment {i + 1}</strong> ({fromInches(res.start).toFixed(1)} {unit} to {fromInches(res.end).toFixed(1)} {unit})
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {res.numBattens} batten positions · {res.numCutPieces} cut pieces
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--accent)" }}>{fromInches(res.actualGapIn).toFixed(2)} {unit}</span>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>gap</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#F0FDF4", borderRadius: "8px", border: "1px solid #BBF7D0" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "1rem", color: "#166534" }}>Material Estimate</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.9rem", color: "#15803D" }}>
                <div>Batten Positions: <strong>{canShowEstimate ? totalBattens : "—"}</strong></div>
                <div>Vertical Cut Pieces: <strong>{canShowEstimate ? cutLengths.length : "—"}</strong></div>
                <div>Vertical Linear Feet: <strong>{canShowEstimate ? `${totalLinearFeet.toFixed(1)} ft` : "—"}</strong></div>
                <div>8-ft Stock Boards: <strong>{canShowEstimate ? stockBoardsNeeded : "—"}</strong></div>
                <div>Waste Allowance: <strong>10%</strong></div>
              </div>
              <p style={{ margin: "0.75rem 0 0", fontSize: "0.8rem", color: "#166534" }}>
                Estimate packs the vertical cut pieces into 8-ft boards, then adds 10% waste. It excludes rails and trim; pieces longer than 8 ft require splicing.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}