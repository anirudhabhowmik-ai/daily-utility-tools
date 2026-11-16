"use client";

import { useState } from "react";

type ObstacleType = "door" | "window" | "switch" | "outlet" | "custom";
type UnitType = "in" | "ft" | "cm";

type Opening = {
  id: string;
  type: ObstacleType;
  width: number;
  offset: number;
  label?: string;
};

const CM_PER_INCH = 2.54;

export default function BoardBatten() {
  // Unit State
  const [unit, setUnit] = useState<UnitType>("in");

  // Core States (Stored in the selected unit)
  const [wallWidth, setWallWidth] = useState<number>(144);
  const [wallHeight, setWallHeight] = useState<number>(96);
  const [battenWidth, setBattenWidth] = useState<number>(3.5);
  const [targetGap, setTargetGap] = useState<number>(16);
  const [openings, setOpenings] = useState<Opening[]>([]);

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

  const handleUnitChange = (newUnit: UnitType) => {
    if (newUnit === unit) return;

    const convertValue = (val: number) => {
      const inInches = toInches(val);
      if (newUnit === "ft") return Number((inInches / 12).toFixed(2));
      if (newUnit === "cm") return Number((inInches * CM_PER_INCH).toFixed(1));
      return Number(inInches.toFixed(2));
    };

    setWallWidth(convertValue(wallWidth));
    setWallHeight(convertValue(wallHeight));
    setBattenWidth(convertValue(battenWidth));
    setTargetGap(convertValue(targetGap));
    setOpenings(current => current.map(o => ({
      ...o,
      width: convertValue(o.width),
      offset: convertValue(o.offset)
    })));

    setUnit(newUnit);
  };

  const addOpening = () => {
    const defaultWidth = unit === "in" ? 36 : unit === "ft" ? 3 : 91;
    setOpenings(current => [...current, {
      id: `${Date.now()}-${current.length}`,
      type: "window",
      width: defaultWidth,
      offset: defaultWidth
    }]);
  };

  const updateOpening = (id: string, field: keyof Opening, value: string | number) => {
    setOpenings(current => current.map(o => {
      if (o.id !== id) return o;
      const updated = { ...o, [field]: value };
      
      if (field === "type") {
        // Set default sizes based on unit
        if (value === "switch") updated.width = unit === "in" ? 4 : unit === "ft" ? 0.33 : 10;
        if (value === "outlet") updated.width = unit === "in" ? 3 : unit === "ft" ? 0.25 : 7.6;
        if (value === "window") updated.width = unit === "in" ? 36 : unit === "ft" ? 3 : 91;
        if (value === "door") updated.width = unit === "in" ? 32 : unit === "ft" ? 2.6 : 81;
      }
      return updated;
    }));
  };

  const removeOpening = (id: string) => setOpenings(current => current.filter(o => o.id !== id));

  const wallWidthIn = toInches(wallWidth);
  const wallHeightIn = toInches(wallHeight);
  const battenWidthIn = toInches(battenWidth);
  const targetGapIn = toInches(targetGap);

  const validWallWidth = Number.isFinite(wallWidthIn) && wallWidthIn > 0;
  const validWallHeight = Number.isFinite(wallHeightIn) && wallHeightIn > 0;
  const validBattenWidth = Number.isFinite(battenWidthIn) && battenWidthIn > 0;
  const validTargetGap = Number.isFinite(targetGapIn) && targetGapIn >= 0;
  const validOpenings = openings.every(op => {
    const widthIn = toInches(op.width);
    const offsetIn = toInches(op.offset);
    return Number.isFinite(widthIn) && widthIn > 0 && Number.isFinite(offsetIn) && offsetIn >= 0;
  });
  const canCalculate = validWallWidth && validWallHeight && validBattenWidth && validTargetGap && validOpenings;

  const openingRanges = openings
    .map(op => ({
      start: toInches(op.offset),
      end: toInches(op.offset) + toInches(op.width)
    }))
    .filter(range => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)
    .sort((a, b) => a.start - b.start);
  const hasOutOfBoundsOpening = validWallWidth && openingRanges.some(
    range => range.start >= wallWidthIn || range.end > wallWidthIn
  );
  let furthestOpeningEnd = -Infinity;
  const hasOverlappingOpenings = openingRanges.some(range => {
    const overlaps = range.start < furthestOpeningEnd;
    furthestOpeningEnd = Math.max(furthestOpeningEnd, range.end);
    return overlaps;
  });

  let currentX = 0;
  const segments: { start: number; end: number; width: number }[] = [];

  if (canCalculate) {
    openingRanges.forEach(range => {
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

  let totalBattens = 0;
  const segmentResults = segments.map((seg) => {
    const numBattens = Math.max(
      0,
      Math.floor((seg.width - targetGapIn) / (battenWidthIn + targetGapIn))
    );
    const totalBattenWidth = numBattens * battenWidthIn;
    const remainingSpace = seg.width - totalBattenWidth;
    const numGaps = numBattens + 1;
    const actualGapIn = numGaps > 0 ? remainingSpace / numGaps : 0;

    totalBattens += numBattens;

    return {
      ...seg,
      numBattens,
      actualGap: fromInches(actualGapIn)
    };
  });

  const totalLinearInches = canCalculate ? totalBattens * wallHeightIn : 0;
  const totalLinearFeet = totalLinearInches / 12;
  const boardsNeeded = Math.ceil((totalLinearFeet * 1.1) / 8);

  const previewWallWidth = validWallWidth ? wallWidthIn : 1;
  const previewOpenings = openings.map(op => {
    const offsetIn = toInches(op.offset);
    const widthIn = toInches(op.width);
    if (!validWallWidth || !Number.isFinite(offsetIn) || !Number.isFinite(widthIn) || widthIn <= 0) {
      return { ...op, left: 0, width: 0 };
    }
    const start = Math.min(wallWidthIn, Math.max(0, offsetIn));
    const end = Math.min(wallWidthIn, Math.max(0, offsetIn + widthIn));
    return {
      ...op,
      left: (start / previewWallWidth) * 100,
      width: (Math.max(0, end - start) / previewWallWidth) * 100
    };
  });

  const getObstacleColor = (type: string) => {
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
              <input id="wall-width" type="number" value={wallWidth} onChange={(e) => setWallWidth(Number(e.target.value))} min="0.01" step="any" />
            </div>
            <div className="form-group">
              <label htmlFor="wall-height">Wall Height ({unit})</label>
              <input id="wall-height" type="number" value={wallHeight} onChange={(e) => setWallHeight(Number(e.target.value))} min="0.01" step="any" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="batten-width">Batten Width ({unit})</label>
              <input id="batten-width" type="number" min="0.01" step="any" value={battenWidth} onChange={(e) => setBattenWidth(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label htmlFor="target-gap">Target Gap ({unit})</label>
              <input id="target-gap" type="number" min="0" step="any" value={targetGap} onChange={(e) => setTargetGap(Number(e.target.value))} />
            </div>
          </div>

          {!canCalculate && (
            <p role="alert" style={{ margin: 0, color: "#B91C1C", fontSize: "0.9rem" }}>
              Enter positive wall and batten dimensions, a non-negative gap, and valid obstacle widths and offsets to calculate the layout.
            </p>
          )}

          <div className="form-group" style={{ marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <label style={{ margin: 0 }}>Wall Obstacles</label>
              <button type="button" onClick={addOpening} style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none", padding: "6px 12px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                + Add Obstacle
              </button>
            </div>

            {(hasOutOfBoundsOpening || hasOverlappingOpenings) && (
              <p role="status" style={{ margin: "0 0 1rem", color: "#92400E", fontSize: "0.9rem" }}>
                {hasOutOfBoundsOpening && "Obstacles outside the wall are clipped to its edges. "}
                {hasOverlappingOpenings && "Overlapping obstacles are treated as one blocked area."}
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
                      <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Width ({unit})</label>
                      <input aria-label="Obstacle width" type="number" min="0.01" step="any" value={op.width} onChange={(e) => updateOpening(op.id, "width", Number(e.target.value))} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Offset from Left ({unit})</label>
                      <input aria-label="Obstacle offset from left" type="number" min="0" step="any" value={op.offset} onChange={(e) => updateOpening(op.id, "offset", Number(e.target.value))} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Visual Preview & Results */}
        <div className="tool-preview board-batten-preview-sticky" style={{ flexDirection: "column", alignItems: "stretch", background: "white", padding: "0", overflow: "hidden" }}>
          
          <div style={{ position: "relative", height: "200px", background: "#F8FAFC", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
              {segmentResults.map((seg, i) => (
                <div key={i} style={{ 
                  position: "absolute", 
                  left: `${(seg.start / previewWallWidth) * 100}%`,
                  width: `${(seg.width / previewWallWidth) * 100}%`,
                  height: "100%", 
                  background: "#E2E8F0",
                  borderRight: i === segmentResults.length - 1 ? "none" : "2px solid #CBD5E1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.8rem", color: "#64748B", fontWeight: 600
                }}>
                  {fromInches(seg.width).toFixed(1)} {unit}
                </div>
              ))}
              {previewOpenings.filter(op => op.width > 0).map(op => {
                const colors = getObstacleColor(op.type);
                return (
                  <div key={op.id} style={{
                    position: "absolute",
                    left: `${op.left}%`,
                    width: `${op.width}%`,
                    height: "100%",
                    background: colors.bg,
                    border: `2px dashed ${colors.border}`,
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

          <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem" }}>Layout & Cut List</h3>
            
            {canCalculate && segmentResults.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>No usable wall segments remain after accounting for obstacles.</p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {segmentResults.map((res, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div>
                    <strong>Segment {i + 1}</strong> ({fromInches(res.start).toFixed(1)} {unit} to {fromInches(res.end).toFixed(1)} {unit})
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{res.numBattens} battens required</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--accent)" }}>{res.actualGap.toFixed(2)} {unit}</span>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>gap</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#F0FDF4", borderRadius: "8px", border: "1px solid #BBF7D0" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "1rem", color: "#166534" }}>Material Estimate</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.9rem", color: "#15803D" }}>
                <div>Total Battens: <strong>{canCalculate ? totalBattens : "—"}</strong></div>
                <div>Linear Feet: <strong>{canCalculate ? `${totalLinearFeet.toFixed(1)} ft` : "—"}</strong></div>
                <div>Boards Needed (8ft): <strong>{canCalculate ? boardsNeeded : "—"}</strong></div>
                <div>Waste Allowance: <strong>10%</strong></div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}