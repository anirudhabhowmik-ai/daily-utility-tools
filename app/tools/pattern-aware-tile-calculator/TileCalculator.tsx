"use client";

import { useState } from "react";
import ToolShell, { NumberField, Result, ToolLabel } from "../ToolShell";

export default function TileCalculator() {
  const [roomLength, setRoomLength] = useState(20);
  const [roomWidth, setRoomWidth] = useState(12);
  const [tileLength, setTileLength] = useState(12);
  const [tileWidth, setTileWidth] = useState(12);
  const [pattern, setPattern] = useState("straight");
  const [waste, setWaste] = useState(10);
  const [coverage, setCoverage] = useState(10);
  const [cost, setCost] = useState(0);
  const roomArea = roomLength * roomWidth;
  const tileArea = (tileLength * tileWidth) / 144;
  const patternWaste = pattern === "offset" ? 0.1 : pattern === "diagonal" ? 0.15 : 0;
  const orderArea = roomArea * (1 + waste / 100 + patternWaste);
  const tileCount = tileArea > 0 ? Math.ceil(orderArea / tileArea) : 0;
  const boxCount = coverage > 0 ? Math.ceil(orderArea / coverage) : 0;

  const reset = () => {
    setRoomLength(20);
    setRoomWidth(12);
    setTileLength(12);
    setTileWidth(12);
    setPattern("straight");
    setWaste(10);
    setCoverage(10);
    setCost(0);
  };

  return (
    <ToolShell title="Tile layout estimator" onReset={reset}>
      <NumberField label="Room length (ft)" value={roomLength} min={0.01} onChange={setRoomLength} />
      <NumberField label="Room width (ft)" value={roomWidth} min={0.01} onChange={setRoomWidth} />
      <NumberField label="Tile length (in)" value={tileLength} min={0.01} onChange={setTileLength} />
      <NumberField label="Tile width (in)" value={tileWidth} min={0.01} onChange={setTileWidth} />
      <ToolLabel>Layout pattern<select className="tool-input" value={pattern} onChange={(event) => setPattern(event.target.value)}><option value="straight">Straight grid</option><option value="offset">Offset / staggered (+10% allowance)</option><option value="diagonal">Diagonal (+15% allowance)</option></select></ToolLabel>
      <NumberField label="Additional waste (%)" value={waste} max={100} onChange={setWaste} />
      <NumberField label="Coverage per box (sq ft)" value={coverage} min={0.1} onChange={setCoverage} />
      <NumberField label="Price per box ($, optional)" value={cost} onChange={setCost} />
      <Result><strong>Estimate:</strong> {tileCount} tiles or {boxCount} boxes for {orderArea.toFixed(1)} sq ft including allowances. {cost > 0 && <>Approximate tile cost: <strong>${(boxCount * cost).toFixed(2)}</strong>.</>}</Result>
      <p>This is an area-based estimate; unusual layouts and border details may require a tile-by-tile plan.</p>
    </ToolShell>
  );
}
