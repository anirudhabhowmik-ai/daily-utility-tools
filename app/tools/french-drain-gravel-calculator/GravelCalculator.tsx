"use client";

import { useState } from "react";
import ToolShell, { NumberField, Result } from "../ToolShell";

export default function GravelCalculator() {
  const [length, setLength] = useState(20);
  const [width, setWidth] = useState(1.5);
  const [trenchDepth, setTrenchDepth] = useState(1);
  const [layerDepth, setLayerDepth] = useState(0.75);
  const [waste, setWaste] = useState(10);
  const [bagSize, setBagSize] = useState(0.5);
  const volume = length * width * layerDepth;
  const orderVolume = volume * (1 + waste / 100);

  const reset = () => {
    setLength(20);
    setWidth(1.5);
    setTrenchDepth(1);
    setLayerDepth(0.75);
    setWaste(10);
    setBagSize(0.5);
  };

  return (
    <ToolShell title="Gravel estimator" onReset={reset}>
      <NumberField label="Trench length (ft)" value={length} min={0.01} onChange={setLength} />
      <NumberField label="Trench width (ft)" value={width} min={0.01} onChange={setWidth} />
      <NumberField label="Trench depth (ft)" value={trenchDepth} min={0.01} onChange={setTrenchDepth} />
      <NumberField label="Gravel layer depth (ft)" value={layerDepth} min={0.01} max={trenchDepth} onChange={setLayerDepth} />
      <NumberField label="Extra material allowance (%)" value={waste} max={100} onChange={setWaste} />
      <NumberField label="Bag size (cu ft)" value={bagSize} min={0.1} onChange={setBagSize} />
      {layerDepth <= trenchDepth
        ? <Result><strong>Order estimate:</strong> {orderVolume.toFixed(2)} ft³ ({(orderVolume / 27).toFixed(2)} yd³), or about {Math.ceil(orderVolume / bagSize)} bags at the selected size. Raw layer volume: {volume.toFixed(2)} ft³.</Result>
        : <p role="alert">Gravel layer depth cannot exceed trench depth.</p>}
      <p>This geometric estimate does not account for compaction, pipe displacement, or site-specific drainage design.</p>
    </ToolShell>
  );
}
