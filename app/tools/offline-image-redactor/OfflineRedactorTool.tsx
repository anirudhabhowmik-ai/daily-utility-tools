"use client";

import { useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import ToolShell, { NumberField } from "../ToolShell";

function downloadCanvas(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function OfflineRedactorTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const source = useRef<ImageData | null>(null);
  const history = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const [ready, setReady] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [brushSize, setBrushSize] = useState(28);
  const [imageName, setImageName] = useState("");
  const [inputKey, setInputKey] = useState(0);

  const reset = () => {
    setReady(false);
    setHistoryCount(0);
    setBrushSize(28);
    setImageName("");
    setInputKey((current) => current + 1);
    source.current = null;
    history.current = [];
    drawing.current = false;
    if (canvasRef.current) {
      canvasRef.current.width = 0;
      canvasRef.current.height = 0;
    }
  };

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReady(false);
    if (!file.type.startsWith("image/")) {
      setImageName("Please choose an image file.");
      return;
    }
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (context) {
        source.current = context.getImageData(0, 0, canvas.width, canvas.height);
        history.current = [];
        setHistoryCount(0);
        setReady(true);
      }
      URL.revokeObjectURL(objectUrl);
      setImageName(file.name);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setImageName("The selected image could not be opened.");
      setReady(false);
    };
    image.src = objectUrl;
  };

  const redactAtPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * (canvas.width / bounds.width);
    const y = (event.clientY - bounds.top) * (canvas.height / bounds.height);
    context.fillStyle = "#111827";
    context.beginPath();
    context.arc(x, y, brushSize * (canvas.width / bounds.width) / 2, 0, Math.PI * 2);
    context.fill();
  };

  const startRedaction = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      history.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
      if (history.current.length > 3) history.current.shift();
      setHistoryCount(history.current.length);
    }
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    redactAtPointer(event);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const previous = history.current.pop();
    if (!canvas || !context || !previous) return;
    context.putImageData(previous, 0, 0);
    setHistoryCount(history.current.length);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !source.current) return;
    context.putImageData(source.current, 0, 0);
    history.current = [];
    setHistoryCount(0);
  };

  return (
    <ToolShell title="Image redaction studio" onReset={reset}>
      <label className="tool-field">Choose image<input key={inputKey} className="tool-input" type="file" accept="image/*" onChange={uploadImage} /></label>
      <NumberField label="Redaction brush size (px)" value={brushSize} min={4} onChange={setBrushSize} />
      {imageName && <p>{imageName}</p>}
      {!ready && <p className="tool-empty-state">Choose an image to start masking sensitive areas.</p>}
      <canvas ref={canvasRef} onPointerDown={startRedaction} onPointerMove={redactAtPointer} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} className="tool-canvas-preview" style={{ display: ready ? "block" : "none", touchAction: "none" }} />
      <p>Drag across sensitive areas to cover them with an opaque mask. The source image is processed locally in this browser.</p>
      <div className="tool-action-row">
        <button type="button" className="tool-secondary-button" onClick={undo} disabled={historyCount === 0}>Undo stroke</button>
        <button type="button" className="tool-secondary-button" onClick={clear} disabled={!ready || historyCount === 0}>Clear masks</button>
      </div>
      <button type="button" className="btn" onClick={() => downloadCanvas(canvasRef.current, "redacted-image.png")} disabled={!ready}>Download redacted PNG</button>
    </ToolShell>
  );
}
