"use client";

import { useRef, useState, type ChangeEvent, type PointerEvent } from "react";

type ToolKind =
  | "offline-image-redactor"
  | "local-only-password-generator"
  | "jwt-decoder"
  | "french-drain-gravel-calculator"
  | "epoxy-floor-coating-calculator"
  | "stair-carpet-calculator"
  | "pattern-aware-tile-calculator"
  | "photo-to-coloring-page-converter"
  | "llm-token-cost-calculator"
  | "freelancer-scope-guard"
  | "board-feet-calculator"
  | "exotic-pet-nutrition-calculator"
  | "calligraphy-practice-sheet-generator";

type Task = { id: number; text: string; done: boolean };
type MealEntry = { id: number; amount: number; time: string; food: string };

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function secureIndex(limit: number) {
  const range = 0x100000000;
  const threshold = Math.floor(range / limit) * limit;
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= threshold);
  return value[0] % limit;
}

const fieldStyle = {
  display: "grid",
  gap: "0.4rem",
  marginBottom: 0,
} as const;

const resultStyle = {
  background: "#FFF7F2",
  border: "1px solid #FED7C3",
  borderRadius: "12px",
  padding: "1rem",
  marginTop: "1rem",
} as const;

function downloadCanvas(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = "any",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
}) {
  return (
    <label className="tool-field" style={fieldStyle}>
      <span>{label}</span>
      <input
        className="tool-input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next) && next >= min && (max === undefined || next <= max)) {
            onChange(next);
          }
        }}
      />
    </label>
  );
}

function Result({ children }: { children: React.ReactNode }) {
  return <div className="tool-result" style={resultStyle} aria-live="polite">{children}</div>;
}

