
"use client";

import { useRef, useState } from "react";
import ToolShell, { NumberField } from "../ToolShell";

/* -------------------------------------------------------
   Types
------------------------------------------------------- */

type Style =
  | "clean"
  | "detailed"
  | "sketch"
  | "bold"
  | "stencil"
  | "comic"
  | "minimal"
  | "soft";

type PaperSize = "original" | "a4" | "a3" | "letter" | "legal";
type Orientation = "portrait" | "landscape";
type Format = "png" | "jpg";

type PageItem = {
  id: string;
  name: string;
  source: string;
  output: string | null;
};

type Settings = {
  style: Style;
  sensitivity: number;
  detail: number;
  contrast: number;
  thickness: number;
  smoothing: number;
  brightness: number;
  zoom: number;
  rotation: number;
  paper: PaperSize;
  orientation: Orientation;
  margin: number;
  lineColor: string;
  paperColor: string;
  watermark: string;
  bookTitle: string;
  showPageNumbers: boolean;
};

/* -------------------------------------------------------
   Defaults and options
------------------------------------------------------- */

const DEFAULT_SETTINGS: Settings = {
  style: "clean",
  sensitivity: 48,
  detail: 65,
  contrast: 115,
  thickness: 1,
  smoothing: 1,
  brightness: 0,
  zoom: 100,
  rotation: 0,
  paper: "original",
  orientation: "portrait",
  margin: 6,
  lineColor: "#111111",
  paperColor: "#ffffff",
  watermark: "",
  bookTitle: "My Coloring Book",
  showPageNumbers: true,
};

const STYLES: {
  value: Style;
  label: string;
  description: string;
}[] = [
  {
    value: "clean",
    label: "Clean outlines",
    description: "Balanced outlines for everyday coloring.",
  },
  {
    value: "detailed",
    label: "Detailed art",
    description: "Retains more small edges and textures.",
  },
  {
    value: "sketch",
    label: "Pencil sketch",
    description: "Adds subtle pencil-like shading.",
  },
  {
    value: "bold",
    label: "Bold cartoon",
    description: "Thicker outlines for younger colorists.",
  },
  {
    value: "stencil",
    label: "Stencil",
    description: "Strong, high-contrast outlines.",
  },
  {
    value: "comic",
    label: "Comic style",
    description: "Stronger contours and graphic details.",
  },
  {
    value: "minimal",
    label: "Minimal lines",
    description: "Fewer details and simpler outlines.",
  },
  {
    value: "soft",
    label: "Soft outlines",
    description: "Gentler edges and a lighter appearance.",
  },
];

const PAPER_SIZES: Record<
  PaperSize,
  { label: string; width: number; height: number; css: string }
> = {
  original: {
    label: "Original image",
    width: 0,
    height: 0,
    css: "A4",
  },
  a4: {
    label: "A4",
    width: 1654,
    height: 2339,
    css: "A4",
  },
  a3: {
    label: "A3",
    width: 2339,
    height: 3308,
    css: "A3",
  },
  letter: {
    label: "US Letter",
    width: 1650,
    height: 2138,
    css: "letter",
  },
  legal: {
    label: "US Legal",
    width: 1650,
    height: 2700,
    css: "legal",
  },
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2200;
const MAX_BATCH_FILES = 20;

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function grayscale(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[char];
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error(`Could not read ${file.name}.`));
      }
    };

    reader.onerror = () => {
      reject(new Error(`Could not read ${file.name}.`));
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => {
      reject(new Error("Could not open this image for processing."));
    };

    image.src = source;
  });
}

function parseHexColor(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex)
    ? hex
    : "#000000";

  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

/* -------------------------------------------------------
   Image processing helpers
------------------------------------------------------- */

function blurImage(
  input: Float32Array<ArrayBufferLike>,
  width: number,
  height: number,
  radius: number,
): Float32Array<ArrayBufferLike> {
  if (radius <= 0) return input;

  const horizontal = new Float32Array(input.length);
  const output = new Float32Array(input.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let k = -radius; k <= radius; k++) {
        const px = clamp(x + k, 0, width - 1);
        sum += input[y * width + px];
        count++;
      }

      horizontal[y * width + x] = sum / count;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let k = -radius; k <= radius; k++) {
        const py = clamp(y + k, 0, height - 1);
        sum += horizontal[py * width + x];
        count++;
      }

      output[y * width + x] = sum / count;
    }
  }

  return output;
}

function expandEdges(
  edges: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  if (radius <= 0) return edges;

  const output = new Uint8Array(edges.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let found = false;

      for (let dy = -radius; dy <= radius && !found; dy++) {
        const py = y + dy;

        if (py < 0 || py >= height) continue;

        for (let dx = -radius; dx <= radius; dx++) {
          const px = x + dx;

          if (
            px >= 0 &&
            px < width &&
            edges[py * width + px] === 1
          ) {
            found = true;
            break;
          }
        }
      }

      if (found) {
        output[y * width + x] = 1;
      }
    }
  }

  return output;
}

/* -------------------------------------------------------
   Main coloring page engine
------------------------------------------------------- */

