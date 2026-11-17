"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { AdditionalToolKind } from "./config";
import {
  downloadBlob,
  FieldGrid,
  FileField,
  formatBytes,
  loadLocalImage,
  NumberField,
  SelectField,
  ToolActions,
  ToolButton,
  ToolResult,
} from "./ui";

type FormKind = Extract<AdditionalToolKind, "visa-photo-checker" | "upload-readiness-checker" | "passport-photo-sheet-maker">;

const profileOptions = [
  { value: "uk-35x45", label: "United Kingdom photo — 35 × 45 mm starter reference" },
  { value: "us-2x2", label: "United States photo — 2 × 2 in starter reference" },
  { value: "custom", label: "Custom dimensions" },
];

function getPhotoSize(profile: string, customWidth: number, customHeight: number, dpi = 300) {
  if (profile === "us-2x2") return { width: Math.round(2 * dpi), height: Math.round(2 * dpi), label: "2 × 2 in (United States starter reference)" };
  if (profile === "custom") return { width: customWidth, height: customHeight, label: "custom pixels" };
  return { width: Math.round((35 / 25.4) * dpi), height: Math.round((45 / 25.4) * dpi), label: "35 × 45 mm (United Kingdom starter reference)" };
}

function VisaPhotoChecker() {
  const [profile, setProfile] = useState("uk-35x45");
  const [customWidth, setCustomWidth] = useState(413);
  const [customHeight, setCustomHeight] = useState(531);
  const [maxSizeKb, setMaxSizeKb] = useState(500);
  const [file, setFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [background, setBackground] = useState<"light" | "mixed" | "dark" | "unknown">("unknown");
  const [error, setError] = useState("");

  async function inspect(selected: File | null) {
    setFile(selected);
    setDimensions(null);
    setBackground("unknown");
    setError("");
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("Choose an image file to inspect.");
      return;
    }
    try {
      const image = await loadLocalImage(selected);
      setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
      const canvas = document.createElement("canvas");
      canvas.width = 120;
      canvas.height = 120;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("The browser could not inspect the image pixels.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0;
      let light = 0;
      let opaque = 0;
      let samples = 0;
      for (let y = 0; y < 120; y += 1) {
        for (let x = 0; x < 120; x += 1) {
          if (x > 5 && x < 114 && y > 5 && y < 114) continue;
          const index = (y * 120 + x) * 4;
          const average = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
          total += average;
          if (average >= 210 && Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) - Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) < 45) light += 1;
          if (pixels[index + 3] >= 230) opaque += 1;
          samples += 1;
        }
      }
      const mean = total / samples;
      setBackground(opaque < samples * 0.97 ? "mixed" : light > samples * 0.75 ? "light" : mean < 150 ? "dark" : "mixed");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The image could not be inspected.");
    }
  }

  const expected = getPhotoSize(profile, customWidth, customHeight);
  const ratioOkay = dimensions !== null && Math.abs(dimensions.width / dimensions.height - expected.width / expected.height) / (expected.width / expected.height) <= 0.03;
  const pixelsOkay = dimensions !== null && dimensions.width >= expected.width && dimensions.height >= expected.height;
  const sizeOkay = file !== null && file.size <= maxSizeKb * 1024;
  const typeOkay = file !== null && ["image/jpeg", "image/png"].includes(file.type);

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <SelectField label="Reference country and photo profile" value={profile} onChange={setProfile} options={profileOptions} />
        {profile === "custom" && <>
          <NumberField label="Required width (px)" value={customWidth} onChange={setCustomWidth} min={1} max={10000} step={1} />
          <NumberField label="Required height (px)" value={customHeight} onChange={setCustomHeight} min={1} max={10000} step={1} />
        </>}
        <NumberField label="Maximum file size (KB)" value={maxSizeKb} onChange={setMaxSizeKb} min={1} max={100000} step={1} />
        <FileField label="Photo (processed locally)" accept="image/*" onChange={(selected) => { void inspect(selected); }} />
      </FieldGrid>
      {error && <ToolResult><p role="alert">{error}</p></ToolResult>}
      {file && dimensions && <ToolResult>
        <p><strong>{file.name}</strong> · {dimensions.width} × {dimensions.height} px · {formatBytes(file.size)}</p>
        <ul className="tool-check-list">
          <li>{typeOkay ? "File type is JPEG or PNG." : "This profile suggests JPEG or PNG; the selected image uses another format."}</li>
          <li>{ratioOkay ? "Aspect ratio is close to the selected profile." : "Aspect ratio differs from the selected profile by more than 3%."}</li>
          <li>{pixelsOkay ? "Pixel dimensions meet the selected 300-dpi reference dimensions." : `For this profile's 300-dpi reference, aim for at least ${expected.width} × ${expected.height} px.`}</li>
          <li>{sizeOkay ? `File is within the ${maxSizeKb} KB size limit.` : `File exceeds the ${maxSizeKb} KB size limit.`}</li>
          <li>{background === "light" ? "The edge sample looks mostly light and neutral." : background === "dark" ? "The edge sample looks dark; check the background." : background === "mixed" ? "The edge sample is mixed or contains transparency; review the background manually." : "Background could not be checked."}</li>
        </ul>
        <p className="tool-muted">Expected size reference: {expected.width} × {expected.height} px ({expected.label}, 300 dpi).</p>
      </ToolResult>}
    </div>
  );
}

