"use client";

import { useState } from "react";
import ToolShell, { NumberField, Result } from "../ToolShell";

export default function StairCarpetCalculator() {
  const [stairs, setStairs] = useState(12);
  const [tread, setTread] = useState(10);
  const [riser, setRiser] = useState(7.5);
  const [width, setWidth] = useState(36);
  const [landingRun, setLandingRun] = useState(0);
  const [waste, setWaste] = useState(10);
  const runIn = stairs * (tread + riser) + landingRun;
  const area = (runIn * width) / 144;

  const reset = () => {
    setStairs(12);
    setTread(10);
    setRiser(7.5);
    setWidth(36);
    setLandingRun(0);
    setWaste(10);
  };

  return (
    <ToolShell title="Stair carpet planner" onReset={reset}>
      <NumberField label="Number of steps" value={stairs} min={1} onChange={(value) => setStairs(Math.max(1, Math.floor(value)))} />
      <NumberField label="Tread depth (in)" value={tread} min={0.1} onChange={setTread} />
      <NumberField label="Riser height (in)" value={riser} min={0.1} onChange={setRiser} />
      <NumberField label="Combined landing run (in)" value={landingRun} onChange={setLandingRun} />
      <NumberField label="Carpet width (in)" value={width} min={0.1} onChange={setWidth} />
      <NumberField label="Waste allowance (%)" value={waste} max={100} onChange={setWaste} />
      <Result><strong>Estimated carpet:</strong> {(area * (1 + waste / 100)).toFixed(2)} sq ft ({(runIn * (1 + waste / 100) / 12).toFixed(2)} linear ft at the entered width).</Result>
      <p>Landings, turns, pattern matching, nosing, and installation methods can add material; confirm measurements before ordering.</p>
    </ToolShell>
  );
}