function createProcessedImage(
  image: HTMLImageElement,
  settings: Settings,
): string {
  let width: number;
  let height: number;

  if (settings.paper === "original") {
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION /
        Math.max(image.naturalWidth, image.naturalHeight),
    );

    width = Math.max(1, Math.round(image.naturalWidth * scale));
    height = Math.max(1, Math.round(image.naturalHeight * scale));
  } else {
    const paper = PAPER_SIZES[settings.paper];

    width = paper.width;
    height = paper.height;

    if (settings.orientation === "landscape") {
      [width, height] = [height, width];
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error("Could not initialize the image processor.");
  }

  const paperRgb = parseHexColor(settings.paperColor);
  const lineRgb = parseHexColor(settings.lineColor);

  context.fillStyle = settings.paperColor;
  context.fillRect(0, 0, width, height);

  const margin =
    settings.paper === "original"
      ? 0
      : Math.round(
          Math.min(width, height) * (settings.margin / 100),
        );

  const availableWidth = Math.max(1, width - margin * 2);
  const availableHeight = Math.max(1, height - margin * 2);

  const rotation = ((settings.rotation % 360) + 360) % 360;
  const isQuarterTurn = rotation === 90 || rotation === 270;

  const rotatedSourceWidth = isQuarterTurn
    ? image.naturalHeight
    : image.naturalWidth;

  const rotatedSourceHeight = isQuarterTurn
    ? image.naturalWidth
    : image.naturalHeight;

  const fitScale = Math.min(
    availableWidth / rotatedSourceWidth,
    availableHeight / rotatedSourceHeight,
  );

  const scale = fitScale * (settings.zoom / 100);

  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();

  let imageData: ImageData;

  try {
    imageData = context.getImageData(0, 0, width, height);
  } catch {
    throw new Error(
      "The image is too large for this browser to process. Try a smaller image or use Original image size.",
    );
  }

  const pixels = imageData.data;
  const totalPixels = width * height;

  let gray: Float32Array<ArrayBufferLike> =
    new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;

    let value = grayscale(
      pixels[offset],
      pixels[offset + 1],
      pixels[offset + 2],
    );

    value += settings.brightness;
    value = (value - 128) * (settings.contrast / 100) + 128;

    gray[i] = clamp(value, 0, 255);
  }

  gray = blurImage(
    gray,
    width,
    height,
    settings.smoothing,
  );

  const edges = new Uint8Array(totalPixels);

  const styleMultiplier: Record<Style, number> = {
    clean: 1,
    detailed: 0.72,
    sketch: 1.05,
    bold: 1.2,
    stencil: 1.3,
    comic: 0.82,
    minimal: 1.45,
    soft: 1.15,
  };

  const threshold = clamp(
    (145 - settings.sensitivity * 1.1) *
      styleMultiplier[settings.style] *
      (1.25 - settings.detail / 200),
    8,
    190,
  );

  // Sobel edge detection.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tl = gray[(y - 1) * width + (x - 1)];
      const t = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];

      const l = gray[y * width + (x - 1)];
      const r = gray[y * width + (x + 1)];

      const bl = gray[(y + 1) * width + (x - 1)];
      const b = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];

      const gx =
        -tl + tr -
        2 * l + 2 * r -
        bl + br;

      const gy =
        -tl - 2 * t - tr +
        bl + 2 * b + br;

      const magnitude = Math.sqrt(gx * gx + gy * gy);

      if (magnitude >= threshold) {
        edges[y * width + x] = 1;
      }
    }
  }

  // Remove isolated pixels for selected styles.
  if (
    settings.style === "clean" ||
    settings.style === "minimal" ||
    settings.style === "soft"
  ) {
    const cleaned = new Uint8Array(edges);

    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const index = y * width + x;

        if (edges[index] === 0) continue;

        let neighbors = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            if (edges[(y + dy) * width + x + dx] === 1) {
              neighbors++;
            }
          }
        }

        if (neighbors <= 1) {
          cleaned[index] = 0;
        }
      }
    }

    edges.set(cleaned);
  }

  const radius =
    settings.style === "bold"
      ? Math.min(5, settings.thickness + 2)
      : settings.style === "comic"
        ? Math.min(4, settings.thickness + 1)
        : settings.thickness;

  const finalEdges = expandEdges(
    edges,
    width,
    height,
    radius,
  );

  const output = context.createImageData(width, height);

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const isEdge = finalEdges[i] === 1;

    let lineStrength = isEdge ? 1 : 0;

    if (settings.style === "sketch" && !isEdge) {
      lineStrength = clamp(
        ((190 - gray[i]) / 255) * 0.24,
        0,
        0.16,
      );
    }

    if (settings.style === "soft" && isEdge) {
      lineStrength = 0.78;
    }

    const red =
      paperRgb[0] * (1 - lineStrength) +
      lineRgb[0] * lineStrength;

    const green =
      paperRgb[1] * (1 - lineStrength) +
      lineRgb[1] * lineStrength;

    const blue =
      paperRgb[2] * (1 - lineStrength) +
      lineRgb[2] * lineStrength;

    output.data[offset] = clamp(red, 0, 255);
    output.data[offset + 1] = clamp(green, 0, 255);
    output.data[offset + 2] = clamp(blue, 0, 255);
    output.data[offset + 3] = 255;
  }

  context.putImageData(output, 0, 0);

  if (settings.watermark.trim()) {
    context.save();

    context.globalAlpha = 0.45;
    context.fillStyle = settings.lineColor;
    context.textAlign = "right";
    context.textBaseline = "bottom";
    context.font = `bold ${Math.max(
      16,
      Math.round(width * 0.018),
    )}px Arial`;

    context.fillText(
      settings.watermark.trim().slice(0, 80),
      width - Math.max(20, margin),
      height - Math.max(20, margin),
    );

    context.restore();
  }

  return canvas.toDataURL("image/png");
}

/* -------------------------------------------------------
   Download helpers
------------------------------------------------------- */

