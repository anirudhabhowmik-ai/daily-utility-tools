"use client";

import { useState } from "react";
import ToolShell, { NumberField, Result } from "../ToolShell";

export default function BoardFeetCalculator() {
  const [thickness, setThickness] = useState(1);
  const [width, setWidth] = useState(6);
  const [length, setLength] = useState(8);
  const [count, setCount] = useState(1);
  const [waste, setWaste] = useState(10);
  const [price, setPrice] = useState(0);
  const boardFeet = (thickness * width * length * count) / 12;
  const totalWithWaste = boardFeet * (1 + waste / 100);

  const reset = () => {
    setThickness(1);
    setWidth(6);
    setLength(8);
    setCount(1);
    setWaste(10);
    setPrice(0);
  };

  return (
    <ToolShell title="Lumber estimator" onReset={reset}>
      <NumberField label="Thickness (in)" value={thickness} min={0.01} onChange={setThickness} />
      <NumberField label="Width (in)" value={width} min={0.01} onChange={setWidth} />
      <NumberField label="Length (ft)" value={length} min={0.01} onChange={setLength} />
      <NumberField label="Quantity" value={count} min={1} onChange={(value) => setCount(Math.max(1, Math.floor(value)))} />
      <NumberField label="Waste allowance (%)" value={waste} max={100} onChange={setWaste} />
      <NumberField label="Price per board foot ($, optional)" value={price} onChange={setPrice} />
      <Result><strong>{boardFeet.toFixed(2)} board feet</strong> measured; plan for about {totalWithWaste.toFixed(2)} board feet with the waste allowance. {price > 0 && <>Estimated material cost: <strong>${(totalWithWaste * price).toFixed(2)}</strong>.</>}</Result>
      <p>The estimate uses actual dimensions. Lumber is often sold by nominal sizes, so confirm the supplier&apos;s pricing basis.</p>
    </ToolShell>
  );
}
