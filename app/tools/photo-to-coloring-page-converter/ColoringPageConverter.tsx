"use client";

import { useRef, useState } from "react";
import ToolShell, { NumberField } from "../ToolShell";
import FileUploadField from "../FileUploadField";

function downloadCanvas(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function ColoringPageConverter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const source = useRef<ImageData | null>(null);
  const [threshold, setThreshold] = useState(34);
  const [ready, setReady] = useState(false);
  const [invert, setInvert] = useState(false);
  const [imageName, setImageName] = useState("");
  const [inputKey, setInputKey] = useState(0);

  const reset = () => {
    setThreshold(34);
    setReady(false);
    setInvert(false);
    setImageName("");
    setInputKey((current) => current + 1);
    source.current = null;
    if (canvasRef.current) {
      canvasRef.current.width = 0;
      canvasRef.current.height = 0;
    }
  };

  const uploadImage = (file: File | null) => {
    if (!file) return;
    setReady(false);
    if (!file.type.startsWith("image/")) {
      setImageName("Please choose an image file.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (context) {
        source.current = context.getImageData(0, 0, canvas.width, canvas.height);
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

  const convertPhoto = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    const sourceFrame = source.current;
    if (!canvas || !context || !ready || !sourceFrame) return;
    const frame = new ImageData(
      new Uint8ClampedArray(sourceFrame.data),
      sourceFrame.width,
      sourceFrame.height,
    );
    const pixels = new Uint8ClampedArray(frame.data);
    const luminance = (x: number, y: number) => {
      const offset = (y * canvas.width + x) * 4;
      return 0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2];
    };
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const edge = Math.abs(luminance(Math.min(canvas.width - 1, x + 1), y) - luminance(Math.max(0, x - 1), y))
          + Math.abs(luminance(x, Math.min(canvas.height - 1, y + 1)) - luminance(x, Math.max(0, y - 1)));
        const shade = (edge > threshold ? 0 : 255) * (invert ? -1 : 1) + (invert ? 255 : 0);
        const offset = (y * canvas.width + x) * 4;
        frame.data[offset] = shade;
        frame.data[offset + 1] = shade;
        frame.data[offset + 2] = shade;
        frame.data[offset + 3] = 255;
      }
    }
    context.putImageData(frame, 0, 0);
  };

  return (
    <ToolShell title="Coloring page studio" onReset={reset}>
      <FileUploadField
        key={inputKey}
        label="Choose image"
        accept="image/*"
        helperText="PNG, JPG, or WebP. Your photo is processed in this browser."
        onFileSelect={uploadImage}
      />
      <NumberField label="Outline sensitivity (lower creates more lines)" value={threshold} min={1} onChange={setThreshold} />
      <label className="tool-check"><span>Invert outline colors</span><input type="checkbox" role="switch" checked={invert} onChange={(event) => setInvert(event.target.checked)} /></label>
      <button type="button" className="btn" onClick={convertPhoto} disabled={!ready}>Create coloring page</button>
      {imageName && <p>{imageName}</p>}
      {!ready && <p className="tool-empty-state">Choose an image to preview your coloring page.</p>}
      <canvas ref={canvasRef} className="tool-canvas-preview" style={{ display: ready ? "block" : "none" }} />
      <p>Try a clear, high-contrast photo. Image processing happens in this browser.</p>
      <button type="button" className="btn" onClick={() => downloadCanvas(canvasRef.current, "coloring-page.png")} disabled={!ready}>Download PNG</button>
    </ToolShell>
  );
}
