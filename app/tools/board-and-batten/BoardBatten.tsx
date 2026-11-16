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

export default function BoardBatten() {
  // Unit State
  const [unit, setUnit] = useState<UnitType>("in");

  // Core States (Stored in the selected unit)
  const [wallWidth, setWallWidth] = useState<number>(144);
  const [wallHeight, setWallHeight] = useState<number>(96);
  const [battenWidth, setBattenWidth] = useState<number>(3.5);
  const [targetGap, setTargetGap] = useState<number>(16);
  const [openings, setOpenings] = useState<Opening[]>([]);

  // Conversion Helpers (Everything internally calculates in INCHES)
  const toInches = (val: number) => {
    if (unit === "ft") return val * 12;
    if (unit === "cm") return val * 0.393701;
    return val;
  };

  const fromInches = (val: number) => {
    if (unit === "ft") return val / 12;
    if (unit === "cm") return val / 0.393701;
    return val;
  };

  // Handle unit changes (Automatically convert current inputs so numbers don't break)
  const handleUnitChange = (newUnit: UnitType) => {
    const convertValue = (val: number) => {
      const inInches = toInches(val);
      if (newUnit === "ft") return Number((inInches / 12).toFixed(2));
      if (newUnit === "cm") return Number((inInches / 0.393701).toFixed(1));
      return Number(inInches.toFixed(2));
    };

    setWallWidth(convertValue(wallWidth));
    setWallHeight(convertValue(wallHeight));
    setBattenWidth(convertValue(battenWidth));
    setTargetGap(convertValue(targetGap));
    setOpenings(openings.map(o => ({
      ...o,
      width: convertValue(o.width),
      offset: convertValue(o.offset)
    })));

    setUnit(newUnit);
  };

  const addOpening = () => {
    const defaultWidth = unit === "in" ? 36 : unit === "ft" ? 3 : 91;
    setOpenings([...openings, { id: Date.now().toString(), type: "window", width: defaultWidth, offset: defaultWidth }]);
  };

  const updateOpening = (id: string, field: keyof Opening, value: string | number) => {
    setOpenings(openings.map(o => {
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

  const removeOpening = (id: string) => setOpenings(openings.filter(o => o.id !== id));

  // --- INTERNAL MATH (ALL IN INCHES) ---
  const wallWidthIn = toInches(wallWidth);
  const battenWidthIn = toInches(battenWidth);
  const targetGapIn = toInches(targetGap);
  
  const sortedOpenings = [...openings].sort((a, b) => toInches(a.offset) - toInches(b.offset));
  
  let currentX = 0;
  const segments: { start: number; end: number; width: number }[] = [];
  
  sortedOpenings.forEach(op => {
    const opOffsetIn = toInches(op.offset);
    const opWidthIn = toInches(op.width);
    
    if (opOffsetIn > currentX) {
      segments.push({ start: currentX, end: opOffsetIn, width: opOffsetIn - currentX });
    }
    currentX = Math.max(currentX, opOffsetIn + opWidthIn);
  });
  
  if (currentX < wallWidthIn) {
    segments.push({ start: currentX, end: wallWidthIn, width: wallWidthIn - currentX });
  }

  let totalBattens = 0;
  const segmentResults = segments.map((seg) => {
    const estimatedBattens = Math.max(0, Math.floor(seg.width / (battenWidthIn + targetGapIn)) - 1);
    
    let numBattens = estimatedBattens;
    if (seg.width > 0 && seg.width < battenWidthIn * 2) numBattens = 0;
    
    const totalBattenWidth = numBattens * battenWidthIn;
    const remainingSpace = seg.width - totalBattenWidth;
    const numGaps = numBattens + 1;
    const actualGapIn = numGaps > 0 ? remainingSpace / numGaps : 0;

    totalBattens += numBattens;

    return {
      ...seg,
      numBattens,
      actualGap: fromInches(actualGapIn).toFixed(2)
    };
  });

  const totalLinearInches = totalBattens * toInches(wallHeight);
  const totalLinearFeet = totalLinearInches / 12;
  const boardsNeeded = Math.ceil((totalLinearFeet * 1.1) / 8); 

  const getObstacleColor = (type: string) => {
    if (type === "door" || type === "window") return { bg: "#FFFFFF", border: "#94A3B8" };
    if (type === "switch" || type === "outlet") return { bg: "#FEF08A", border: "#CA8A04" }; 
    return { bg: "#F3E8FF", border: "#9333EA" }; 
  };

  return (
    <div className="tool-interface">
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
              <label>Wall Width ({unit})</label>
              <input type="number" value={wallWidth} onChange={(e) => setWallWidth(Number(e.target.value))} min="1" />
            </div>
            <div className="form-group">
              <label>Wall Height ({unit})</label>
              <input type="number" value={wallHeight} onChange={(e) => setWallHeight(Number(e.target.value))} min="1" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Batten Width ({unit})</label>
              <input type="number" step="0.1" value={battenWidth} onChange={(e) => setBattenWidth(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Target Gap ({unit})</label>
              <input type="number" value={targetGap} onChange={(e) => setTargetGap(Number(e.target.value))} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <label style={{ margin: 0 }}>Wall Obstacles</label>
              <button onClick={addOpening} style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none", padding: "6px 12px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                + Add Obstacle
              </button>
            </div>
            
            {openings.map((op) => {
              const colors = getObstacleColor(op.type);
              return (
                <div key={op.id} style={{ background: "#F9FAFB", padding: "12px", borderRadius: "8px", marginBottom: "10px", border: `1px solid ${colors.border}` }}>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                    <select value={op.type} onChange={(e) => updateOpening(op.id, "type", e.target.value)} style={{ flex: 1, padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}>
                      <option value="window">Window</option>
                      <option value="door">Door</option>
                      <option value="switch">Light Switch</option>
                      <option value="outlet">Electrical Outlet</option>
                      <option value="custom">Custom Obstacle</option>
                    </select>
                    <button onClick={() => removeOpening(op.id)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                  </div>
                  
                  {op.type === "custom" && (
                    <div style={{ marginBottom: "8px" }}>
                      <input type="text" placeholder="Label (e.g., HVAC)" value={op.label || ""} onChange={(e) => updateOpening(op.id, "label", e.target.value)} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }} />
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Width ({unit})</label>
                      <input type="number" value={op.width} onChange={(e) => updateOpening(op.id, "width", Number(e.target.value))} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Offset from Left ({unit})</label>
                      <input type="number" value={op.offset} onChange={(e) => updateOpening(op.id, "offset", Number(e.target.value))} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Visual Preview & Results */}
        <div className="tool-preview" style={{ flexDirection: "column", alignItems: "stretch", background: "white", padding: "0", overflow: "hidden" }}>
          
          <div style={{ position: "relative", height: "200px", background: "#F8FAFC", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
              {segmentResults.map((seg, i) => (
                <div key={i} style={{ 
                  position: "absolute", 
                  left: `${(seg.start / wallWidthIn) * 100}%`, 
                  width: `${(seg.width / wallWidthIn) * 100}%`, 
                  height: "100%", 
                  background: "#E2E8F0",
                  borderRight: i === segmentResults.length - 1 ? "none" : "2px solid #CBD5E1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.8rem", color: "#64748B", fontWeight: 600
                }}>
                  {fromInches(seg.width).toFixed(1)} {unit}
                </div>
              ))}
              {openings.map(op => {
                const colors = getObstacleColor(op.type);
                const offsetIn = toInches(op.offset);
                const widthIn = toInches(op.width);
                return (
                  <div key={op.id} style={{
                    position: "absolute",
                    left: `${(offsetIn / wallWidthIn) * 100}%`,
                    width: `${(widthIn / wallWidthIn) * 100}%`,
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
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {segmentResults.map((res, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div>
                    <strong>Segment {i + 1}</strong> ({fromInches(res.start).toFixed(1)} {unit} to {fromInches(res.end).toFixed(1)} {unit})
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{res.numBattens} battens required</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--accent)" }}>{res.actualGap} {unit}</span>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>gap</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#F0FDF4", borderRadius: "8px", border: "1px solid #BBF7D0" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "1rem", color: "#166534" }}>Material Estimate</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.9rem", color: "#15803D" }}>
                <div>Total Battens: <strong>{totalBattens}</strong></div>
                <div>Linear Feet: <strong>{totalLinearFeet.toFixed(1)} ft</strong></div>
                <div>Boards Needed (8ft): <strong>{boardsNeeded}</strong></div>
                <div>Waste Allowance: <strong>10%</strong></div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}