export default function InteractiveTool({ kind }: { kind: ToolKind }) {
  const toolNames: Record<ToolKind, string> = {
    "offline-image-redactor": "Image redaction studio",
    "local-only-password-generator": "Password builder",
    "jwt-decoder": "Token inspector",
    "french-drain-gravel-calculator": "Gravel estimator",
    "epoxy-floor-coating-calculator": "Coating estimator",
    "stair-carpet-calculator": "Stair carpet planner",
    "pattern-aware-tile-calculator": "Tile layout estimator",
    "photo-to-coloring-page-converter": "Coloring page studio",
    "llm-token-cost-calculator": "AI cost planner",
    "freelancer-scope-guard": "Project scope checklist",
    "board-feet-calculator": "Lumber estimator",
    "exotic-pet-nutrition-calculator": "Feeding tracker",
    "calligraphy-practice-sheet-generator": "Practice sheet designer",
  };
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [password, setPassword] = useState("");
  const [copyError, setCopyError] = useState("");
  const [copyLinkMessage, setCopyLinkMessage] = useState("");
  const [jwt, setJwt] = useState("");
  const [jwtResult, setJwtResult] = useState("");
  const [jwtHeader, setJwtHeader] = useState("");
  const [jwtExpiry, setJwtExpiry] = useState("");
  const [jwtError, setJwtError] = useState("");
  const [imageName, setImageName] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [brushSize, setBrushSize] = useState(28);
  const redactorCanvas = useRef<HTMLCanvasElement>(null);
  const photoCanvas = useRef<HTMLCanvasElement>(null);
  const photoSource = useRef<ImageData | null>(null);
  const redactorDrawing = useRef(false);
  const [redactorReady, setRedactorReady] = useState(false);
  const redactorSource = useRef<ImageData | null>(null);
  const redactorHistory = useRef<ImageData[]>([]);
  const nextTaskId = useRef(0);
  const nextMealId = useRef(0);
  const [redactorHistoryCount, setRedactorHistoryCount] = useState(0);
  const [photoThreshold, setPhotoThreshold] = useState(34);
  const [photoReady, setPhotoReady] = useState(false);
  const [roomLength, setRoomLength] = useState(20);
  const [roomWidth, setRoomWidth] = useState(kind === "french-drain-gravel-calculator" ? 1.5 : 12);
  const [trenchDepth, setTrenchDepth] = useState(1);
  const [gravelLayer, setGravelLayer] = useState(0.75);
  const [gravelWaste, setGravelWaste] = useState(10);
  const [gravelBagSize, setGravelBagSize] = useState(0.5);
  const [coats, setCoats] = useState(2);
  const [coverage, setCoverage] = useState(250);
  const [coatingWaste, setCoatingWaste] = useState(10);
  const [stairs, setStairs] = useState(12);
  const [tread, setTread] = useState(10);
  const [riser, setRiser] = useState(7.5);
  const [stairWidth, setStairWidth] = useState(36);
  const [landingRunIn, setLandingRunIn] = useState(0);
  const [waste, setWaste] = useState(10);
  const [tileLength, setTileLength] = useState(12);
  const [tileWidth, setTileWidth] = useState(12);
  const [tilePattern, setTilePattern] = useState("straight");
  const [tileCostPerBox, setTileCostPerBox] = useState(0);
  const [tileCoveragePerBox, setTileCoveragePerBox] = useState(10);
  const [promptChars, setPromptChars] = useState(4000);
  const [outputChars, setOutputChars] = useState(2000);
  const [inputRate, setInputRate] = useState(3);
  const [outputRate, setOutputRate] = useState(15);
  const [monthlyRequests, setMonthlyRequests] = useState(100);
  const [taskInput, setTaskInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boardThickness, setBoardThickness] = useState(1);
  const [boardWidth, setBoardWidth] = useState(6);
  const [boardLength, setBoardLength] = useState(8);
  const [boardCount, setBoardCount] = useState(1);
  const [boardPricePerFoot, setBoardPricePerFoot] = useState(0);
  const [boardWaste, setBoardWaste] = useState(10);
  const [vetTarget, setVetTarget] = useState(0);
  const [fedAmount, setFedAmount] = useState(0);
  const [mealFood, setMealFood] = useState("");
  const [mealLog, setMealLog] = useState<MealEntry[]>([]);
  const [lineSpacing, setLineSpacing] = useState(32);
  const [slant, setSlant] = useState(55);
  const [pageSize, setPageSize] = useState<"letter" | "a4">("letter");
  const [copied, setCopied] = useState(false);
  const [invertPhoto, setInvertPhoto] = useState(false);

  const uploadImage = (event: ChangeEvent<HTMLInputElement>, mode: "redact" | "photo") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (mode === "photo") setPhotoReady(false);
    if (!file.type.startsWith("image/")) {
      setImageName("Please choose an image file.");
      return;
    }
    const target = mode === "redact" ? redactorCanvas.current : photoCanvas.current;
    if (!target) return;
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      target.width = Math.max(1, Math.round(image.naturalWidth * scale));
      target.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = target.getContext("2d", { willReadFrequently: true });
      context?.drawImage(image, 0, 0, target.width, target.height);
      if (mode === "redact" && context) {
        redactorSource.current = context.getImageData(0, 0, target.width, target.height);
        redactorHistory.current = [];
        setRedactorHistoryCount(0);
      }
      if (mode === "photo" && context) {
        photoSource.current = context.getImageData(0, 0, target.width, target.height);
      }
      URL.revokeObjectURL(objectUrl);
      setImageName(file.name);
      if (mode === "photo") setPhotoReady(true);
      else setRedactorReady(true);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setImageName("The selected image could not be opened.");
      if (mode === "photo") setPhotoReady(false);
      else setRedactorReady(false);
    };
    image.src = objectUrl;
  };

  const redactAtPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!redactorDrawing.current) return;
    const canvas = redactorCanvas.current;
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

  const convertPhoto = () => {
    const canvas = photoCanvas.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context || !photoReady) return;
    const sourceFrame = photoSource.current;
    if (!sourceFrame) return;
    const frame = new ImageData(
      new Uint8ClampedArray(sourceFrame.data),
      sourceFrame.width,
      sourceFrame.height,
    );
    const source = new Uint8ClampedArray(frame.data);
    const luminance = (x: number, y: number) => {
      const offset = (y * canvas.width + x) * 4;
      return 0.299 * source[offset] + 0.587 * source[offset + 1] + 0.114 * source[offset + 2];
    };
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const edge = Math.abs(luminance(Math.min(canvas.width - 1, x + 1), y) - luminance(Math.max(0, x - 1), y))
          + Math.abs(luminance(x, Math.min(canvas.height - 1, y + 1)) - luminance(x, Math.max(0, y - 1)));
        const shade = (edge > photoThreshold ? 0 : 255) * (invertPhoto ? -1 : 1)
          + (invertPhoto ? 255 : 0);
        const offset = (y * canvas.width + x) * 4;
        frame.data[offset] = shade;
        frame.data[offset + 1] = shade;
        frame.data[offset + 2] = shade;
        frame.data[offset + 3] = 255;
      }
    }
    context.putImageData(frame, 0, 0);
  };

  const generatePassword = () => {
    const ambiguous = /[O0Il1]/g;
    const groups = [
      useUpper ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "",
      useLower ? "abcdefghijklmnopqrstuvwxyz" : "",
      useNumbers ? "0123456789" : "",
      useSymbols ? "!@#$%^&*()-_=+[]{}?" : "",
    ]
      .map((group) => (excludeAmbiguous ? group.replace(ambiguous, "") : group))
      .filter(Boolean);
    if (!groups.length) {
      setPassword("Select at least one character type.");
      return;
    }
    const alphabet = groups.join("");
    const chars = groups.map((group) => group[secureIndex(group.length)]);
    for (let i = chars.length; i < length; i++) chars.push(alphabet[secureIndex(alphabet.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = secureIndex(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    setPassword(chars.join(""));
  };

  const resetTool = () => {
    setLength(16);
    setUseUpper(true);
    setUseLower(true);
    setUseNumbers(true);
    setUseSymbols(false);
    setExcludeAmbiguous(true);
    setPassword("");
    setCopyError("");
    setJwt("");
    setJwtResult("");
    setJwtHeader("");
    setJwtExpiry("");
    setJwtError("");
    setImageName("");
    setFileInputKey((current) => current + 1);
    setBrushSize(28);
    setPhotoThreshold(34);
    setInvertPhoto(false);
    setRedactorReady(false);
    setPhotoReady(false);
    redactorSource.current = null;
    redactorHistory.current = [];
    photoSource.current = null;
    setRedactorHistoryCount(0);
    if (redactorCanvas.current) {
      redactorCanvas.current.width = 0;
      redactorCanvas.current.height = 0;
    }
    if (photoCanvas.current) {
      photoCanvas.current.width = 0;
      photoCanvas.current.height = 0;
    }
    setRoomLength(20);
    setRoomWidth(kind === "french-drain-gravel-calculator" ? 1.5 : 12);
    setTrenchDepth(1);
    setGravelLayer(0.75);
    setGravelWaste(10);
    setGravelBagSize(0.5);
    setCoats(2);
    setCoverage(250);
    setCoatingWaste(10);
    setStairs(12);
    setTread(10);
    setRiser(7.5);
    setStairWidth(36);
    setLandingRunIn(0);
    setWaste(10);
    setTileLength(12);
    setTileWidth(12);
    setTilePattern("straight");
    setTileCostPerBox(0);
    setTileCoveragePerBox(10);
    setPromptChars(4000);
    setOutputChars(2000);
    setInputRate(3);
    setOutputRate(15);
    setMonthlyRequests(100);
    setTaskInput("");
    setTasks([]);
    setBoardThickness(1);
    setBoardWidth(6);
    setBoardLength(8);
    setBoardCount(1);
    setBoardPricePerFoot(0);
    setBoardWaste(10);
    setVetTarget(0);
    setFedAmount(0);
    setMealFood("");
    setMealLog([]);
    setLineSpacing(32);
    setSlant(55);
    setPageSize("letter");
    setCopied(false);
    setCopyLinkMessage("");
  };

  const copyToolLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLinkMessage("Link copied");
      window.setTimeout(() => setCopyLinkMessage(""), 1800);
    } catch {
      setCopyLinkMessage("Copy is unavailable in this browser");
    }
  };

  const startRedaction = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = redactorCanvas.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      redactorHistory.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
      if (redactorHistory.current.length > 3) redactorHistory.current.shift();
      setRedactorHistoryCount(redactorHistory.current.length);
    }
    redactorDrawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    redactAtPointer(event);
  };

  const undoRedaction = () => {
    const canvas = redactorCanvas.current;
    const context = canvas?.getContext("2d");
    const previous = redactorHistory.current.pop();
    if (!canvas || !context || !previous) return;
    context.putImageData(previous, 0, 0);
    setRedactorHistoryCount(redactorHistory.current.length);
  };

  const clearRedactions = () => {
    const canvas = redactorCanvas.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !redactorSource.current) return;
    context.putImageData(redactorSource.current, 0, 0);
    redactorHistory.current = [];
    setRedactorHistoryCount(0);
  };

  const addMeal = () => {
    if (fedAmount <= 0) return;
    setMealLog((current) => [
      ...current,
      {
        id: nextMealId.current++,
        amount: fedAmount,
        time: new Date().toLocaleTimeString(),
        food: mealFood.trim(),
      },
    ]);
    setFedAmount(0);
    setMealFood("");
  };

  const exportMealLog = () => {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ["Time", "Food", "Amount (g)"].join(","),
      ...mealLog.map((meal) => [
        escapeCsv(meal.time),
        escapeCsv(meal.food),
        meal.amount.toFixed(1),
      ].join(",")),
    ];
    const url = URL.createObjectURL(new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pet-feeding-log.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyPassword = async () => {
    if (!password || password.startsWith("Select ")) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError("Clipboard access is unavailable. Select and copy the password manually.");
    }
  };

  const decodeJwt = () => {
    try {
      const parts = jwt.trim().split(".");
      if (parts.length !== 3 || !parts[1]) throw new Error("Enter a three-part JWT.");
      const decodeSegment = (segment: string) => {
        const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
        const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
        if (!isJsonObject(parsed)) throw new Error("JWT header and payload must be JSON objects.");
        return parsed;
      };
      const header = decodeSegment(parts[0]);
      const payload = decodeSegment(parts[1]);
      setJwtHeader(JSON.stringify(header, null, 2));
      setJwtResult(JSON.stringify(payload, null, 2));
      const expiration = payload.exp;
      setJwtExpiry(
        typeof expiration === "number" && Number.isFinite(expiration)
          ? expiration <= Date.now() / 1000
            ? `Expired ${new Date(expiration * 1000).toLocaleString()}`
            : `Expires ${new Date(expiration * 1000).toLocaleString()}`
          : "No numeric expiration (exp) claim",
      );
      setJwtError("");
    } catch (error) {
      setJwtHeader("");
      setJwtResult("");
      setJwtExpiry("");
      setJwtError(error instanceof Error ? error.message : "The token could not be decoded.");
    }
  };

  const addTask = () => {
    const text = taskInput.trim();
    if (!text) return;
    setTasks((current) => [...current, { id: nextTaskId.current++, text, done: false }]);
    setTaskInput("");
  };

  const exportScope = () => {
    const lines = [
      "Project scope checklist",
      `Created: ${new Date().toLocaleDateString()}`,
      "",
      ...tasks.map((task) => `${task.done ? "[x]" : "[ ]"} ${task.text}`),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "project-scope-checklist.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadCalligraphy = () => {
    const width = pageSize === "letter" ? 816 : 794;
    const height = pageSize === "letter" ? 1056 : 1123;
    const lines = Array.from({ length: Math.floor((height - 100) / lineSpacing) }, (_, index) => {
      const y = 50 + (index + 1) * lineSpacing;
      return `<line x1="40" y1="${y}" x2="${width - 40}" y2="${y}" stroke="#cbd5e1" stroke-width="1"/><line x1="40" y1="${y - lineSpacing / 3}" x2="${width - 40}" y2="${y - lineSpacing / 3}" stroke="#e2e8f0" stroke-width="1"/>`;
    }).join("");
    const slantLines = Array.from({ length: Math.ceil(width / 34) }, (_, index) => {
      const x = index * 34;
      return `<line x1="${x}" y1="0" x2="${x + height / Math.tan((slant * Math.PI) / 180)}" y2="${height}" stroke="#f1f5f9" stroke-width="1"/>`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>${slantLines}${lines}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "calligraphy-practice-sheet.svg";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const passwordOptions: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }[] = [
    { label: "Uppercase", checked: useUpper, onChange: setUseUpper },
    { label: "Lowercase", checked: useLower, onChange: setUseLower },
    { label: "Numbers", checked: useNumbers, onChange: setUseNumbers },
    { label: "Symbols", checked: useSymbols, onChange: setUseSymbols },
  ];

  let content: React.ReactNode;

  switch (kind) {
    case "offline-image-redactor":
      content = (
        <>
          <label className="tool-field" style={fieldStyle}>Choose image<input key={fileInputKey} className="tool-input" type="file" accept="image/*" onChange={(event) => { setRedactorReady(false); uploadImage(event, "redact"); }} /></label>
          <NumberField label="Redaction brush size (px)" value={brushSize} min={4} onChange={setBrushSize} />
          {imageName && <p>{imageName}</p>}
          {!redactorReady && <p className="tool-empty-state">Choose an image to start masking sensitive areas.</p>}
          <canvas ref={redactorCanvas} onPointerDown={startRedaction} onPointerMove={redactAtPointer} onPointerUp={() => { redactorDrawing.current = false; }} onPointerCancel={() => { redactorDrawing.current = false; }} className="tool-canvas-preview" style={{ display: redactorReady ? "block" : "none", touchAction: "none" }} />
          <p>Drag across sensitive areas to cover them with an opaque mask. The source image is processed locally in this browser.</p>
          <div className="tool-action-row">
            <button type="button" className="tool-secondary-button" onClick={undoRedaction} disabled={redactorHistoryCount === 0}>Undo stroke</button>
            <button type="button" className="tool-secondary-button" onClick={clearRedactions} disabled={!redactorReady || redactorHistoryCount === 0}>Clear masks</button>
          </div>
          <button type="button" className="btn" onClick={() => downloadCanvas(redactorCanvas.current, "redacted-image.png")} disabled={!redactorReady}>Download redacted PNG</button>
        </>
      );
      break;
    case "local-only-password-generator":
      {
      const characterPoolSize =
        (useUpper ? (excludeAmbiguous ? 24 : 26) : 0)
        + (useLower ? (excludeAmbiguous ? 25 : 26) : 0)
        + (useNumbers ? (excludeAmbiguous ? 8 : 10) : 0)
        + (useSymbols ? 19 : 0);
      const estimatedEntropy = characterPoolSize > 0 ? length * Math.log2(characterPoolSize) : 0;
      const strength = estimatedEntropy < 40 ? "Basic" : estimatedEntropy < 70 ? "Fair" : estimatedEntropy < 100 ? "Strong" : "Very strong";
      content = (
        <>
          <NumberField label="Password length (8–128)" value={length} min={8} onChange={(value) => setLength(Math.min(128, Math.max(8, Math.floor(value))))} />
          <div className="tool-inline-options" aria-label="Common password lengths">
            {[12, 16, 24, 32].map((preset) => <button key={preset} type="button" className="tool-secondary-button" onClick={() => setLength(preset)}>{preset} characters</button>)}
          </div>
          <div className="tool-inline-options">
            {passwordOptions.map(({ checked, onChange, label }) => (
              <label key={label}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /> {label}</label>
            ))}
            <label><input type="checkbox" checked={excludeAmbiguous} onChange={(event) => setExcludeAmbiguous(event.target.checked)} /> Exclude look-alike characters</label>
          </div>
          <button type="button" className="btn" onClick={generatePassword}>Generate password</button>
          {password && <Result><code style={{ overflowWrap: "anywhere" }}>{password}</code><p><button type="button" className="btn" onClick={copyPassword}>{copied ? "Copied" : "Copy"}</button></p>{copyError && <p role="alert">{copyError}</p>}</Result>}
          <div className="tool-strength" role="meter" aria-label="Estimated password strength" aria-valuemin={0} aria-valuemax={128} aria-valuenow={Math.min(128, Math.round(estimatedEntropy))}>
            <div className="tool-strength-track"><span style={{ width: `${Math.min(100, estimatedEntropy / 1.28)}%` }} /></div>
            <span>{strength} · estimated {Math.round(estimatedEntropy)} bits</span>
          </div>
          <p>Generated locally using the browser cryptography API. For important accounts, save the password in a trusted password manager.</p>
        </>
      );
      break;
      }
    case "jwt-decoder":
      content = (
        <>
          <label className="tool-field" style={fieldStyle}>JWT<textarea className="tool-input" rows={4} value={jwt} onChange={(event) => setJwt(event.target.value)} placeholder="Paste a three-part token" /></label>
          <button type="button" className="btn" onClick={decodeJwt}>Decode payload</button>
          {jwtError && <p role="alert">{jwtError}</p>}
          {jwtExpiry && <Result><strong>Expiration:</strong> {jwtExpiry}</Result>}
          {jwtHeader && <Result><strong>Header</strong><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{jwtHeader}</pre></Result>}
          {jwtResult && <Result><strong>Payload</strong><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{jwtResult}</pre></Result>}
          <p>Decoding does not verify the signature or establish trust. Do not paste production secrets into a shared device.</p>
        </>
      );
      break;
    case "french-drain-gravel-calculator": {
      const volumeFt3 = roomLength * roomWidth * gravelLayer;
      const orderVolume = volumeFt3 * (1 + gravelWaste / 100);
      const volumeYd3 = orderVolume / 27;
      const bagCount = Math.ceil(orderVolume / gravelBagSize);
      content = (
        <>
          <NumberField label="Trench length (ft)" value={roomLength} min={0.01} onChange={setRoomLength} />
          <NumberField label="Trench width (ft)" value={roomWidth} min={0.01} onChange={setRoomWidth} />
          <NumberField label="Trench depth (ft)" value={trenchDepth} min={0.01} onChange={setTrenchDepth} />
          <NumberField label="Gravel layer depth (ft)" value={gravelLayer} min={0.01} max={trenchDepth} onChange={setGravelLayer} />
          <NumberField label="Extra material allowance (%)" value={gravelWaste} max={100} onChange={setGravelWaste} />
          <NumberField label="Bag size (cu ft)" value={gravelBagSize} min={0.1} onChange={setGravelBagSize} />
          {gravelLayer <= trenchDepth
            ? <Result><strong>Order estimate:</strong> {orderVolume.toFixed(2)} ft³ ({volumeYd3.toFixed(2)} yd³), or about {bagCount} bags at the selected size. Raw layer volume: {volumeFt3.toFixed(2)} ft³.</Result>
            : <p role="alert">Gravel layer depth cannot exceed trench depth.</p>}
          <p>This geometric estimate does not account for compaction, pipe displacement, or site-specific drainage design.</p>
        </>
      );
      break;
    }
    case "epoxy-floor-coating-calculator": {
      const area = roomLength * roomWidth;
      const amount = coverage > 0 ? (area * coats * (1 + coatingWaste / 100)) / coverage : 0;
      content = (
        <>
          <NumberField label="Floor length (ft)" value={roomLength} min={0.01} onChange={setRoomLength} />
          <NumberField label="Floor width (ft)" value={roomWidth} min={0.01} onChange={setRoomWidth} />
          <NumberField label="Number of coats" value={coats} min={1} onChange={(value) => setCoats(Math.max(1, Math.floor(value)))} />
          <NumberField label="Coverage per gallon (sq ft)" value={coverage} min={1} onChange={setCoverage} />
          <NumberField label="Extra material allowance (%)" value={coatingWaste} max={100} onChange={setCoatingWaste} />
          <Result><strong>Area:</strong> {area.toFixed(1)} sq ft. Approximate product: {amount.toFixed(2)} gallons ({Math.ceil(amount)} whole gallons), including the entered allowance.</Result>
          <p>Use the actual product label coverage; porous or rough surfaces may need more material.</p>
        </>
      );
      break;
    }
    case "stair-carpet-calculator": {
      const runIn = stairs * (tread + riser) + landingRunIn;
      const areaSqFt = (runIn * stairWidth) / 144;
      const adjustedSqFt = areaSqFt * (1 + waste / 100);
      content = (
        <>
          <NumberField label="Number of steps" value={stairs} min={1} onChange={(value) => setStairs(Math.max(1, Math.floor(value)))} />
          <NumberField label="Tread depth (in)" value={tread} min={0.1} onChange={setTread} />
          <NumberField label="Riser height (in)" value={riser} min={0.1} onChange={setRiser} />
          <NumberField label="Combined landing run (in)" value={landingRunIn} onChange={setLandingRunIn} />
          <NumberField label="Carpet width (in)" value={stairWidth} min={0.1} onChange={setStairWidth} />
          <NumberField label="Waste allowance (%)" value={waste} max={100} onChange={setWaste} />
          <Result><strong>Estimated carpet:</strong> {adjustedSqFt.toFixed(2)} sq ft ({(runIn * (1 + waste / 100) / 12).toFixed(2)} linear ft at the entered width).</Result>
          <p>Landings, turns, pattern matching, nosing, and installation methods can add material; confirm measurements before ordering.</p>
        </>
      );
      break;
    }
    case "pattern-aware-tile-calculator": {
      const roomArea = roomLength * roomWidth;
      const tileArea = (tileLength * tileWidth) / 144;
      const patternWaste = tilePattern === "offset" ? 0.1 : tilePattern === "diagonal" ? 0.15 : 0;
      const orderArea = roomArea * (1 + waste / 100 + patternWaste);
      const tileCount = tileArea > 0 ? Math.ceil(orderArea / tileArea) : 0;
      const boxCount = tileCoveragePerBox > 0 ? Math.ceil(orderArea / tileCoveragePerBox) : 0;
      content = (
        <>
          <NumberField label="Room length (ft)" value={roomLength} min={0.01} onChange={setRoomLength} />
          <NumberField label="Room width (ft)" value={roomWidth} min={0.01} onChange={setRoomWidth} />
          <NumberField label="Tile length (in)" value={tileLength} min={0.01} onChange={setTileLength} />
          <NumberField label="Tile width (in)" value={tileWidth} min={0.01} onChange={setTileWidth} />
          <label className="tool-field" style={fieldStyle}>Layout pattern<select className="tool-input" value={tilePattern} onChange={(event) => setTilePattern(event.target.value)}><option value="straight">Straight grid</option><option value="offset">Offset / staggered (+10% allowance)</option><option value="diagonal">Diagonal (+15% allowance)</option></select></label>
          <NumberField label="Additional waste (%)" value={waste} max={100} onChange={setWaste} />
          <NumberField label="Coverage per box (sq ft)" value={tileCoveragePerBox} min={0.1} onChange={setTileCoveragePerBox} />
          <NumberField label="Price per box ($, optional)" value={tileCostPerBox} onChange={setTileCostPerBox} />
          <Result><strong>Estimate:</strong> {tileCount} tiles or {boxCount} boxes for {orderArea.toFixed(1)} sq ft including allowances. {tileCostPerBox > 0 && <>Approximate tile cost: <strong>${(boxCount * tileCostPerBox).toFixed(2)}</strong>.</>}</Result>
          <p>This is an area-based estimate; unusual layouts and border details may require a tile-by-tile plan.</p>
        </>
      );
      break;
    }
    case "photo-to-coloring-page-converter":
      content = (
        <>
          <label className="tool-field" style={fieldStyle}>Choose image<input key={fileInputKey} className="tool-input" type="file" accept="image/*" onChange={(event) => uploadImage(event, "photo")} /></label>
          <NumberField label="Outline sensitivity (lower creates more lines)" value={photoThreshold} min={1} onChange={setPhotoThreshold} />
          <label className="tool-check"><input type="checkbox" checked={invertPhoto} onChange={(event) => setInvertPhoto(event.target.checked)} /> Invert outline colors</label>
          <button type="button" className="btn" onClick={convertPhoto} disabled={!photoReady}>Create coloring page</button>
          {imageName && <p>{imageName}</p>}
          {!photoReady && <p className="tool-empty-state">Choose an image to preview your coloring page.</p>}
          <canvas ref={photoCanvas} className="tool-canvas-preview" style={{ display: photoReady ? "block" : "none" }} />
          <p>Try a clear, high-contrast photo. Image processing happens in this browser.</p>
          <button type="button" className="btn" onClick={() => downloadCanvas(photoCanvas.current, "coloring-page.png")} disabled={!photoReady}>Download PNG</button>
        </>
      );
      break;
    case "llm-token-cost-calculator": {
      const estimatedInputTokens = Math.ceil(promptChars / 4);
      const estimatedOutputTokens = Math.ceil(outputChars / 4);
      const estimatedCost = (estimatedInputTokens * inputRate + estimatedOutputTokens * outputRate) / 1_000_000;
      content = (
        <>
          <NumberField label="Prompt size (characters)" value={promptChars} onChange={setPromptChars} />
          <NumberField label="Expected response (characters)" value={outputChars} onChange={setOutputChars} />
          <NumberField label="Input price per 1M tokens ($)" value={inputRate} onChange={setInputRate} />
          <NumberField label="Output price per 1M tokens ($)" value={outputRate} onChange={setOutputRate} />
          <NumberField label="Expected requests per month" value={monthlyRequests} min={1} onChange={(value) => setMonthlyRequests(Math.floor(value))} />
          <Result>Estimated tokens per request: {estimatedInputTokens.toLocaleString()} input + {estimatedOutputTokens.toLocaleString()} output. Approximate request cost: <strong>${estimatedCost.toFixed(6)}</strong>. At {monthlyRequests.toLocaleString()} requests/month: <strong>${(estimatedCost * monthlyRequests).toFixed(2)}/month</strong>.</Result>
          <p>Token counts are approximated as four characters per token. Replace the sample rates with your provider&apos;s current prices.</p>
        </>
      );
      break;
    }
    case "freelancer-scope-guard":
      content = (
        <>
          <label className="tool-field" style={fieldStyle}>Deliverable or change request<input className="tool-input" value={taskInput} onChange={(event) => setTaskInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTask(); }} placeholder="e.g. Homepage wireframe, two revision rounds" /></label>
          <button type="button" className="btn" onClick={addTask}>Add to scope checklist</button>
          {tasks.length > 0 ? <div style={{ marginTop: "1rem" }}>
            <p>{tasks.filter((task) => task.done).length} of {tasks.length} items confirmed</p>
            <button type="button" className="tool-secondary-button" onClick={exportScope}>Export checklist</button>
            <ul>{tasks.map((task) => <li key={task.id} style={{ marginBottom: "0.75rem" }}><label><input type="checkbox" checked={task.done} onChange={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} /> <span style={{ textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span></label> <button type="button" onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))}>Remove</button></li>)}</ul>
          </div> : <p>Add deliverables, exclusions, or requested changes to make the scope visible.</p>}
          <p>Your checklist stays in this page session and is not saved to an account.</p>
        </>
      );
      break;
    case "board-feet-calculator": {
      const boardFeet = (boardThickness * boardWidth * boardLength * boardCount) / 12;
      const totalWithWaste = boardFeet * (1 + boardWaste / 100);
      const materialCost = totalWithWaste * boardPricePerFoot;
      content = (
        <>
          <NumberField label="Thickness (in)" value={boardThickness} min={0.01} onChange={setBoardThickness} />
          <NumberField label="Width (in)" value={boardWidth} min={0.01} onChange={setBoardWidth} />
          <NumberField label="Length (ft)" value={boardLength} min={0.01} onChange={setBoardLength} />
          <NumberField label="Quantity" value={boardCount} min={1} onChange={(value) => setBoardCount(Math.max(1, Math.floor(value)))} />
          <NumberField label="Waste allowance (%)" value={boardWaste} max={100} onChange={setBoardWaste} />
          <NumberField label="Price per board foot ($, optional)" value={boardPricePerFoot} onChange={setBoardPricePerFoot} />
          <Result><strong>{boardFeet.toFixed(2)} board feet</strong> measured; plan for about {totalWithWaste.toFixed(2)} board feet with the waste allowance. {boardPricePerFoot > 0 && <>Estimated material cost: <strong>${materialCost.toFixed(2)}</strong>.</>}</Result>
          <p>The estimate uses actual dimensions. Lumber is often sold by nominal sizes, so confirm the supplier&apos;s pricing basis.</p>
        </>
      );
      break;
    }
    case "exotic-pet-nutrition-calculator": {
      const loggedAmount = mealLog.reduce((total, meal) => total + meal.amount, 0);
      const difference = vetTarget - loggedAmount;
      const progress = vetTarget > 0 ? (loggedAmount / vetTarget) * 100 : 0;
      content = (
        <>
          <NumberField label="Daily amount recommended by your veterinarian (g)" value={vetTarget} min={0.01} onChange={setVetTarget} />
          <label className="tool-field" style={fieldStyle}>Food item or note (optional)<input className="tool-input" value={mealFood} onChange={(event) => setMealFood(event.target.value)} placeholder="e.g. pellets, greens, supplement" /></label>
          <NumberField label="Amount in this meal (g)" value={fedAmount} min={0.01} onChange={setFedAmount} />
          <button type="button" className="btn" onClick={addMeal} disabled={fedAmount <= 0}>Log meal</button>
          {vetTarget > 0
            ? <Result>Today&apos;s logged amount: <strong>{loggedAmount.toFixed(1)} g</strong> ({Math.max(0, progress).toFixed(0)}% of the entered target). {difference >= 0 ? `${difference.toFixed(1)} g remaining` : `${Math.abs(difference).toFixed(1)} g over target`}.</Result>
            : <Result>Today&apos;s logged amount: <strong>{loggedAmount.toFixed(1)} g</strong>. Enter a feeding target from your veterinarian to see a comparison.</Result>}
          {vetTarget > 0 && <div className="tool-progress" role="progressbar" aria-label="Amount logged toward daily target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, progress))}><span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>}
          {mealLog.length > 0 && <div className="tool-meal-log">
            <div className="tool-log-heading"><strong>Today&apos;s meal log</strong><div className="tool-inline-options"><button type="button" className="tool-secondary-button" onClick={exportMealLog}>Export CSV</button><button type="button" className="tool-secondary-button" onClick={() => setMealLog([])}>Clear log</button></div></div>
            <ul>{mealLog.map((meal) => <li key={meal.id}><span className="tool-meal-detail"><strong>{meal.food || "Meal"}</strong><small>{meal.time}</small></span><strong>{meal.amount.toFixed(1)} g</strong><button type="button" className="tool-remove-button" aria-label={`Remove ${meal.amount} gram meal`} onClick={() => setMealLog((current) => current.filter((entry) => entry.id !== meal.id))}>Remove</button></li>)}</ul>
          </div>}
          <p>This is a tracking aid only. It does not calculate dietary needs or recommend portions; species-specific nutrition should be discussed with an exotic-animal veterinarian.</p>
        </>
      );
      break;
    }
    case "calligraphy-practice-sheet-generator": {
      const sheetWidth = pageSize === "letter" ? 816 : 794;
      const sheetHeight = pageSize === "letter" ? 1056 : 1123;
      const guides = Array.from({ length: Math.floor((sheetHeight - 100) / lineSpacing) }, (_, index) => {
        const y = 50 + (index + 1) * lineSpacing;
        return (
          <g key={`guide-${index}`}>
            <line x1="40" y1={y} x2={sheetWidth - 40} y2={y} />
            <line className="practice-midline" x1="40" y1={y - lineSpacing / 3} x2={sheetWidth - 40} y2={y - lineSpacing / 3} />
          </g>
        );
      });
      const slantGuides = Array.from({ length: Math.ceil(sheetWidth / 34) }, (_, index) => {
        const x = index * 34;
        return <line key={`slant-${index}`} className="practice-slant" x1={x} y1="0" x2={x + sheetHeight / Math.tan((slant * Math.PI) / 180)} y2={sheetHeight} />;
      });
      content = (
        <>
          <NumberField label="Guide line spacing (px)" value={lineSpacing} min={16} onChange={setLineSpacing} />
          <NumberField label="Slant guide angle (degrees)" value={slant} min={35} max={80} onChange={setSlant} />
          <label className="tool-field" style={fieldStyle}>Paper size<select className="tool-input" value={pageSize} onChange={(event) => setPageSize(event.target.value as "letter" | "a4")}><option value="letter">US Letter</option><option value="a4">A4</option></select></label>
          <svg className="calligraphy-sheet-preview" viewBox={`0 0 ${sheetWidth} ${sheetHeight}`} role="img" aria-label={`${pageSize === "letter" ? "US Letter" : "A4"} calligraphy practice sheet preview`}>
            <rect width={sheetWidth} height={sheetHeight} fill="#fff" />
            {slantGuides}
            <g className="practice-guides">{guides}</g>
          </svg>
          <button type="button" className="btn" onClick={downloadCalligraphy}>Download practice sheet</button>
          <p>The preview updates as you adjust it. Download the SVG for crisp printing at any scale.</p>
        </>
      );
      break;
    }
  }

  return (
    <section className="tool-interface" aria-label="Interactive tool">
      <header className="tool-workspace-header">
        <div>
          <p className="tool-workspace-kicker">DAILYTOOLS · BROWSER WORKSPACE</p>
          <h2 className="tool-workspace-title">{toolNames[kind]}</h2>
          <p className="tool-workspace-caption">Use the controls below to get a live result. Your entries stay in this page unless you choose to export them.</p>
        </div>
        <div className="tool-workspace-actions">
          <span className="tool-local-badge"><span aria-hidden="true">●</span> Runs locally</span>
          <button type="button" className="tool-secondary-button" onClick={copyToolLink}>{copyLinkMessage || "Copy tool link"}</button>
          <button type="button" className="tool-secondary-button" onClick={resetTool}>Reset</button>
        </div>
      </header>
      <div className="tool-content-grid">{content}</div>
    </section>
  );
}