function downloadDataUrl(
  dataUrl: string,
  filename: string,
  format: Format,
) {
  const triggerDownload = (url: string, extension: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (format === "png") {
    triggerDownload(dataUrl, "png");
    return;
  }

  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    triggerDownload(canvas.toDataURL("image/jpeg", 0.94), "jpg");
  };

  image.onerror = () => {
    triggerDownload(dataUrl, "png");
  };

  image.src = dataUrl;
}

function createPageId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* -------------------------------------------------------
   Main component
------------------------------------------------------- */

export default function ColoringPageConverter() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [format, setFormat] = useState<Format>("png");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const selectedPage =
    pages.find((page) => page.id === selectedId) || null;

  const completedCount = pages.filter(
    (page) => page.output !== null,
  ).length;

  const updateSettings = <K extends keyof Settings,>(
    key: K,
    value: Settings[K],
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  /* -----------------------------------------------------
     Upload and page management
  ----------------------------------------------------- */

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setError("");

    const files = Array.from(fileList);

    if (pages.length + files.length > MAX_BATCH_FILES) {
      setError(
        `You can add up to ${MAX_BATCH_FILES} images to one coloring book.`,
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    const validFiles = files.filter(
      (file) =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
        file.size <= MAX_FILE_SIZE,
    );

    if (validFiles.length === 0) {
      setError(
        "Choose JPG, PNG or WebP images smaller than 20 MB each.",
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (validFiles.length !== files.length) {
      setError(
        "Some files were skipped. Only JPG, PNG and WebP images up to 20 MB are supported.",
      );
    }

    try {
      const newPages: PageItem[] = [];

      for (const file of validFiles) {
        const source = await readFileAsDataUrl(file);
        await loadImage(source);

        newPages.push({
          id: createPageId(),
          name: file.name.replace(/\.[^/.]+$/, ""),
          source,
          output: null,
        });
      }

      setPages((current) => [...current, ...newPages]);

      setSelectedId((current) => current || newPages[0]?.id || "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load one or more selected images.",
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removePage = (id: string) => {
    const index = pages.findIndex((page) => page.id === id);

    if (index === -1) return;

    const nextPages = pages.filter((page) => page.id !== id);

    setPages(nextPages);

    if (selectedId === id) {
      const nextSelected =
        nextPages[Math.min(index, nextPages.length - 1)];

      setSelectedId(nextSelected?.id || "");
    }
  };

  const movePage = (id: string, direction: -1 | 1) => {
    setPages((current) => {
      const index = current.findIndex((page) => page.id === id);
      const target = index + direction;

      if (
        index < 0 ||
        target < 0 ||
        target >= current.length
      ) {
        return current;
      }

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });
  };

  const clearBook = () => {
    setPages([]);
    setSelectedId("");
    setError("");
    setProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const reset = () => {
    if (processing) return;

    clearBook();
    setSettings(DEFAULT_SETTINGS);
    setFormat("png");
  };

  /* -----------------------------------------------------
     Conversion
  ----------------------------------------------------- */

  const convertSelected = async () => {
    if (!selectedPage || processing) return;

    const pageToConvert = selectedPage;
    const settingsSnapshot = { ...settings };

    setProcessing(true);
    setProgress(0);
    setError("");

    try {
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, 30),
      );

      const image = await loadImage(pageToConvert.source);
      const output = createProcessedImage(image, settingsSnapshot);

      setPages((current) =>
        current.map((page) =>
          page.id === pageToConvert.id
            ? { ...page, output }
            : page,
        ),
      );

      setProgress(100);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not convert this image.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const convertAll = async () => {
    if (pages.length === 0 || processing) return;

    const pagesToConvert = [...pages];
    const settingsSnapshot = { ...settings };

    setProcessing(true);
    setProgress(0);
    setError("");

    let successful = 0;
    const failedNames: string[] = [];

    try {
      for (let i = 0; i < pagesToConvert.length; i++) {
        const page = pagesToConvert[i];

        try {
          const image = await loadImage(page.source);
          const output = createProcessedImage(
            image,
            settingsSnapshot,
          );

          setPages((current) =>
            current.map((item) =>
              item.id === page.id
                ? { ...item, output }
                : item,
            ),
          );

          successful++;
        } catch {
          failedNames.push(page.name);
        }

        setProgress(
          Math.round(((i + 1) / pagesToConvert.length) * 100),
        );

        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, 20),
        );
      }

      if (failedNames.length > 0) {
        setError(
          `${successful} image(s) converted. Could not process: ${failedNames.join(
            ", ",
          )}.`,
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  /* -----------------------------------------------------
     Presets
  ----------------------------------------------------- */

  const savePreset = () => {
    try {
      localStorage.setItem(
        "toolsab-coloring-studio-preset",
        JSON.stringify(settings),
      );

      setError("");
      window.alert("Your settings preset has been saved in this browser.");
    } catch {
      setError("Could not save the settings preset in this browser.");
    }
  };

  const loadPreset = () => {
    try {
      const saved = localStorage.getItem(
        "toolsab-coloring-studio-preset",
      );

      if (!saved) {
        setError("No saved preset was found in this browser.");
        return;
      }

      const parsed = JSON.parse(saved) as Partial<Settings>;

      const validStyles: Style[] = [
        "clean",
        "detailed",
        "sketch",
        "bold",
        "stencil",
        "comic",
        "minimal",
        "soft",
      ];

      const validPapers: PaperSize[] = [
        "original",
        "a4",
        "a3",
        "letter",
        "legal",
      ];

      const next: Settings = {
        ...DEFAULT_SETTINGS,
        ...parsed,

        style: validStyles.includes(parsed.style as Style)
          ? (parsed.style as Style)
          : DEFAULT_SETTINGS.style,

        paper: validPapers.includes(parsed.paper as PaperSize)
          ? (parsed.paper as PaperSize)
          : DEFAULT_SETTINGS.paper,

        orientation:
          parsed.orientation === "landscape"
            ? "landscape"
            : "portrait",

        sensitivity: clamp(
          safeNumber(parsed.sensitivity ?? 48, 48),
          1,
          100,
        ),

        detail: clamp(
          safeNumber(parsed.detail ?? 65, 65),
          1,
          100,
        ),

        contrast: clamp(
          safeNumber(parsed.contrast ?? 115, 115),
          50,
          200,
        ),

        thickness: clamp(
          safeNumber(parsed.thickness ?? 1, 1),
          0,
          4,
        ),

        smoothing: clamp(
          safeNumber(parsed.smoothing ?? 1, 1),
          0,
          3,
        ),

        brightness: clamp(
          safeNumber(parsed.brightness ?? 0, 0),
          -100,
          100,
        ),

        zoom: clamp(
          safeNumber(parsed.zoom ?? 100, 100),
          50,
          200,
        ),

        rotation: [0, 90, 180, 270].includes(
          Number(parsed.rotation),
        )
          ? Number(parsed.rotation)
          : 0,

        margin: clamp(
          safeNumber(parsed.margin ?? 6, 6),
          1,
          20,
        ),

        lineColor: /^#[0-9a-fA-F]{6}$/.test(
          parsed.lineColor || "",
        )
          ? parsed.lineColor!
          : DEFAULT_SETTINGS.lineColor,

        paperColor: /^#[0-9a-fA-F]{6}$/.test(
          parsed.paperColor || "",
        )
          ? parsed.paperColor!
          : DEFAULT_SETTINGS.paperColor,

        watermark: String(parsed.watermark ?? "").slice(0, 80),
        bookTitle: String(parsed.bookTitle ?? "").slice(0, 100),

        showPageNumbers:
          typeof parsed.showPageNumbers === "boolean"
            ? parsed.showPageNumbers
            : DEFAULT_SETTINGS.showPageNumbers,
      };

      setSettings(next);
      setError("");
    } catch {
      setError("Could not load the saved settings preset.");
    }
  };

  /* -----------------------------------------------------
     Printing
  ----------------------------------------------------- */

  const printBook = () => {
    const completedPages = pages.filter(
      (page) => page.output !== null,
    );

    if (completedPages.length === 0) {
      setError("Convert at least one image before creating your book.");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setError("Allow pop-ups in your browser to print your coloring book.");
      return;
    }

    const title = escapeHtml(
      settings.bookTitle.trim() || "Coloring Book",
    );

    const paperCss = PAPER_SIZES[settings.paper].css;
    const orientation = settings.orientation;

    const pageHtml = completedPages
      .map((page, index) => {
        const imageSource = page.output || "";

        return `
          <section class="book-page">
            <img
              src="${imageSource}"
              alt="Coloring page ${index + 1}"
            />
            ${
              settings.showPageNumbers
                ? `<div class="page-number">${index + 1}</div>`
                : ""
            }
          </section>
        `;
      })
      .join("");

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${title}</title>
          <style>
            @page {
              size: ${paperCss} ${orientation};
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: Arial, sans-serif;
            }

            .cover {
              width: 100%;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 40px;
              page-break-after: always;
              break-after: page;
            }

            .cover h1 {
              max-width: 90%;
              overflow-wrap: anywhere;
              font-size: 34px;
              color: #222;
            }

            .book-page {
              width: 100%;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              padding: 5%;
              overflow: hidden;
              page-break-after: always;
              break-after: page;
            }

            .book-page img {
              display: block;
              max-width: 100%;
              max-height: 100%;
              width: auto;
              height: auto;
              object-fit: contain;
            }

            .page-number {
              position: absolute;
              bottom: 12px;
              right: 18px;
              font-size: 10px;
              color: #777;
            }

            @media print {
              html,
              body {
                width: 100%;
                height: 100%;
              }

              .cover,
              .book-page {
                height: 100vh;
                page-break-after: always;
                break-after: page;
              }
            }
          </style>
        </head>
        <body>
          <section class="cover">
            <h1>${title}</h1>
          </section>

          ${pageHtml}

          <script>
            const images = Array.from(document.images);

            Promise.all(
              images.map((img) => {
                if (img.complete) return Promise.resolve();

                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              })
            ).then(() => {
              window.focus();
              window.print();
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  /* -----------------------------------------------------
     Downloads
  ----------------------------------------------------- */

  const downloadSelected = () => {
    if (!selectedPage?.output) return;

    downloadDataUrl(
      selectedPage.output,
      `${selectedPage.name}-coloring-page`,
      format,
    );
  };

  const downloadAll = () => {
    const completedPages = pages.filter(
      (page) => page.output !== null,
    );

    if (completedPages.length === 0) return;

    completedPages.forEach((page, index) => {
      window.setTimeout(() => {
        if (!page.output) return;

        downloadDataUrl(
          page.output,
          `${page.name}-coloring-page`,
          format,
        );
      }, index * 500);
    });
  };

  /* -----------------------------------------------------
     UI
  ----------------------------------------------------- */

  return (
    <ToolShell
      title="Coloring Page Studio Pro"
      onReset={reset}
      wide
    >
      <div className="color-pro">
        <style jsx>{`
          .color-pro {
            --accent: #ff5a1f;
            color: #172033;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }

          .color-pro *,
          .color-pro *::before,
          .color-pro *::after {
            box-sizing: border-box;
          }

          /* Main two-column layout */

          .studio-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(320px, 370px);
            gap: 20px;
            align-items: start;
            width: 100%;
            min-width: 0;
          }

          .studio-main,
          .studio-sidebar {
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-width: 0;
          }

          .studio-sidebar {
            position: sticky;
            top: 18px;
          }

          .studio-layout .section {
            margin-bottom: 0;
            min-width: 0;
            width: 100%;
          }

          .studio-sidebar .preview-grid {
            grid-template-columns: 1fr;
          }

          .studio-sidebar .preview-image {
            min-height: 220px;
          }

          .studio-sidebar .preview-image img {
            max-height: 420px;
            width: auto;
            max-width: 100%;
          }

          /* Cards */

          .section {
            background: #fff;
            border: 1px solid #e5eaf2;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 3px 12px rgba(20, 35, 60, 0.035);
          }

          .section-heading {
            font-size: 15px;
            font-weight: 780;
            margin: 0 0 5px;
            color: #172033;
          }

          .section-help {
            color: #7a8497;
            font-size: 12px;
            line-height: 1.6;
            margin: 0 0 15px;
          }

          .field-label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            color: #30394c;
            margin-bottom: 7px;
          }

          .input,
          .select {
            width: 100%;
            min-width: 0;
            height: 44px;
            border: 1px solid #d8e0eb;
            border-radius: 10px;
            padding: 9px 11px;
            background: #fff;
            color: #172033;
            font: inherit;
            font-size: 13px;
            outline: none;
            transition: border-color 0.18s ease, box-shadow 0.18s ease;
          }

          .input:focus,
          .select:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
          }

          /* Input grids */

          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .grid > div {
            min-width: 0;
          }

          /* Conversion style cards */

          .style-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .style-card {
            padding: 13px;
            text-align: left;
            border: 1px solid #e1e5ec;
            background: #fff;
            border-radius: 11px;
            cursor: pointer;
            min-width: 0;
            transition: 0.18s ease;
          }

          .style-card:hover {
            border-color: var(--accent);
            transform: translateY(-1px);
          }

          .style-card.active {
            border: 2px solid var(--accent);
            background: #fff7f3;
            padding: 12px;
          }

          .style-card strong {
            display: block;
            font-size: 13px;
            margin-bottom: 5px;
            color: #172033;
          }

          .style-card small {
            display: block;
            color: #7b8495;
            font-size: 11px;
            line-height: 1.5;
          }

          /* Buttons */

          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 44px;
            padding: 10px 13px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 750;
            cursor: pointer;
            border: 1px solid #dfe3eb;
            background: #fff;
            color: #30394c;
            transition: 0.18s ease;
          }

          .button:hover:not(:disabled) {
            border-color: var(--accent);
            color: var(--accent);
          }

          .button.primary {
            background: linear-gradient(135deg, #ff6b35, #ff5a1f);
            border-color: var(--accent);
            color: #fff;
            box-shadow: 0 4px 12px rgba(255, 90, 31, 0.16);
          }

          .button.primary:hover:not(:disabled) {
            background: #e94b13;
            color: #fff;
            border-color: #e94b13;
          }

          .button:disabled,
          .mini-button:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }

          .button-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
            margin-top: 12px;
          }

          /* Upload area */

          .file-picker {
            display: block;
            width: 100%;
            padding: 20px;
            border: 1.5px dashed #cbd2df;
            border-radius: 12px;
            background: #fafbfc;
            cursor: pointer;
            transition: 0.18s ease;
          }

          .file-picker:hover {
            border-color: var(--accent);
            background: #fff9f6;
          }

          .file-picker strong {
            display: block;
            font-size: 13px;
            margin-bottom: 5px;
          }

          .file-picker span {
            display: block;
            color: #80899a;
            font-size: 11px;
            line-height: 1.5;
          }

          /* Image library */

          .page-list {
            display: grid;
            gap: 8px;
            margin-top: 14px;
          }

          .page-item {
            display: grid;
            grid-template-columns: 64px minmax(0, 1fr) auto;
            align-items: center;
            gap: 10px;
            padding: 9px;
            border: 1px solid #e5e8ef;
            border-radius: 10px;
            cursor: pointer;
            background: #fff;
            min-width: 0;
          }

          .page-item.active {
            border-color: var(--accent);
            background: #fff8f5;
          }

          .page-thumb {
            width: 64px;
            height: 64px;
            object-fit: contain;
            background: #f0f2f5;
            border-radius: 7px;
          }

          .page-name {
            min-width: 0;
            overflow-wrap: anywhere;
            font-size: 12px;
            font-weight: 700;
          }

          .page-status {
            display: block;
            font-size: 10px;
            color: #818b9c;
            margin-top: 4px;
            font-weight: 500;
          }

          .page-actions {
            display: flex;
            gap: 4px;
          }

          .mini-button {
            border: 1px solid #e1e5ec;
            border-radius: 6px;
            background: #fff;
            color: #465066;
            width: 27px;
            height: 27px;
            cursor: pointer;
            font-size: 12px;
          }

          .mini-button:hover:not(:disabled) {
            color: var(--accent);
            border-color: var(--accent);
          }

          /* Preview */

          .preview-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .preview-card {
            min-width: 0;
          }

          .preview-card strong {
            display: block;
            font-size: 12px;
            margin-bottom: 7px;
          }

          .preview-image {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 0;
            min-height: 190px;
            padding: 8px;
            border: 1px solid #e4e7ed;
            border-radius: 10px;
            background: #f3f5f8;
            overflow: hidden;
          }

          .preview-image img {
            display: block;
            max-width: 100%;
            max-height: 370px;
            width: auto;
            height: auto;
            object-fit: contain;
            background: #fff;
          }

          .empty {
            text-align: center;
            color: #8992a2;
            font-size: 12px;
            padding: 30px 8px;
            line-height: 1.5;
          }

          /* Switch */

          .switch-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-top: 1px solid #edf0f4;
            padding: 12px 0;
          }

          .switch-row strong {
            display: block;
            font-size: 12px;
          }

          .switch-row small {
            display: block;
            font-size: 10px;
            color: #858e9e;
            margin-top: 3px;
          }

          .switch {
            appearance: none;
            -webkit-appearance: none;
            width: 44px;
            height: 25px;
            border-radius: 30px;
            background: #d9dee7;
            position: relative;
            cursor: pointer;
            flex-shrink: 0;
            transition: background 0.2s ease;
            margin: 0;
          }

          .switch::after {
            content: "";
            position: absolute;
            width: 19px;
            height: 19px;
            border-radius: 50%;
            background: #fff;
            top: 3px;
            left: 3px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
            transition: transform 0.2s ease;
          }

          .switch:checked {
            background: var(--accent);
          }

          .switch:checked::after {
            transform: translateX(19px);
          }

          .switch:focus-visible {
            outline: 3px solid rgba(255, 90, 31, 0.2);
            outline-offset: 2px;
          }

          /* Notices and status */

          .notice {
            border: 1px solid #ffe1d3;
            background: #fff8f4;
            color: #87462e;
            border-radius: 10px;
            padding: 12px;
            font-size: 11px;
            line-height: 1.6;
            margin-top: 12px;
          }

          .error {
            border: 1px solid #ffd4cc;
            background: #fff2f0;
            color: #b42318;
            border-radius: 10px;
            padding: 12px;
            font-size: 12px;
            line-height: 1.5;
            margin-bottom: 16px;
          }

          .progress-track {
            height: 8px;
            border-radius: 20px;
            background: #eceff3;
            overflow: hidden;
            margin-top: 10px;
          }

          .progress-fill {
            height: 100%;
            border-radius: inherit;
            background: var(--accent);
            transition: width 0.2s ease;
          }

          .color-control {
            width: 100%;
            height: 44px;
            border: 1px solid #dfe3eb;
            border-radius: 9px;
            padding: 4px;
            background: #fff;
            cursor: pointer;
          }

          .muted {
            color: #828b9c;
            font-size: 11px;
          }

          /* Responsive */

          @media (max-width: 1099px) {
            .studio-layout {
              grid-template-columns: minmax(0, 1fr);
            }

            .studio-sidebar {
              position: static;
            }

            .studio-sidebar .preview-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 600px) {
            .section {
              padding: 15px;
            }

            .grid,
            .style-grid,
            .preview-grid {
              grid-template-columns: 1fr;
            }

            .button-row {
              grid-template-columns: 1fr;
            }

            .page-item {
              grid-template-columns: 52px minmax(0, 1fr) auto;
            }

            .page-thumb {
              width: 52px;
              height: 58px;
            }

            .page-actions {
              flex-wrap: wrap;
              justify-content: flex-end;
            }

            .studio-sidebar .preview-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        <div className="studio-layout">
          {/* ============================================
              LEFT COLUMN
          ============================================ */}

          <main className="studio-main">
            {/* 1. Image library */}

            <section className="section">
              <h3 className="section-heading">
                1. Image library
              </h3>

              <p className="section-help">
                Upload one or multiple photos to create individual
                coloring pages or a complete printable coloring book.
              </p>

              <label className="file-picker">
                <strong>＋ Add photos</strong>
                <span>
                  JPG, PNG, WebP · Up to 20 MB per image · Maximum 20 images
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(event) => {
                    void addFiles(event.target.files);
                  }}
                  style={{ display: "none" }}
                />
              </label>

              <div className="button-row">
                <button
                  type="button"
                  className="button"
                  disabled={processing}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add more photos
                </button>

                <button
                  type="button"
                  className="button"
                  onClick={clearBook}
                  disabled={pages.length === 0 || processing}
                >
                  Clear image library
                </button>
              </div>

              {pages.length > 0 && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>
                      Your pages ({pages.length})
                    </strong>

                    <span className="muted">
                      {completedCount} converted
                    </span>
                  </div>

                  <div className="page-list">
                    {pages.map((page, index) => (
                      <div
                        key={page.id}
                        className={`page-item ${
                          selectedId === page.id ? "active" : ""
                        }`}
                        onClick={() => setSelectedId(page.id)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                            setSelectedId(page.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selectedId === page.id}
                      >
                        <img
                          className="page-thumb"
                          src={page.output || page.source}
                          alt={page.name}
                        />

                        <div className="page-name">
                          {index + 1}. {page.name}

                          <span className="page-status">
                            {page.output ? "Converted" : "Not converted"}
                          </span>
                        </div>

                        <div className="page-actions">
                          <button
                            type="button"
                            className="mini-button"
                            title="Move up"
                            aria-label={`Move ${page.name} up`}
                            disabled={index === 0 || processing}
                            onClick={(event) => {
                              event.stopPropagation();
                              movePage(page.id, -1);
                            }}
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            className="mini-button"
                            title="Move down"
                            aria-label={`Move ${page.name} down`}
                            disabled={
                              index === pages.length - 1 || processing
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              movePage(page.id, 1);
                            }}
                          >
                            ↓
                          </button>

                          <button
                            type="button"
                            className="mini-button"
                            title="Remove page"
                            aria-label={`Remove ${page.name}`}
                            disabled={processing}
                            onClick={(event) => {
                              event.stopPropagation();
                              removePage(page.id);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* 2. Conversion styles */}

            <section className="section">
              <h3 className="section-heading">
                2. Professional conversion styles
              </h3>

              <p className="section-help">
                Choose the appearance you want for your coloring pages.
              </p>

              <div className="style-grid">
                {STYLES.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={`style-card ${
                      settings.style === item.value ? "active" : ""
                    }`}
                    onClick={() => updateSettings("style", item.value)}
                    aria-pressed={settings.style === item.value}
                  >
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Image controls */}

            <section className="section">
              <h3 className="section-heading">
                3. Advanced image controls
              </h3>

              <p className="section-help">
                Adjust edge detection and image appearance. Regenerate
                converted pages after changing these settings.
              </p>

              <div className="grid">
                <div>
                  <NumberField
                    label="Outline sensitivity"
                    value={settings.sensitivity}
                    min={1}
                    onChange={(value) =>
                      updateSettings(
                        "sensitivity",
                        clamp(safeNumber(value, 48), 1, 100),
                      )
                    }
                  />
                  <p className="section-help">
                    Higher values generally detect more edges.
                  </p>
                </div>

                <div>
                  <NumberField
                    label="Detail level"
                    value={settings.detail}
                    min={1}
                    onChange={(value) =>
                      updateSettings(
                        "detail",
                        clamp(safeNumber(value, 65), 1, 100),
                      )
                    }
                  />
                  <p className="section-help">
                    Controls how much subtle image detail is retained.
                  </p>
                </div>

                <div>
                  <NumberField
                    label="Contrast"
                    value={settings.contrast}
                    min={50}
                    onChange={(value) =>
                      updateSettings(
                        "contrast",
                        clamp(safeNumber(value, 115), 50, 200),
                      )
                    }
                  />
                  <p className="section-help">
                    Increase or decrease image contrast.
                  </p>
                </div>

                <div>
                  <NumberField
                    label="Line thickness"
                    value={settings.thickness}
                    min={0}
                    onChange={(value) =>
                      updateSettings(
                        "thickness",
                        clamp(
                          Math.round(safeNumber(value, 1)),
                          0,
                          4,
                        ),
                      )
                    }
                  />
                  <p className="section-help">
                    Controls the thickness of detected outlines.
                  </p>
                </div>

                <div>
                  <NumberField
                    label="Noise reduction"
                    value={settings.smoothing}
                    min={0}
                    onChange={(value) =>
                      updateSettings(
                        "smoothing",
                        clamp(
                          Math.round(safeNumber(value, 1)),
                          0,
                          3,
                        ),
                      )
                    }
                  />
                  <p className="section-help">
                    Smooths small details before edge detection.
                  </p>
                </div>

                <div>
                  <NumberField
                    label="Brightness"
                    value={settings.brightness}
                    min={-100}
                    onChange={(value) =>
                      updateSettings(
                        "brightness",
                        clamp(safeNumber(value, 0), -100, 100),
                      )
                    }
                  />
                  <p className="section-help">
                    Adjusts brightness before conversion.
                  </p>
                </div>

                <div>
                  <NumberField
                    label="Image zoom"
                    value={settings.zoom}
                    min={50}
                    onChange={(value) =>
                      updateSettings(
                        "zoom",
                        clamp(safeNumber(value, 100), 50, 200),
                      )
                    }
                  />
                  <p className="section-help">
                    Zooms or crops the image within the page.
                  </p>
                </div>

                <div>
                  <label className="field-label" htmlFor="rotation">
                    Rotate image
                  </label>

                  <select
                    id="rotation"
                    className="select"
                    value={settings.rotation}
                    onChange={(event) =>
                      updateSettings(
                        "rotation",
                        Number(event.target.value),
                      )
                    }
                  >
                    <option value={0}>0° - Original</option>
                    <option value={90}>90° clockwise</option>
                    <option value={180}>180°</option>
                    <option value={270}>270° clockwise</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 4. Paper settings */}

            <section className="section">
              <h3 className="section-heading">
                4. Page layout and print settings
              </h3>

              <p className="section-help">
                Prepare individual pages or a complete printable book.
              </p>

              <div className="grid">
                <div>
                  <label className="field-label" htmlFor="paper-size">
                    Paper size
                  </label>

                  <select
                    id="paper-size"
                    className="select"
                    value={settings.paper}
                    onChange={(event) =>
                      updateSettings(
                        "paper",
                        event.target.value as PaperSize,
                      )
                    }
                  >
                    {Object.entries(PAPER_SIZES).map(
                      ([value, item]) => (
                        <option key={value} value={value}>
                          {item.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="field-label" htmlFor="orientation">
                    Page orientation
                  </label>

                  <select
                    id="orientation"
                    className="select"
                    value={settings.orientation}
                    onChange={(event) =>
                      updateSettings(
                        "orientation",
                        event.target.value as Orientation,
                      )
                    }
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                <div>
                  <NumberField
                    label="Page margin (%)"
                    value={settings.margin}
                    min={1}
                    onChange={(value) =>
                      updateSettings(
                        "margin",
                        clamp(safeNumber(value, 6), 1, 20),
                      )
                    }
                  />
                  <p className="section-help">
                    Adds space around the image for printing.
                  </p>
                </div>

                <div>
                  <label className="field-label" htmlFor="export-format">
                    Image download format
                  </label>

                  <select
                    id="export-format"
                    className="select"
                    value={format}
                    onChange={(event) =>
                      setFormat(event.target.value as Format)
                    }
                  >
                    <option value="png">PNG - best for line art</option>
                    <option value="jpg">JPG - smaller files</option>
                  </select>
                </div>
              </div>

              <div className="grid" style={{ marginTop: 16 }}>
                <div>
                  <label className="field-label" htmlFor="line-color">
                    Outline color
                  </label>

                  <input
                    id="line-color"
                    className="color-control"
                    type="color"
                    value={settings.lineColor}
                    onChange={(event) =>
                      updateSettings("lineColor", event.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="paper-color">
                    Paper background color
                  </label>

                  <input
                    id="paper-color"
                    className="color-control"
                    type="color"
                    value={settings.paperColor}
                    onChange={(event) =>
                      updateSettings("paperColor", event.target.value)
                    }
                  />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="field-label" htmlFor="watermark">
                  Optional watermark
                </label>

                <input
                  id="watermark"
                  className="input"
                  value={settings.watermark}
                  maxLength={80}
                  placeholder="Your name or website"
                  onChange={(event) =>
                    updateSettings("watermark", event.target.value)
                  }
                />

                <p className="section-help">
                  Adds a small watermark to generated pages.
                </p>
              </div>
            </section>

            {/* 5. Book settings */}

            <section className="section">
              <h3 className="section-heading">
                5. Coloring book settings
              </h3>

              <p className="section-help">
                Organize your converted images into a printable book.
              </p>

              <label className="field-label" htmlFor="book-title">
                Coloring book title
              </label>

              <input
                id="book-title"
                className="input"
                maxLength={100}
                value={settings.bookTitle}
                onChange={(event) =>
                  updateSettings("bookTitle", event.target.value)
                }
                placeholder="My Coloring Book"
              />

              <div className="switch-row" style={{ marginTop: 12 }}>
                <div>
                  <strong>Show page numbers</strong>
                  <small>
                    Include page numbers in the printable book.
                  </small>
                </div>

                <input
                  className="switch"
                  type="checkbox"
                  role="switch"
                  checked={settings.showPageNumbers}
                  onChange={(event) =>
                    updateSettings(
                      "showPageNumbers",
                      event.target.checked,
                    )
                  }
                  aria-label="Show page numbers"
                />
              </div>

              <div className="button-row">
                <button
                  type="button"
                  className="button"
                  onClick={savePreset}
                >
                  Save settings preset
                </button>

                <button
                  type="button"
                  className="button"
                  onClick={loadPreset}
                >
                  Load saved preset
                </button>
              </div>
            </section>
          </main>

          {/* ============================================
              RIGHT COLUMN
          ============================================ */}

          <aside className="studio-sidebar">
            {/* 6. Processing */}

            <section className="section">
              <h3 className="section-heading">
                6. Generate coloring pages
              </h3>

              <p className="section-help">
                Apply your current settings to the selected image or
                every image in your library.
              </p>

              <button
                type="button"
                className="button primary"
                disabled={!selectedPage || processing}
                onClick={() => void convertSelected()}
              >
                {processing
                  ? "Processing..."
                  : "Convert selected image"}
              </button>

              <button
                type="button"
                className="button"
                style={{ marginTop: 9 }}
                disabled={pages.length === 0 || processing}
                onClick={() => void convertAll()}
              >
                Convert all {pages.length} images
              </button>

              {processing && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 13,
                      fontSize: 11,
                    }}
                  >
                    <strong>Processing images</strong>
                    <span>{progress}%</span>
                  </div>

                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}

              <div className="notice">
                Batch conversion applies the same settings to every image.
                Larger images and larger batches take more time. Keep this
                browser tab open while processing.
              </div>
            </section>

            {/* 7. Preview */}

            <section className="section">
              <h3 className="section-heading">
                7. Before and after preview
              </h3>

              <p className="section-help">
                Compare the original photo with the generated coloring page.
              </p>

              {selectedPage ? (
                <div className="preview-grid">
                  <div className="preview-card">
                    <strong>Original photo</strong>

                    <div className="preview-image">
                      <img
                        src={selectedPage.source}
                        alt="Original uploaded photo"
                      />
                    </div>
                  </div>

                  <div className="preview-card">
                    <strong>Coloring page</strong>

                    <div className="preview-image">
                      {selectedPage.output ? (
                        <img
                          src={selectedPage.output}
                          alt="Generated coloring page"
                        />
                      ) : (
                        <div className="empty">
                          Convert this image to see your result.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty">
                  Upload an image to see the before and after preview.
                </div>
              )}

              {selectedPage?.output && (
                <button
                  type="button"
                  className="button primary"
                  style={{ marginTop: 13 }}
                  onClick={downloadSelected}
                >
                  Download selected page ({format.toUpperCase()})
                </button>
              )}
            </section>

            {/* 8. Export */}

            <section className="section">
              <h3 className="section-heading">
                8. Export your coloring book
              </h3>

              <p className="section-help">
                Download converted pages individually or open a print-ready
                multi-page coloring book.
              </p>

              <div className="button-row">
                <button
                  type="button"
                  className="button"
                  disabled={completedCount === 0}
                  onClick={downloadAll}
                >
                  Download all converted pages
                </button>

                <button
                  type="button"
                  className="button primary"
                  disabled={completedCount === 0}
                  onClick={printBook}
                >
                  Create printable coloring book
                </button>
              </div>

              <div className="notice">
                The coloring book opens in your browser's print dialog.
                Select "Save as PDF" as the printer destination to create
                a multi-page PDF. This keeps your photos on your device.
              </div>
            </section>
          </aside>
        </div>

        {/* Privacy information */}

        <div className="notice" style={{ marginBottom: 12 }}>
          <strong>Privacy and processing:</strong> Images are processed
          locally in your browser. No image-processing server or external
          API is used. This tool uses traditional Sobel edge detection,
          not AI object recognition or AI background removal. Complex
          backgrounds may produce extra outlines.
        </div>
      </div>
    </ToolShell>
  );
}