type UploadProfile = { value: string; label: string; extensions: string[]; maxMb: number };
const uploadProfiles: UploadProfile[] = [
  { value: "pdf", label: "PDF document — 10 MB", extensions: ["pdf"], maxMb: 10 },
  { value: "exam-image", label: "Exam image — JPEG or PNG, 5 MB", extensions: ["jpg", "jpeg", "png"], maxMb: 5 },
  { value: "documents", label: "Common documents — 20 MB", extensions: ["pdf", "doc", "docx", "odt", "rtf"], maxMb: 20 },
  { value: "custom", label: "Custom portal profile", extensions: ["pdf", "jpg", "jpeg", "png"], maxMb: 10 },
];

function UploadReadinessChecker() {
  const [profile, setProfile] = useState("pdf");
  const [extensionsText, setExtensionsText] = useState("pdf");
  const [maxMb, setMaxMb] = useState(10);
  const [file, setFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState("");
  const [error, setError] = useState("");

  function chooseProfile(value: string) {
    setProfile(value);
    const selected = uploadProfiles.find((item) => item.value === value);
    if (selected) {
      setExtensionsText(selected.extensions.join(", "));
      setMaxMb(selected.maxMb);
    }
  }

  async function inspect(selected: File | null) {
    setFile(selected);
    setDimensions("");
    setError("");
    if (!selected || !selected.type.startsWith("image/")) return;
    try {
      const image = await loadLocalImage(selected);
      setDimensions(`${image.naturalWidth} × ${image.naturalHeight} px`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read the image.");
    }
  }

  const allowed = extensionsText.split(",").map((extension) => extension.trim().replace(/^\./, "").toLowerCase()).filter(Boolean);
  const fileExtension = file?.name.split(".").pop()?.toLowerCase() ?? "";
  const extensionOkay = file !== null && allowed.includes(fileExtension);
  const sizeOkay = file !== null && file.size <= maxMb * 1024 * 1024;

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <SelectField label="Portal reference profile" value={profile} onChange={chooseProfile} options={uploadProfiles.map(({ value, label }) => ({ value, label }))} />
        <div className="tool-field"><span>Accepted extensions (comma separated)</span><input className="tool-input" value={extensionsText} onChange={(event) => { setProfile("custom"); setExtensionsText(event.currentTarget.value); }} /></div>
        <NumberField label="Maximum file size (MB)" value={maxMb} onChange={(value) => { setProfile("custom"); setMaxMb(value); }} min={0.01} max={10000} step={0.1} />
        <FileField label="Choose a file (checked locally)" onChange={(selected) => { void inspect(selected); }} />
      </FieldGrid>
      {file && <ToolResult>
        <p><strong>{file.name}</strong> · {formatBytes(file.size)}{dimensions ? ` · ${dimensions}` : ""}</p>
        <ul className="tool-check-list">
          <li>{extensionOkay ? `File extension .${fileExtension} is on the accepted list.` : `File extension .${fileExtension || "(none)"} is not on the accepted list: ${allowed.map((extension) => `.${extension}`).join(", ") || "none configured"}.`}</li>
          <li>{sizeOkay ? `File is within the ${maxMb} MB size limit.` : `File exceeds the ${maxMb} MB size limit.`}</li>
          <li>File detected as {file.type || "unknown MIME type"}.</li>
        </ul>
        {error && <p role="alert">{error}</p>}
      </ToolResult>}
      <p className="tool-muted">Profiles are editable examples, not current requirements for a specific exam, visa, or portal. Always confirm the portal&apos;s own instructions.</p>
    </div>
  );
}

function PassportPhotoSheetMaker() {
  const [profile, setProfile] = useState("uk-35x45");
  const [copies, setCopies] = useState(6);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function makeSheet() {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const image = await loadLocalImage(file);
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1800;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The browser could not create the print sheet.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const size = getPhotoSize(profile, 0, 0);
      const margin = 60;
      const gap = 24;
      const columns = Math.floor((canvas.width - 2 * margin + gap) / (size.width + gap));
      const rows = Math.floor((canvas.height - 2 * margin + gap) / (size.height + gap));
      if (columns * rows < copies) throw new Error(`This photo size fits up to ${columns * rows} copies on a 4 × 6 inch sheet.`);
      const cropRatio = size.width / size.height;
      const imageRatio = image.naturalWidth / image.naturalHeight;
      let sx = 0;
      let sy = 0;
      let sw = image.naturalWidth;
      let sh = image.naturalHeight;
      if (imageRatio > cropRatio) {
        sw = image.naturalHeight * cropRatio;
        sx = (image.naturalWidth - sw) / 2;
      } else {
        sh = image.naturalWidth / cropRatio;
        sy = (image.naturalHeight - sh) / 2;
      }
      for (let index = 0; index < copies; index += 1) {
        const x = margin + (index % columns) * (size.width + gap);
        const y = margin + Math.floor(index / columns) * (size.height + gap);
        context.drawImage(image, sx, sy, sw, sh, x, y, size.width, size.height);
        context.strokeStyle = "#9ca3af";
        context.lineWidth = 2;
        context.strokeRect(x, y, size.width, size.height);
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          setError("The browser could not export the print sheet.");
          setBusy(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setBusy(false);
      }, "image/png");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The photo sheet could not be created.");
      setBusy(false);
    }
  }

  return (
    <div className="tool-content-grid new-tool-grid">
      <FieldGrid>
        <FileField label="Portrait photo (processed locally)" accept="image/*" onChange={(selected) => { setFile(selected); setPreviewUrl(""); setError(""); }} />
        <SelectField label="Photo crop size" value={profile} onChange={setProfile} options={profileOptions.filter((option) => option.value !== "custom")} />
        <NumberField label="Number of copies" value={copies} onChange={setCopies} min={1} max={24} step={1} />
      </FieldGrid>
      <ToolActions>
        <ToolButton onClick={() => { void makeSheet(); }} disabled={!file || busy}>{busy ? "Creating sheet..." : "Create 4 × 6 sheet"}</ToolButton>
        {previewUrl && <ToolButton secondary onClick={() => fetch(previewUrl).then((response) => response.blob()).then((blob) => downloadBlob("passport-photo-sheet.png", blob))}>Download PNG</ToolButton>}
      </ToolActions>
      {error && <ToolResult><p role="alert">{error}</p></ToolResult>}
      {previewUrl && <div className="tool-image-preview"><Image src={previewUrl} width={1200} height={1800} unoptimized alt="Generated passport photo print sheet" /></div>}
      <p className="tool-muted">The 1200 × 1800 px sheet represents 4 × 6 inches at 300 dpi. Print at actual size, not &quot;fit to page,&quot; and measure one photo before using the sheet.</p>
    </div>
  );
}

export default function FormTools({ kind }: { kind: FormKind }) {
  if (kind === "visa-photo-checker") return <VisaPhotoChecker />;
  if (kind === "upload-readiness-checker") return <UploadReadinessChecker />;
  return <PassportPhotoSheetMaker />;
}
