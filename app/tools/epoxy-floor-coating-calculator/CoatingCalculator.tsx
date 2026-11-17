"use client";

import { useState } from "react";
import ToolShell, { NumberField, Result } from "../ToolShell";

export default function CoatingCalculator() {
  const [length, setLength] = useState(20);
  const [width, setWidth] = useState(12);
  const [coats, setCoats] = useState(2);
  const [coverage, setCoverage] = useState(250);
  const [waste, setWaste] = useState(10);
  const area = length * width;
  const amount = coverage > 0 ? (area * coats * (1 + waste / 100)) / coverage : 0;

  const reset = () => {
    setLength(20);
    setWidth(12);
    setCoats(2);
    setCoverage(250);
    setWaste(10);
  };

  return (
    <ToolShell title="Coating estimator" onReset={reset}>
      <NumberField label="Floor length (ft)" value={length} min={0.01} onChange={setLength} />
      <NumberField label="Floor width (ft)" value={width} min={0.01} onChange={setWidth} />
      <NumberField label="Number of coats" value={coats} min={1} onChange={(value) => setCoats(Math.max(1, Math.floor(value)))} />
      <NumberField label="Coverage per gallon (sq ft)" value={coverage} min={1} onChange={setCoverage} />
      <NumberField label="Extra material allowance (%)" value={waste} max={100} onChange={setWaste} />
      <Result><strong>Area:</strong> {area.toFixed(1)} sq ft. Approximate product: {amount.toFixed(2)} gallons ({Math.ceil(amount)} whole gallons), including the entered allowance.</Result>
      <p>Use the actual product label coverage; porous or rough surfaces may need more material.</p>
    </ToolShell>
  );
}
