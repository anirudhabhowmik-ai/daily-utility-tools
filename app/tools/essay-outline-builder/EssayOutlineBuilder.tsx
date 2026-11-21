"use client";

import {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type SectionColor = "none" | "orange" | "blue" | "green" | "purple" | "pink" | "yellow";
type CitationStyle = "apa" | "mla" | "chicago";
type ViewMode = "outline" | "preview" | "sources" | "insights";
type DropPosition = "before" | "after" | "inside";
type Theme = "light" | "dark";

type EssaySource = {
  id: string;
  author: string;
  title: string;
  year: string;
  publisher: string;
  url: string;
};

type EssaySection = {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  collapsed: boolean;
  color: SectionColor;
  wordTarget: number;
  sourceIds: string[];
  children: EssaySection[];
};

type EssayDocument = {
  id: string;
  title: string;
  essayType: string;
  topic: string;
  thesis: string;
  audience: string;
  targetWords: number;
  citationStyle: CitationStyle;
  sources: EssaySource[];
  createdAt: string;
  updatedAt: string;
  sections: EssaySection[];
};

type TemplateSection = {
  title: string;
  notes?: string;
  children?: TemplateSection[];
};

type Template = {
  name: string;
  description: string;
  sections: TemplateSection[];
  custom?: boolean;
};

type DropHint = { id: string; pos: DropPosition };

type DialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  input: boolean;
  placeholder?: string;
  onConfirm: (value: string) => void;
} | null;

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "toolsab-essay-outline-builder-v1";
const TEMPLATE_KEY = "toolsab-essay-outline-builder-templates-v1";
const THEME_KEY = "toolsab-essay-outline-builder-theme-v1";
const MAX_DEPTH = 20;
const MAX_HISTORY = 100;

type Html2PdfWorker = {
  set: (options: Record<string, unknown>) => Html2PdfWorker;
  from: (element: HTMLElement) => Html2PdfWorker;
  save: () => Promise<void>;
};
type Html2PdfFactory = () => Html2PdfWorker;

const PDF_CSS = `
.eob-pdf-root { width: 690px; background: #fff; color: #1f2430; font-family: Georgia, "Times New Roman", serif; line-height: 1.6; font-size: 14px; }
.eob-pdf-root h1 { font-size: 28px; margin: 0 0 6px; }
.eob-pdf-root h2 { font-size: 20px; margin: 24px 0 6px; border-bottom: 1px solid #e5e5ea; padding-bottom: 4px; }
.eob-pdf-root h3 { font-size: 16px; margin: 16px 0 4px; }
.eob-pdf-root h4, .eob-pdf-root h5, .eob-pdf-root h6 { font-size: 14px; margin: 12px 0 4px; }
.eob-pdf-root p { margin: 4px 0 8px; }
.eob-pdf-root .meta { color: #6b7080; font-size: 12px; font-style: italic; }
.eob-pdf-root .info { color: #555a68; font-size: 13px; margin-bottom: 16px; }
.eob-pdf-root .thesis { border-left: 4px solid #ff5a1f; background: #fff4ef; padding: 10px 14px; margin: 14px 0; }
.eob-pdf-root ul.refs { padding-left: 20px; }
.eob-pdf-root ul.refs li { margin-bottom: 6px; }
`;

const COLORS: { id: SectionColor; label: string; hex: string }[] = [
  { id: "none", label: "None", hex: "transparent" },
  { id: "orange", label: "Orange", hex: "#ff5a1f" },
  { id: "blue", label: "Blue", hex: "#3b82f6" },
  { id: "green", label: "Green", hex: "#22c55e" },
  { id: "purple", label: "Purple", hex: "#8b5cf6" },
  { id: "pink", label: "Pink", hex: "#ec4899" },
  { id: "yellow", label: "Yellow", hex: "#eab308" },
];

const CITATION_STYLES: { id: CitationStyle; label: string }[] = [
  { id: "apa", label: "APA" },
  { id: "mla", label: "MLA" },
  { id: "chicago", label: "Chicago" },
];

const templates: Template[] = [
  {
    name: "Argumentative Essay",
    description: "Present a clear position and support it with logical arguments and evidence.",
    sections: [
      {
        title: "Introduction",
        notes: "Introduce the topic and give readers the background they need.",
        children: [
          { title: "Opening Hook", notes: "Start with an interesting fact, question, or statement." },
          { title: "Background Information", notes: "Explain the issue and provide relevant context." },
          { title: "Thesis Statement", notes: "Clearly state your main argument or position." },
        ],
      },
      {
        title: "Main Arguments",
        notes: "Present your strongest reasons in support of your thesis.",
        children: [
          { title: "Argument 1", notes: "State your first reason and support it with evidence." },
          { title: "Argument 2", notes: "Develop your second reason with examples or facts." },
          { title: "Argument 3", notes: "Present another strong supporting point." },
        ],
      },
      {
        title: "Counterargument and Rebuttal",
        notes: "Recognize an opposing view and explain why your position remains stronger.",
        children: [
          { title: "Opposing View", notes: "Describe a reasonable argument from the other side." },
          { title: "Rebuttal", notes: "Respond with evidence and explain the weaknesses in that argument." },
        ],
      },
      {
        title: "Conclusion",
        notes: "Bring your argument together and leave the reader with a clear final thought.",
        children: [
          { title: "Restate the Thesis", notes: "Express your main position in fresh words." },
          { title: "Summarize Key Arguments", notes: "Briefly connect your main supporting points." },
          { title: "Closing Statement", notes: "End with a meaningful final observation or call to action." },
        ],
      },
    ],
  },
  {
    name: "Persuasive Essay",
    description: "Convince readers to accept an opinion or take a particular action.",
    sections: [
      { title: "Introduction", children: [{ title: "Attention-Grabbing Opening" }, { title: "Problem or Issue" }, { title: "Position Statement" }] },
      { title: "Reasons to Support My Position", children: [{ title: "First Reason and Evidence" }, { title: "Second Reason and Evidence" }, { title: "Third Reason and Evidence" }] },
      { title: "Opposing Viewpoint", children: [{ title: "What Others May Believe" }, { title: "My Response" }] },
      { title: "Conclusion", children: [{ title: "Restate My Position" }, { title: "Strong Final Appeal" }, { title: "Suggested Action" }] },
    ],
  },
  {
    name: "Compare and Contrast Essay",
    description: "Explain the similarities and differences between two subjects.",
    sections: [
      { title: "Introduction", children: [{ title: "Introduce Both Subjects" }, { title: "Explain the Purpose of the Comparison" }, { title: "Thesis Statement" }] },
      { title: "Similarities", children: [{ title: "Similarity 1" }, { title: "Similarity 2" }, { title: "Similarity 3" }] },
      { title: "Differences", children: [{ title: "Difference 1" }, { title: "Difference 2" }, { title: "Difference 3" }] },
      { title: "Conclusion", children: [{ title: "Summarize the Main Comparison" }, { title: "Explain the Most Important Difference" }, { title: "Final Thought" }] },
    ],
  },
  {
    name: "Expository Essay",
    description: "Explain a topic clearly using facts, examples, and organized information.",
    sections: [
      { title: "Introduction", children: [{ title: "Opening Statement" }, { title: "Topic Background" }, { title: "Main Idea or Thesis" }] },
      { title: "Explanation - Point 1", children: [{ title: "Main Information" }, { title: "Facts and Examples" }] },
      { title: "Explanation - Point 2", children: [{ title: "Main Information" }, { title: "Facts and Examples" }] },
      { title: "Explanation - Point 3", children: [{ title: "Main Information" }, { title: "Facts and Examples" }] },
      { title: "Conclusion", children: [{ title: "Review the Main Points" }, { title: "Restate the Main Idea" }, { title: "Closing Thought" }] },
    ],
  },
  {
    name: "Narrative Essay",
    description: "Plan a story with a beginning, important events, and a meaningful ending.",
    sections: [
      { title: "Introduction", children: [{ title: "Setting and Time" }, { title: "Main Characters" }, { title: "Opening Situation" }] },
      { title: "Beginning", children: [{ title: "Introduce the Situation" }, { title: "Describe the Main Conflict" }] },
      { title: "Middle", children: [{ title: "Important Event 1" }, { title: "Important Event 2" }, { title: "Turning Point" }] },
      { title: "Ending", children: [{ title: "Resolution" }, { title: "What Changed?" }, { title: "Lesson or Reflection" }] },
    ],
  },
  {
    name: "Descriptive Essay",
    description: "Organize vivid details to help readers imagine a person, place, object, or experience.",
    sections: [
      { title: "Introduction", children: [{ title: "Introduce the Subject" }, { title: "Overall Impression" }] },
      { title: "First Description", children: [{ title: "Visual Details" }, { title: "Colors, Shapes, and Appearance" }] },
      { title: "Sensory Details", children: [{ title: "Sounds" }, { title: "Smells and Textures" }, { title: "Other Sensory Impressions" }] },
      { title: "Personal Impression", children: [{ title: "Feelings and Reactions" }, { title: "Why the Subject Matters" }] },
      { title: "Conclusion", children: [{ title: "Final Impression" }, { title: "Memorable Closing Detail" }] },
    ],
  },
  {
    name: "Cause and Effect Essay",
    description: "Explore why something happens and what results from it.",
    sections: [
      { title: "Introduction", children: [{ title: "Introduce the Topic" }, { title: "Provide Background" }, { title: "Thesis Statement" }] },
      { title: "Causes", children: [{ title: "Cause 1" }, { title: "Cause 2" }, { title: "Cause 3" }] },
      { title: "Effects", children: [{ title: "Effect 1" }, { title: "Effect 2" }, { title: "Effect 3" }] },
      { title: "Conclusion", children: [{ title: "Summarize the Main Connections" }, { title: "Explain the Wider Impact" }, { title: "Closing Thought" }] },
    ],
  },
  {
    name: "Research Essay",
    description: "Plan a research-based essay with evidence, analysis, and references.",
    sections: [
      { title: "Introduction", children: [{ title: "Research Topic" }, { title: "Background and Context" }, { title: "Research Question" }, { title: "Thesis Statement" }] },
      { title: "Literature Review", children: [{ title: "Source 1 - Main Findings" }, { title: "Source 2 - Main Findings" }, { title: "Research Gap" }] },
      { title: "Main Discussion", children: [{ title: "Main Point 1 and Evidence" }, { title: "Main Point 2 and Evidence" }, { title: "Main Point 3 and Evidence" }] },
      { title: "Analysis", children: [{ title: "Interpretation of Evidence" }, { title: "Limitations or Different Views" }] },
      { title: "Conclusion", children: [{ title: "Summary of Findings" }, { title: "Answer to the Research Question" }, { title: "Final Implications" }] },
      { title: "References", notes: "Record the sources you used in the citation style required for your assignment." },
    ],
  },
  {
    name: "Five-Paragraph Essay",
    description: "A straightforward structure for a short essay with three body paragraphs.",
    sections: [
      { title: "Paragraph 1: Introduction", children: [{ title: "Hook" }, { title: "Background" }, { title: "Thesis Statement" }] },
      { title: "Paragraph 2: Body Point 1", children: [{ title: "Topic Sentence" }, { title: "Evidence or Example" }, { title: "Explanation" }] },
      { title: "Paragraph 3: Body Point 2", children: [{ title: "Topic Sentence" }, { title: "Evidence or Example" }, { title: "Explanation" }] },
      { title: "Paragraph 4: Body Point 3", children: [{ title: "Topic Sentence" }, { title: "Evidence or Example" }, { title: "Explanation" }] },
      { title: "Paragraph 5: Conclusion", children: [{ title: "Restated Thesis" }, { title: "Summary" }, { title: "Closing Sentence" }] },
    ],
  },
  {
    name: "Blank Essay Outline",
    description: "Start with an empty outline and organize your own ideas.",
    sections: [],
  },
];

/* -------------------------------------------------------------------------- */
/*  Generic helpers                                                           */
/* -------------------------------------------------------------------------- */

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const nowIso = () => new Date().toISOString();

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function colorHex(color: SectionColor): string {
  return COLORS.find((item) => item.id === color)?.hex || "transparent";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function tipFor(title: string): string {
  const t = title.toLowerCase();
  if (/hook|opening|attention/.test(t))
    return "Open with a surprising fact, a vivid scene, or a sharp question. Avoid dictionary definitions.";
  if (/thesis|position|main idea|research question/.test(t))
    return "State one specific, debatable claim and hint at your main reasons.";
  if (/counter|opposing|rebuttal|response/.test(t))
    return "Present the other side fairly before answering it. Fairness builds credibility.";
  if (/conclu|closing|final|ending/.test(t))
    return "Do not just repeat the introduction. Show why the argument matters and what follows from it.";
  if (/intro/.test(t))
    return "Move from broad context to your specific thesis in three to five sentences.";
  if (/evidence|example|fact/.test(t))
    return "Introduce the evidence, quote or paraphrase it, then explain how it proves your point.";
  if (/argument|reason|point|body|cause|effect|similarit|difference/.test(t))
    return "Try the PEEL pattern: Point, Evidence, Explanation, Link back to the thesis.";
  if (/reference|source|bibliograph/.test(t))
    return "Keep every source in one citation style and cross-check each in-text citation.";
  return "";
}

/* -------------------------------------------------------------------------- */
/*  Section factory + sanitizers                                              */
/* -------------------------------------------------------------------------- */

function makeSection(partial: Partial<EssaySection> = {}): EssaySection {
  return {
    id: createId(),
    title: "",
    notes: "",
    completed: false,
    collapsed: false,
    color: "none",
    wordTarget: 0,
    sourceIds: [],
    children: [],
    ...partial,
  };
}

function createSections(items: TemplateSection[]): EssaySection[] {
  return items.map((item) =>
    makeSection({
      title: item.title,
      notes: item.notes || "",
      children: item.children ? createSections(item.children) : [],
    })
  );
}

function createDocument(template: Template): EssayDocument {
  const now = nowIso();
  const blank = template.name === "Blank Essay Outline";

  return {
    id: createId(),
    title: blank ? "Untitled Essay" : `${template.name} Outline`,
    essayType: template.name,
    topic: "",
    thesis: "",
    audience: "",
    targetWords: blank ? 0 : 1000,
    citationStyle: "apa",
    sources: [],
    createdAt: now,
    updatedAt: now,
    sections: createSections(template.sections),
  };
}

const COLOR_IDS = COLORS.map((item) => item.id);

function sanitizeSection(value: unknown, keepIds: boolean, depth = 0): EssaySection | null {
  if (!value || typeof value !== "object" || depth > MAX_DEPTH) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.title !== "string") return null;

  const children = Array.isArray(item.children)
    ? item.children
        .map((child) => sanitizeSection(child, keepIds, depth + 1))
        .filter((child): child is EssaySection => child !== null)
    : [];

  const target = typeof item.wordTarget === "number" && Number.isFinite(item.wordTarget)
    ? clamp(Math.round(item.wordTarget), 0, 100000)
    : 0;

  return {
    id: keepIds && typeof item.id === "string" && item.id ? item.id : createId(),
    title: item.title.slice(0, 300),
    notes: typeof item.notes === "string" ? item.notes.slice(0, 10000) : "",
    completed: item.completed === true,
    collapsed: item.collapsed === true,
    color: COLOR_IDS.includes(item.color as SectionColor) ? (item.color as SectionColor) : "none",
    wordTarget: target,
    sourceIds: Array.isArray(item.sourceIds)
      ? item.sourceIds.filter((entry): entry is string => typeof entry === "string")
      : [],
    children,
  };
}

function sanitizeSource(value: unknown, keepIds: boolean): EssaySource | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const text = (key: string, max: number) =>
    typeof item[key] === "string" ? (item[key] as string).slice(0, max) : "";

  return {
    id: keepIds && typeof item.id === "string" && item.id ? item.id : createId(),
    author: text("author", 300),
    title: text("title", 500),
    year: text("year", 20),
    publisher: text("publisher", 300),
    url: text("url", 1000),
  };
}

function sanitizeDocument(value: unknown, keepIds: boolean): EssayDocument | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (!Array.isArray(item.sections)) return null;

  const now = nowIso();
  const sources = Array.isArray(item.sources)
    ? item.sources
        .map((entry) => sanitizeSource(entry, keepIds))
        .filter((entry): entry is EssaySource => entry !== null)
    : [];

  const sourceIdMap = new Set(sources.map((source) => source.id));

  const stripUnknownSources = (sections: EssaySection[]): EssaySection[] =>
    sections.map((section) => ({
      ...section,
      sourceIds: section.sourceIds.filter((id) => sourceIdMap.has(id)),
      children: stripUnknownSources(section.children),
    }));

  const sections = stripUnknownSources(
    item.sections
      .map((entry) => sanitizeSection(entry, keepIds))
      .filter((entry): entry is EssaySection => entry !== null)
  );

  return {
    id: keepIds && typeof item.id === "string" && item.id ? item.id : createId(),
    title: typeof item.title === "string" ? item.title.slice(0, 200) : "Imported Essay",
    essayType: typeof item.essayType === "string" ? item.essayType.slice(0, 100) : "Custom Essay",
    topic: typeof item.topic === "string" ? item.topic.slice(0, 2000) : "",
    thesis: typeof item.thesis === "string" ? item.thesis.slice(0, 5000) : "",
    audience: typeof item.audience === "string" ? item.audience.slice(0, 500) : "",
    targetWords:
      typeof item.targetWords === "number" && Number.isFinite(item.targetWords)
        ? clamp(Math.round(item.targetWords), 0, 1000000)
        : 0,
    citationStyle:
      item.citationStyle === "mla" || item.citationStyle === "chicago" ? item.citationStyle : "apa",
    sources,
    createdAt: keepIds && typeof item.createdAt === "string" ? item.createdAt : now,
    updatedAt: keepIds && typeof item.updatedAt === "string" ? item.updatedAt : now,
    sections,
  };
}

/* -------------------------------------------------------------------------- */
/*  Tree helpers                                                              */
/* -------------------------------------------------------------------------- */

function mapSections(
  sections: EssaySection[],
  fn: (section: EssaySection) => EssaySection
): EssaySection[] {
  return sections.map((section) =>
    fn({ ...section, children: mapSections(section.children, fn) })
  );
}

function updateSectionTree(
  sections: EssaySection[],
  id: string,
  updater: (section: EssaySection) => EssaySection
): EssaySection[] {
  return sections.map((section) => {
    if (section.id === id) return updater(section);
    return { ...section, children: updateSectionTree(section.children, id, updater) };
  });
}

function findSection(sections: EssaySection[], id: string): EssaySection | null {
  for (const section of sections) {
    if (section.id === id) return section;
    const found = findSection(section.children, id);
    if (found) return found;
  }
  return null;
}

function containsSection(section: EssaySection, id: string): boolean {
  if (section.id === id) return true;
  return section.children.some((child) => containsSection(child, id));
}

function extractSection(
  sections: EssaySection[],
  id: string
): { tree: EssaySection[]; removed: EssaySection | null } {
  const holder: { value: EssaySection | null } = { value: null };

  const walk = (items: EssaySection[]): EssaySection[] => {
    const output: EssaySection[] = [];
    for (const item of items) {
      if (item.id === id) {
        holder.value = item;
        continue;
      }
      output.push({ ...item, children: walk(item.children) });
    }
    return output;
  };

  const tree = walk(sections);
  return { tree, removed: holder.value };
}

function insertAt(list: EssaySection[], index: number, node: EssaySection): EssaySection[] {
  const copy = [...list];
  copy.splice(clamp(index, 0, copy.length), 0, node);
  return copy;
}

function insertSection(
  sections: EssaySection[],
  parentId: string | null,
  index: number,
  node: EssaySection
): EssaySection[] {
  if (parentId === null) return insertAt(sections, index, node);

  return sections.map((section) => {
    if (section.id === parentId) {
      return { ...section, collapsed: false, children: insertAt(section.children, index, node) };
    }
    return { ...section, children: insertSection(section.children, parentId, index, node) };
  });
}

type Location = { parentId: string | null; index: number; siblings: EssaySection[] };

function locate(
  sections: EssaySection[],
  id: string,
  parentId: string | null = null
): Location | null {
  for (let index = 0; index < sections.length; index += 1) {
    if (sections[index].id === id) return { parentId, index, siblings: sections };
    const found = locate(sections[index].children, id, sections[index].id);
    if (found) return found;
  }
  return null;
}

function moveSection(
  sections: EssaySection[],
  sourceId: string,
  targetId: string,
  position: DropPosition
): EssaySection[] {
  if (sourceId === targetId) return sections;
  const source = findSection(sections, sourceId);
  if (!source || containsSection(source, targetId)) return sections;

  const { tree, removed } = extractSection(sections, sourceId);
  if (!removed) return sections;

  if (position === "inside") {
    return insertSection(tree, targetId, Number.MAX_SAFE_INTEGER, removed);
  }

  const location = locate(tree, targetId);
  if (!location) return sections;

  return insertSection(
    tree,
    location.parentId,
    position === "before" ? location.index : location.index + 1,
    removed
  );
}

function moveToRootEnd(sections: EssaySection[], sourceId: string): EssaySection[] {
  const { tree, removed } = extractSection(sections, sourceId);
  if (!removed) return sections;
  return insertAt(tree, tree.length, removed);
}

function shiftSection(sections: EssaySection[], id: string, direction: -1 | 1): EssaySection[] {
  const location = locate(sections, id);
  if (!location) return sections;

  const newIndex = location.index + direction;
  if (newIndex < 0 || newIndex >= location.siblings.length) return sections;

  const { tree, removed } = extractSection(sections, id);
  if (!removed) return sections;
  return insertSection(tree, location.parentId, newIndex, removed);
}

function indentSection(sections: EssaySection[], id: string): EssaySection[] {
  const location = locate(sections, id);
  if (!location || location.index === 0) return sections;

  const previous = location.siblings[location.index - 1];
  const { tree, removed } = extractSection(sections, id);
  if (!removed) return sections;
  return insertSection(tree, previous.id, Number.MAX_SAFE_INTEGER, removed);
}

function outdentSection(sections: EssaySection[], id: string): EssaySection[] {
  const location = locate(sections, id);
  if (!location || location.parentId === null) return sections;

  const parentLocation = locate(sections, location.parentId);
  if (!parentLocation) return sections;

  const { tree, removed } = extractSection(sections, id);
  if (!removed) return sections;
  return insertSection(tree, parentLocation.parentId, parentLocation.index + 1, removed);
}

function cloneSection(section: EssaySection, rename: boolean): EssaySection {
  return {
    ...section,
    id: createId(),
    title: rename ? `${section.title} (Copy)` : section.title,
    sourceIds: [...section.sourceIds],
    children: section.children.map((child) => cloneSection(child, false)),
  };
}

function buildNumbering(
  sections: EssaySection[],
  prefix = "",
  map: Record<string, string> = {}
): Record<string, string> {
  sections.forEach((section, index) => {
    const number = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
    map[section.id] = number;
    buildNumbering(section.children, number, map);
  });
  return map;
}

const numLabel = (num: string) => (num.includes(".") ? num : `${num}.`);

function countSections(sections: EssaySection[]): number {
  return sections.reduce((total, section) => total + 1 + countSections(section.children), 0);
}

function countCompleted(sections: EssaySection[]): number {
  return sections.reduce(
    (total, section) => total + (section.completed ? 1 : 0) + countCompleted(section.children),
    0
  );
}

function countLeaves(sections: EssaySection[]): number {
  return sections.reduce(
    (total, section) => total + (section.children.length ? countLeaves(section.children) : 1),
    0
  );
}

function countNoteWords(sections: EssaySection[]): number {
  return sections.reduce(
    (total, section) => total + wordCount(section.notes) + countNoteWords(section.children),
    0
  );
}

function effectiveTarget(section: EssaySection): number {
  if (section.wordTarget > 0) return section.wordTarget;
  return section.children.reduce((total, child) => total + effectiveTarget(child), 0);
}

function noteWordsDeep(section: EssaySection): number {
  return (
    wordCount(section.notes) +
    section.children.reduce((total, child) => total + noteWordsDeep(child), 0)
  );
}

function distributeTargets(sections: EssaySection[], total: number): EssaySection[] {
  const leaves = countLeaves(sections);
  if (!leaves || total <= 0) return sections;

  const base = Math.floor(total / leaves);
  let remainder = total - base * leaves;

  const walk = (items: EssaySection[]): EssaySection[] =>
    items.map((section) => {
      if (!section.children.length) {
        const extra = remainder > 0 ? 1 : 0;
        remainder -= extra;
        return { ...section, wordTarget: base + extra };
      }
      return { ...section, wordTarget: 0, children: walk(section.children) };
    });

  return walk(sections);
}

function computeVisible(sections: EssaySection[], term: string): Set<string> | null {
  const query = term.trim().toLowerCase();
  if (!query) return null;

  const visible = new Set<string>();

  const walk = (section: EssaySection): boolean => {
    const self =
      section.title.toLowerCase().includes(query) || section.notes.toLowerCase().includes(query);
    let any = false;
    section.children.forEach((child) => {
      if (walk(child)) any = true;
    });
    if (self || any) visible.add(section.id);
    return self || any;
  };

  sections.forEach(walk);
  return visible;
}

function toTemplateSections(sections: EssaySection[]): TemplateSection[] {
  return sections.map((section) => ({
    title: section.title,
    notes: section.notes || undefined,
    children: section.children.length ? toTemplateSections(section.children) : undefined,
  }));
}

function parseOutlineText(text: string): EssaySection[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const root: EssaySection[] = [];
  const stack: { indent: number; node: EssaySection }[] = [];

  for (const raw of lines) {
    const expanded = raw.replace(/\t/g, "  ");
    const indent = (expanded.match(/^\s*/)?.[0] || "").length;
    const title = expanded
      .trim()
      .replace(/^(?:[-*•]|\d+(?:\.\d+)*[.)]?)\s+/, "")
      .slice(0, 300);
    if (!title) continue;

    const node = makeSection({ title });
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();

    if (stack.length) stack[stack.length - 1].node.children.push(node);
    else root.push(node);

    stack.push({ indent, node });
  }

  return root;
}

/* -------------------------------------------------------------------------- */
/*  Citations                                                                 */
/* -------------------------------------------------------------------------- */

function shortAuthor(author: string): string {
  const first = author.split(/;| and | & /)[0].trim();
  if (!first) return "Unknown";
  if (first.includes(",")) return first.split(",")[0].trim() || "Unknown";
  const parts = first.split(/\s+/);
  return parts[parts.length - 1] || "Unknown";
}

function citeFor(ids: string[], sources: EssaySource[], style: CitationStyle): string {
  const items = ids
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is EssaySource => !!source)
    .map((source) => {
      const name = shortAuthor(source.author);
      const year = source.year.trim() || "n.d.";
      if (style === "mla") return name;
      if (style === "chicago") return `${name} ${year}`;
      return `${name}, ${year}`;
    });

  return items.length ? `(${items.join("; ")})` : "";
}

function formatCitation(source: EssaySource, style: CitationStyle): string {
  const author = source.author.trim();
  const title = source.title.trim();
  const year = source.year.trim();
  const publisher = source.publisher.trim();
  const url = source.url.trim();

  if (style === "mla") {
    const pubYear = [publisher, year].filter(Boolean).join(", ");
    return [
      author ? `${author}.` : "",
      title ? `"${title}."` : "",
      pubYear ? `${pubYear}.` : "",
      url ? `${url}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (style === "chicago") {
    return [
      author ? `${author}.` : "",
      `${year || "n.d."}.`,
      title ? `"${title}."` : "",
      publisher ? `${publisher}.` : "",
      url ? `${url}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    author ? `${author}.` : "",
    `(${year || "n.d."}).`,
    title ? `${title}.` : "",
    publisher ? `${publisher}.` : "",
    url,
  ]
    .filter(Boolean)
    .join(" ");
}

function bibliography(doc: EssayDocument): string[] {
  return [...doc.sources]
    .sort((a, b) => shortAuthor(a.author).localeCompare(shortAuthor(b.author)))
    .map((source) => formatCitation(source, doc.citationStyle))
    .filter((line) => line.trim());
}

/* -------------------------------------------------------------------------- */
/*  Exporters                                                                 */
/* -------------------------------------------------------------------------- */

function sectionMeta(section: EssaySection, doc: EssayDocument): string {
  const cites = citeFor(section.sourceIds, doc.sources, doc.citationStyle);
  return [
    section.wordTarget > 0 ? `Target: ${section.wordTarget} words` : "",
    cites ? `Sources: ${cites}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function sectionsToText(
  sections: EssaySection[],
  numbering: Record<string, string>,
  doc: EssayDocument,
  depth = 0
): string {
  return sections
    .map((section) => {
      const indent = "  ".repeat(depth);
      const lines = [`${indent}${numLabel(numbering[section.id])} ${section.title}${section.completed ? " [done]" : ""}`];

      if (section.notes.trim()) {
        section.notes
          .trim()
          .split(/\r?\n/)
          .forEach((line, index) => lines.push(`${indent}   ${index === 0 ? "Notes: " : "       "}${line}`));
      }

      const meta = sectionMeta(section, doc);
      if (meta) lines.push(`${indent}   ${meta}`);

      const children = sectionsToText(section.children, numbering, doc, depth + 1);
      return [lines.join("\n"), children].filter(Boolean).join("\n");
    })
    .join("\n");
}

function sectionsToMarkdown(
  sections: EssaySection[],
  numbering: Record<string, string>,
  doc: EssayDocument,
  depth = 0
): string {
  return sections
    .map((section) => {
      const level = Math.min(depth + 2, 6);
      const heading = `${"#".repeat(level)} ${numLabel(numbering[section.id])} ${section.title}`;
      const notes = section.notes.trim() ? `\n\n${section.notes.trim()}` : "";
      const meta = sectionMeta(section, doc);
      const metaLine = meta ? `\n\n*${meta}*` : "";
      const children = sectionsToMarkdown(section.children, numbering, doc, depth + 1);
      return [heading + notes + metaLine, children].filter(Boolean).join("\n\n");
    })
    .join("\n\n");
}

function buildText(doc: EssayDocument): string {
  const numbering = buildNumbering(doc.sections);
  const header = [
    doc.title,
    `Essay type: ${doc.essayType}`,
    doc.topic ? `Topic: ${doc.topic}` : "",
    doc.audience ? `Audience: ${doc.audience}` : "",
    doc.thesis ? `Thesis: ${doc.thesis}` : "",
    doc.targetWords ? `Target length: ${doc.targetWords} words` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const refs = bibliography(doc);
  const refText = refs.length ? `\n\nReferences\n${refs.map((line) => `- ${line}`).join("\n")}` : "";

  return `${header}\n\n${sectionsToText(doc.sections, numbering, doc)}${refText}\n`;
}

function buildMarkdown(doc: EssayDocument): string {
  const numbering = buildNumbering(doc.sections);
  const parts = [
    `# ${doc.title}`,
    `**Essay type:** ${doc.essayType}`,
    doc.topic ? `**Topic:** ${doc.topic}` : "",
    doc.audience ? `**Target audience:** ${doc.audience}` : "",
    doc.thesis ? `**Thesis statement:** ${doc.thesis}` : "",
    doc.targetWords ? `**Target length:** ${doc.targetWords} words` : "",
    sectionsToMarkdown(doc.sections, numbering, doc),
  ].filter(Boolean);

  const refs = bibliography(doc);
  if (refs.length) parts.push(`## References\n\n${refs.map((line) => `- ${line}`).join("\n")}`);

  return `${parts.join("\n\n")}\n`;
}

function sectionsToHtml(
  sections: EssaySection[],
  numbering: Record<string, string>,
  doc: EssayDocument,
  depth = 0
): string {
  return sections
    .map((section) => {
      const level = Math.min(depth + 2, 6);
      const meta = sectionMeta(section, doc);
      return [
        `<h${level}>${escapeHtml(numLabel(numbering[section.id]))} ${escapeHtml(section.title)}</h${level}>`,
        section.notes.trim()
          ? `<p>${escapeHtml(section.notes.trim()).replace(/\r?\n/g, "<br>")}</p>`
          : "",
        meta ? `<p class="meta">${escapeHtml(meta)}</p>` : "",
        sectionsToHtml(section.children, numbering, doc, depth + 1),
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

function buildHtml(doc: EssayDocument): string {
  const numbering = buildNumbering(doc.sections);
  const refs = bibliography(doc);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.title)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #1f2430; max-width: 780px; margin: 40px auto; padding: 0 24px; line-height: 1.65; }
  h1 { font-size: 30px; margin: 0 0 6px; }
  h2 { font-size: 21px; margin: 28px 0 6px; border-bottom: 1px solid #e5e5ea; padding-bottom: 4px; }
  h3 { font-size: 17px; margin: 18px 0 4px; }
  h4, h5, h6 { font-size: 15px; margin: 14px 0 4px; }
  p { margin: 4px 0 8px; }
  .meta { color: #6b7080; font-size: 13px; font-style: italic; }
  .info { color: #555a68; font-size: 14px; margin-bottom: 18px; }
  .thesis { border-left: 4px solid #ff5a1f; background: #fff4ef; padding: 10px 14px; margin: 14px 0; border-radius: 4px; }
  ul.refs { padding-left: 20px; }
  ul.refs li { margin-bottom: 6px; }
  @media print { body { margin: 0 auto; } }
</style>
</head>
<body>
<h1>${escapeHtml(doc.title)}</h1>
<div class="info">${escapeHtml(doc.essayType)}${doc.topic ? ` &middot; ${escapeHtml(doc.topic)}` : ""}${doc.audience ? ` &middot; Audience: ${escapeHtml(doc.audience)}` : ""}${doc.targetWords ? ` &middot; Target: ${doc.targetWords} words` : ""}</div>
${doc.thesis ? `<div class="thesis"><strong>Thesis:</strong> ${escapeHtml(doc.thesis)}</div>` : ""}
${sectionsToHtml(doc.sections, numbering, doc)}
${refs.length ? `<h2>References</h2>\n<ul class="refs">${refs.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*  Analysis                                                                  */
/* -------------------------------------------------------------------------- */

type Check = { label: string; ok: boolean; tip: string };

function analyzeThesis(thesis: string): { score: number; words: number; checks: Check[] } {
  const text = thesis.trim();
  const words = wordCount(text);
  if (!text) return { score: 0, words, checks: [] };

  const checks: Check[] = [
    {
      label: "Good length (12 to 60 words)",
      ok: words >= 12 && words <= 60,
      tip: words < 12 ? "Add more detail about your claim and reasons." : "Tighten it; a thesis works best in one or two sentences.",
    },
    {
      label: "Takes a clear stance",
      ok: /\b(should|must|ought|need to|needs to|important|essential|critical|necessary|harmful|beneficial|vital|better|worse|best|worst|effective|ineffective|deserve|requires?|more\b.*\bthan|less\b.*\bthan)\b/i.test(text),
      tip: "Make a debatable claim, for example with words like should, must, or better than.",
    },
    {
      label: "Previews a reason",
      ok: /\b(because|since|due to|through|by\s+\w+ing|as a result|therefore|so that|while|although|which)\b/i.test(text),
      tip: "Hint at why your claim is true using because, since, or a short list of reasons.",
    },
    {
      label: "Not just an announcement",
      ok: !/^(in this essay|this essay|i will|i am going to|i'm going to|the purpose of this|this paper)/i.test(text),
      tip: "Avoid starting with 'This essay will'. State the claim itself.",
    },
    {
      label: "Not phrased as a question",
      ok: !text.endsWith("?"),
      tip: "Turn your question into a statement that answers it.",
    },
    {
      label: "Specific wording",
      ok: !/\b(good|bad|stuff|things?|very|a lot|many things)\b/i.test(text),
      tip: "Replace vague words like good, bad, or things with precise ones.",
    },
  ];

  const passed = checks.filter((check) => check.ok).length;
  return { score: Math.round((passed / checks.length) * 100), words, checks };
}

function analyzeOutline(doc: EssayDocument): Check[] {
  const flat: EssaySection[] = [];
  const walk = (items: EssaySection[]) =>
    items.forEach((item) => {
      flat.push(item);
      walk(item.children);
    });
  walk(doc.sections);

  const withNotes = flat.filter((section) => section.notes.trim()).length;
  const emptyTitles = flat.filter((section) => !section.title.trim()).length;
  const allocated = doc.sections.reduce((total, section) => total + effectiveTarget(section), 0);

  const checks: Check[] = [
    {
      label: "Essay title, topic and thesis are filled in",
      ok: !!doc.title.trim() && !!doc.topic.trim() && !!doc.thesis.trim(),
      tip: "Complete the essay details so your outline has a clear direction.",
    },
    {
      label: "Has an introduction",
      ok: doc.sections.some((section) => /intro|opening|beginning|paragraph 1/i.test(section.title)),
      tip: "Add an introduction section that leads into your thesis.",
    },
    {
      label: "Has a conclusion",
      ok: doc.sections.some((section) => /conclu|ending|closing/i.test(section.title)),
      tip: "Add a conclusion that explains why your argument matters.",
    },
    {
      label: "At least three main sections",
      ok: doc.sections.length >= 3,
      tip: "Most essays need an introduction, a body, and a conclusion at minimum.",
    },
    {
      label: "Every section has a title",
      ok: flat.length > 0 && emptyTitles === 0,
      tip: "Give each section a short descriptive title.",
    },
    {
      label: "At least half of the sections have notes",
      ok: flat.length > 0 && withNotes / flat.length >= 0.5,
      tip: "Add evidence, examples, or ideas to your sections before you write.",
    },
  ];

  if (doc.targetWords > 0) {
    const diff = Math.abs(allocated - doc.targetWords);
    checks.push({
      label: "Section word targets match the essay target",
      ok: allocated > 0 && diff <= doc.targetWords * 0.1,
      tip: "Use 'Spread word targets' to divide the target across your sections, then fine-tune.",
    });
  }

  return checks;
}

/* -------------------------------------------------------------------------- */
/*  Section tree component                                                    */
/* -------------------------------------------------------------------------- */

type SectionTreeProps = {
  sections: EssaySection[];
  numbering: Record<string, string>;
  selectedId: string | null;
  visible: Set<string> | null;
  draggingId: string | null;
  dropHint: DropHint | null;
  doc: EssayDocument;
  onSelect: (id: string) => void;
  onAddChild: (id: string) => void;
  onToggleDone: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDragStartRow: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDragEndRow: () => void;
  onDragOverRow: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDragLeaveRow: (id: string) => void;
  onDropRow: (event: DragEvent<HTMLDivElement>, id: string) => void;
};

function SectionTree(props: SectionTreeProps) {
  const { sections, numbering, selectedId, visible, draggingId, dropHint, doc } = props;
  const items = visible ? sections.filter((section) => visible.has(section.id)) : sections;
  if (!items.length) return null;

  return (
    <div className="eob-tree">
      {items.map((section) => {
        const hasChildren = section.children.length > 0;
        const open = !section.collapsed || visible !== null;
        const hint = dropHint && dropHint.id === section.id ? dropHint.pos : null;
        const noteWords = wordCount(section.notes);
        const target = effectiveTarget(section);
        const cites = citeFor(section.sourceIds, doc.sources, doc.citationStyle);

        return (
          <div className="eob-tree-item" key={section.id}>
            <div
              className={[
                "eob-row",
                selectedId === section.id ? "selected" : "",
                section.completed ? "completed" : "",
                draggingId === section.id ? "dragging" : "",
                hint ? `drop-${hint}` : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ "--eob-dot": colorHex(section.color) } as CSSProperties}
              draggable
              onDragStart={(event) => props.onDragStartRow(event, section.id)}
              onDragEnd={props.onDragEndRow}
              onDragOver={(event) => props.onDragOverRow(event, section.id)}
              onDragLeave={() => props.onDragLeaveRow(section.id)}
              onDrop={(event) => props.onDropRow(event, section.id)}
            >
              <button
                type="button"
                className={`eob-caret ${hasChildren ? "" : "empty"}`}
                onClick={() => hasChildren && props.onToggleCollapse(section.id)}
                aria-label={open ? "Collapse subsections" : "Expand subsections"}
                tabIndex={hasChildren ? 0 : -1}
              >
                {hasChildren ? (open ? "▾" : "▸") : ""}
              </button>

              <button
                type="button"
                className="eob-row-main"
                onClick={() => props.onSelect(section.id)}
                title="Select to edit. Drag to reorder or nest."
              >
                <span className="eob-num">{numbering[section.id]}</span>
                <span className="eob-row-text">
                  <span className="eob-row-title">{section.title || "Untitled section"}</span>
                  {(noteWords > 0 || target > 0 || cites) && (
                    <span className="eob-row-meta">
                      {noteWords > 0 && <span>{noteWords} words of notes</span>}
                      {target > 0 && <span>Target {target}w</span>}
                      {cites && <span>{cites}</span>}
                    </span>
                  )}
                </span>
              </button>

              <div className="eob-row-actions">
                <button
                  type="button"
                  className={`eob-icon ${section.completed ? "is-done" : ""}`}
                  onClick={() => props.onToggleDone(section.id)}
                  title={section.completed ? "Mark as incomplete" : "Mark as complete"}
                >
                  {section.completed ? "✓" : "○"}
                </button>
                <button type="button" className="eob-icon" onClick={() => props.onAddChild(section.id)} title="Add subsection">
                  +
                </button>
                <button type="button" className="eob-icon" onClick={() => props.onDuplicate(section.id)} title="Duplicate section">
                  ⧉
                </button>
                <button type="button" className="eob-icon danger" onClick={() => props.onDelete(section.id)} title="Delete section">
                  ×
                </button>
              </div>
            </div>

            {hasChildren && open && (
              <div className="eob-children">
                <SectionTree {...props} sections={section.children} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PreviewTree({
  sections,
  numbering,
  doc,
  depth = 0,
}: {
  sections: EssaySection[];
  numbering: Record<string, string>;
  doc: EssayDocument;
  depth?: number;
}) {
  return (
    <>
      {sections.map((section) => {
        const Tag = `h${Math.min(depth + 3, 6)}` as "h3" | "h4" | "h5" | "h6";
        const meta = sectionMeta(section, doc);

        return (
          <div key={section.id} className="eob-prev-section">
            <Tag>
              <span className="eob-prev-num">{numLabel(numbering[section.id])}</span>{" "}
              {section.title || "Untitled section"}
            </Tag>
            {section.notes.trim() && <p className="eob-prev-notes">{section.notes.trim()}</p>}
            {meta && <p className="eob-prev-meta">{meta}</p>}
            <PreviewTree sections={section.children} numbering={numbering} doc={doc} depth={depth + 1} />
          </div>
        );
      })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export default function EssayOutlineBuilder() {
  const [documents, setDocuments] = useState<EssayDocument[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [docSort, setDocSort] = useState<"created" | "recent" | "name">("created");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const [view, setView] = useState<ViewMode>("outline");
  const [theme, setTheme] = useState<Theme>("light");
  const [focusMode, setFocusMode] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const [, setHistoryTick] = useState(0);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<number | undefined>(undefined);
  const historyRef = useRef<Record<string, { past: EssayDocument[]; future: EssayDocument[] }>>({});
  const lastEditRef = useRef<{ key: string; time: number }>({ key: "", time: 0 });
  const shortcutRef = useRef<(event: KeyboardEvent) => void>(() => {});

  /* ----------------------------- notifications ----------------------------- */

  const notify = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 4200);
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  /* ------------------------------ load / save ------------------------------ */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { documents?: unknown[]; activeId?: string | null };
        if (Array.isArray(parsed.documents)) {
          const loaded = parsed.documents
            .map((item) => sanitizeDocument(item, true))
            .filter((item): item is EssayDocument => item !== null);

          if (loaded.length) {
            setDocuments(loaded);
            setActiveId(
              loaded.some((doc) => doc.id === parsed.activeId) ? (parsed.activeId as string) : loaded[0].id
            );
          }
        }
      }
    } catch {
      setNotice("Saved outlines could not be loaded. You can start a new outline.");
    }

    try {
      const savedTemplates = localStorage.getItem(TEMPLATE_KEY);
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates) as unknown;
        if (Array.isArray(parsed)) {
          const valid = parsed
            .filter(
              (item): item is Template =>
                !!item && typeof item === "object" && typeof (item as Template).name === "string" && Array.isArray((item as Template).sections)
            )
            .map((item) => ({ ...item, custom: true }));
          setCustomTemplates(valid);
        }
      }
    } catch {
      /* ignore broken template storage */
    }

    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) setTheme("dark");
    } catch {
      /* ignore */
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents, activeId }));
      setSavedAt(new Date());
    } catch {
      setNotice("Your browser storage may be full. Download a JSON backup to keep your work safe.");
    }
  }, [documents, activeId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify(customTemplates));
    } catch {
      /* ignore */
    }
  }, [customTemplates, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme, hydrated]);

  /* ------------------------------- derived -------------------------------- */

  const activeDocument = documents.find((doc) => doc.id === activeId) || null;

  const selectedSection = useMemo(
    () => (activeDocument && selectedId ? findSection(activeDocument.sections, selectedId) : null),
    [activeDocument, selectedId]
  );

  const numbering = useMemo(
    () => (activeDocument ? buildNumbering(activeDocument.sections) : {}),
    [activeDocument]
  );

  const visibleIds = useMemo(
    () => (activeDocument ? computeVisible(activeDocument.sections, search) : null),
    [activeDocument, search]
  );

  const totalSections = activeDocument ? countSections(activeDocument.sections) : 0;
  const completedSections = activeDocument ? countCompleted(activeDocument.sections) : 0;
  const progress = totalSections ? Math.round((completedSections / totalSections) * 100) : 0;
  const noteWords = activeDocument ? countNoteWords(activeDocument.sections) : 0;
  const allocatedWords = activeDocument
    ? activeDocument.sections.reduce((total, section) => total + effectiveTarget(section), 0)
    : 0;

  const history = activeDocument ? historyRef.current[activeDocument.id] : undefined;
  const canUndo = !!history && history.past.length > 0;
  const canRedo = !!history && history.future.length > 0;

  const thesisAnalysis = useMemo(
    () => analyzeThesis(activeDocument?.thesis || ""),
    [activeDocument?.thesis]
  );

  const outlineChecks = useMemo(
    () => (activeDocument ? analyzeOutline(activeDocument) : []),
    [activeDocument]
  );

  const sortedDocuments = useMemo(() => {
    const term = docSearch.trim().toLowerCase();
    const list = documents.filter(
      (doc) =>
        !term ||
        doc.title.toLowerCase().includes(term) ||
        doc.essayType.toLowerCase().includes(term) ||
        doc.topic.toLowerCase().includes(term)
    );

    if (docSort === "name") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (docSort === "recent") return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [documents, docSearch, docSort]);

  /* ------------------------------ state commit ----------------------------- */

  function commit(
    updater: (doc: EssayDocument) => EssayDocument,
    options: { key?: string; history?: boolean } = {}
  ) {
    if (!activeDocument) return;

    const before = activeDocument;
    const after: EssayDocument = { ...updater(before), updatedAt: nowIso() };

    if (options.history !== false) {
      const entry = historyRef.current[before.id] ?? { past: [], future: [] };
      const nowMs = Date.now();
      const coalesce =
        !!options.key &&
        lastEditRef.current.key === options.key &&
        nowMs - lastEditRef.current.time < 1200;

      if (!coalesce) {
        entry.past.push(before);
        if (entry.past.length > MAX_HISTORY) entry.past.shift();
      }

      entry.future = [];
      historyRef.current[before.id] = entry;
      lastEditRef.current = { key: options.key || "", time: nowMs };
    }

    setDocuments((current) => current.map((doc) => (doc.id === before.id ? after : doc)));
    setHistoryTick((tick) => tick + 1);
  }

  function undo() {
    if (!activeDocument) return;
    const entry = historyRef.current[activeDocument.id];
    if (!entry || !entry.past.length) {
      notify("Nothing to undo.");
      return;
    }

    const previous = entry.past.pop() as EssayDocument;
    entry.future.push(activeDocument);
    lastEditRef.current = { key: "", time: 0 };
    setDocuments((current) => current.map((doc) => (doc.id === previous.id ? previous : doc)));
    setHistoryTick((tick) => tick + 1);
    notify("Undone.");
  }

  function redo() {
    if (!activeDocument) return;
    const entry = historyRef.current[activeDocument.id];
    if (!entry || !entry.future.length) {
      notify("Nothing to redo.");
      return;
    }

    const next = entry.future.pop() as EssayDocument;
    entry.past.push(activeDocument);
    lastEditRef.current = { key: "", time: 0 };
    setDocuments((current) => current.map((doc) => (doc.id === next.id ? next : doc)));
    setHistoryTick((tick) => tick + 1);
    notify("Redone.");
  }

  /* ------------------------------ custom dialogs --------------------------- */

  function askConfirm(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
    setDialogValue("");
    setDialog({ title, message, confirmLabel, danger: true, input: false, onConfirm: () => onConfirm() });
  }

  function askPrompt(
    title: string,
    message: string,
    initial: string,
    confirmLabel: string,
    onConfirm: (value: string) => void
  ) {
    setDialogValue(initial);
    setDialog({
      title,
      message,
      confirmLabel,
      danger: false,
      input: true,
      placeholder: "Type a name...",
      onConfirm,
    });
  }

  function closeDialog() {
    setDialog(null);
  }

  function submitDialog() {
    if (!dialog) return;
    const value = dialogValue.trim();
    if (dialog.input && !value) return;
    const current = dialog;
    setDialog(null);
    current.onConfirm(value);
  }

  /* ------------------------------ document ops ----------------------------- */

  function createNewOutline(template: Template) {
    const doc = createDocument(template);
    setDocuments((current) => [...current, doc]);
    setActiveId(doc.id);
    setSelectedId(null);
    setSearch("");
    setView("outline");
    setShowTemplates(false);
    notify(`${template.name} created.`);
  }

  function deleteDocument(id: string) {
    const doc = documents.find((item) => item.id === id);
    if (!doc) return;
    askConfirm(
      "Delete this essay?",
      `"${doc.title}" will be permanently deleted. This cannot be undone.`,
      "Delete essay",
      () => {
        const remaining = documents.filter((item) => item.id !== id);
        delete historyRef.current[id];
        setDocuments(remaining);

        if (activeId === id) {
          setActiveId(remaining[0]?.id || null);
          setSelectedId(null);
        }
        notify("Outline deleted.");
      }
    );
  }

  function renameDocument(id: string) {
    const current = documents.find((doc) => doc.id === id);
    if (!current) return;

    askPrompt("Rename outline", "Enter a new name for this essay outline.", current.title, "Rename", (value) => {
      setDocuments((items) =>
        items.map((doc) =>
          doc.id === id ? { ...doc, title: value.slice(0, 200), updatedAt: nowIso() } : doc
        )
      );
      notify("Outline renamed.");
    });
  }

  function duplicateDocument(id: string) {
    const original = documents.find((doc) => doc.id === id);
    if (!original) return;

    const sourceMap = new Map<string, string>();
    const sources = original.sources.map((source) => {
      const newId = createId();
      sourceMap.set(source.id, newId);
      return { ...source, id: newId };
    });

    const regenerate = (items: EssaySection[]): EssaySection[] =>
      items.map((section) => ({
        ...section,
        id: createId(),
        sourceIds: section.sourceIds.map((sourceId) => sourceMap.get(sourceId) || sourceId),
        children: regenerate(section.children),
      }));

    const duplicate: EssayDocument = {
      ...original,
      id: createId(),
      title: `${original.title} (Copy)`,
      sources,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sections: regenerate(original.sections),
    };

    setDocuments((current) => [...current, duplicate]);
    setActiveId(duplicate.id);
    setSelectedId(null);
    notify("Outline duplicated.");
  }

  function patchDocument(patch: Partial<EssayDocument>, key?: string) {
    commit((doc) => ({ ...doc, ...patch }), { key });
  }

  function saveAsTemplate() {
    if (!activeDocument) return;
    const source = activeDocument;
    if (!source.sections.length) {
      notify("Add some sections first, then save the structure as a template.");
      return;
    }

    askPrompt(
      "Save as template",
      "Give your template a name. Its sections and notes will be reusable for new essays.",
      source.title,
      "Save template",
      (name) => {
        const template: Template = {
          name: name.slice(0, 80),
          description: `Custom template with ${countSections(source.sections)} sections.`,
          sections: toTemplateSections(source.sections),
          custom: true,
        };

        setCustomTemplates((current) => [...current, template]);
        notify(`Template "${template.name}" saved. Find it under Create New Essay.`);
      }
    );
  }

  function deleteCustomTemplate(index: number) {
    const template = customTemplates[index];
    if (!template) return;
    askConfirm(
      "Delete this template?",
      `The template "${template.name}" will be removed. Essays already created from it are not affected.`,
      "Delete template",
      () => {
        setCustomTemplates((current) => current.filter((_, position) => position !== index));
        notify("Template deleted.");
      }
    );
  }

  /* ------------------------------ section ops ------------------------------ */

  function addSection(parentId?: string) {
    const section = makeSection({ title: parentId ? "New Subsection" : "New Section" });

    commit((doc) => ({
      ...doc,
      sections: parentId
        ? insertSection(doc.sections, parentId, Number.MAX_SAFE_INTEGER, section)
        : [...doc.sections, section],
    }));

    setView("outline");
    setSelectedId(section.id);
    notify(parentId ? "Subsection added." : "Section added.");
  }

  function patchSelected(patch: Partial<EssaySection>, key?: string) {
    if (!selectedId) return;
    commit(
      (doc) => ({
        ...doc,
        sections: updateSectionTree(doc.sections, selectedId, (section) => ({ ...section, ...patch })),
      }),
      { key: key ? `${key}:${selectedId}` : undefined }
    );
  }

  function toggleDone(id: string) {
    commit((doc) => ({
      ...doc,
      sections: updateSectionTree(doc.sections, id, (section) => ({
        ...section,
        completed: !section.completed,
      })),
    }));
  }

  function toggleCollapse(id: string) {
    commit(
      (doc) => ({
        ...doc,
        sections: updateSectionTree(doc.sections, id, (section) => ({
          ...section,
          collapsed: !section.collapsed,
        })),
      }),
      { history: false }
    );
  }

  function setAllCollapsed(collapsed: boolean) {
    commit(
      (doc) => ({
        ...doc,
        sections: mapSections(doc.sections, (section) => ({
          ...section,
          collapsed: section.children.length ? collapsed : false,
        })),
      }),
      { history: false }
    );
  }

  function deleteSection(id: string) {
    if (!activeDocument) return;
    const section = findSection(activeDocument.sections, id);
    if (!section) return;

    askConfirm(
      "Delete this section?",
      `"${section.title || "Untitled section"}" and all of its subsections will be deleted. You can undo this with Ctrl+Z.`,
      "Delete section",
      () => {
        commit((doc) => ({ ...doc, sections: extractSection(doc.sections, id).tree }));

        if (selectedId && containsSection(section, selectedId)) setSelectedId(null);
        notify("Section deleted. Press Ctrl+Z to undo.");
      }
    );
  }

  function duplicateSection(id: string) {
    if (!activeDocument) return;
    const original = findSection(activeDocument.sections, id);
    const location = locate(activeDocument.sections, id);
    if (!original || !location) return;

    const duplicate = cloneSection(original, true);

    commit((doc) => ({
      ...doc,
      sections: insertSection(doc.sections, location.parentId, location.index + 1, duplicate),
    }));

    setSelectedId(duplicate.id);
    notify("Section duplicated.");
  }

  function runStructureOp(
    operation: (sections: EssaySection[], id: string) => EssaySection[],
    message: string
  ) {
    if (!activeDocument || !selectedId) return;
    const next = operation(activeDocument.sections, selectedId);
    if (next === activeDocument.sections) {
      notify("That move is not possible from here.");
      return;
    }
    commit((doc) => ({ ...doc, sections: operation(doc.sections, selectedId) }));
    notify(message);
  }

  const moveUp = () => runStructureOp((s, id) => shiftSection(s, id, -1), "Moved up.");
  const moveDown = () => runStructureOp((s, id) => shiftSection(s, id, 1), "Moved down.");
  const indent = () => runStructureOp(indentSection, "Section indented.");
  const outdent = () => runStructureOp(outdentSection, "Section outdented.");

  function distributeWordTargets() {
    if (!activeDocument) return;
    if (activeDocument.targetWords <= 0) {
      notify("Set a target word count in Essay details first.");
      return;
    }
    if (!activeDocument.sections.length) {
      notify("Add some sections first.");
      return;
    }
    commit((doc) => ({ ...doc, sections: distributeTargets(doc.sections, doc.targetWords) }));
    notify("Word targets spread evenly across your lowest-level sections.");
  }

  function resetProgress() {
    commit((doc) => ({
      ...doc,
      sections: mapSections(doc.sections, (section) => ({ ...section, completed: false })),
    }));
    notify("Progress reset.");
  }

  function importBulk() {
    const parsed = parseOutlineText(bulkText);
    if (!parsed.length) {
      notify("Nothing to add. Type one heading per line and indent subsections.");
      return;
    }
    commit((doc) => ({ ...doc, sections: [...doc.sections, ...parsed] }));
    setBulkText("");
    setShowBulk(false);
    notify(`${countSections(parsed)} section${countSections(parsed) === 1 ? "" : "s"} added.`);
  }

  /* ------------------------------ drag and drop ---------------------------- */

  function handleDragStartRow(event: DragEvent<HTMLDivElement>, id: string) {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropHint(null);
  }

  function handleDragOverRow(event: DragEvent<HTMLDivElement>, id: string) {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingId || draggingId === id) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientY - rect.top;
    const position: DropPosition =
      offset < rect.height * 0.28 ? "before" : offset > rect.height * 0.72 ? "after" : "inside";

    event.dataTransfer.dropEffect = "move";
    setDropHint((previous) =>
      previous && previous.id === id && previous.pos === position ? previous : { id, pos: position }
    );
  }

  function handleDragLeaveRow(id: string) {
    setDropHint((previous) => (previous && previous.id === id ? null : previous));
  }

  function handleDropRow(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    event.stopPropagation();

    const sourceId = draggingId || event.dataTransfer.getData("text/plain");
    const position = dropHint && dropHint.id === targetId ? dropHint.pos : "inside";
    setDraggingId(null);
    setDropHint(null);

    if (!sourceId || sourceId === targetId || !activeDocument) return;

    const source = findSection(activeDocument.sections, sourceId);
    if (!source) return;
    if (containsSection(source, targetId)) {
      notify("A section cannot be moved inside itself.");
      return;
    }

    commit((doc) => ({ ...doc, sections: moveSection(doc.sections, sourceId, targetId, position) }));
    setSelectedId(sourceId);
    notify(
      position === "inside"
        ? "Section moved inside the target section."
        : `Section moved ${position} the target section.`
    );
  }

  function handleDropRoot(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const sourceId = draggingId || event.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDropHint(null);
    if (!sourceId || !activeDocument || !findSection(activeDocument.sections, sourceId)) return;

    commit((doc) => ({ ...doc, sections: moveToRootEnd(doc.sections, sourceId) }));
    setSelectedId(sourceId);
    notify("Section moved to the end of the outline.");
  }

  /* -------------------------------- sources -------------------------------- */

  function addSource() {
    const source: EssaySource = { id: createId(), author: "", title: "", year: "", publisher: "", url: "" };
    commit((doc) => ({ ...doc, sources: [...doc.sources, source] }));
    setView("sources");
  }

  function updateSource(id: string, patch: Partial<EssaySource>, key: string) {
    commit(
      (doc) => ({
        ...doc,
        sources: doc.sources.map((source) => (source.id === id ? { ...source, ...patch } : source)),
      }),
      { key: `${key}:${id}` }
    );
  }

  function deleteSource(id: string) {
    askConfirm(
      "Delete this source?",
      "It will also be removed from any sections it is linked to. You can undo this with Ctrl+Z.",
      "Delete source",
      () => {
        commit((doc) => ({
          ...doc,
          sources: doc.sources.filter((source) => source.id !== id),
          sections: mapSections(doc.sections, (section) => ({
            ...section,
            sourceIds: section.sourceIds.filter((sourceId) => sourceId !== id),
          })),
        }));
      }
    );
  }

  function toggleSourceLink(sourceId: string) {
    if (!selectedSection) return;
    const linked = selectedSection.sourceIds.includes(sourceId);
    patchSelected({
      sourceIds: linked
        ? selectedSection.sourceIds.filter((id) => id !== sourceId)
        : [...selectedSection.sourceIds, sourceId],
    });
  }

  /* --------------------------------- export -------------------------------- */

  function safeName(doc: EssayDocument) {
    return doc.title.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "essay-outline";
  }

  function exportOutline(format: "txt" | "md" | "json" | "html" | "doc") {
    if (!activeDocument) return;
    const name = safeName(activeDocument);

    if (format === "json") {
      downloadFile(`${name}.json`, JSON.stringify(activeDocument, null, 2), "application/json");
    } else if (format === "md") {
      downloadFile(`${name}.md`, buildMarkdown(activeDocument), "text/markdown;charset=utf-8");
    } else if (format === "html") {
      downloadFile(`${name}.html`, buildHtml(activeDocument), "text/html;charset=utf-8");
    } else if (format === "doc") {
      downloadFile(`${name}.doc`, buildHtml(activeDocument), "application/msword");
    } else {
      downloadFile(`${name}.txt`, buildText(activeDocument), "text/plain;charset=utf-8");
    }

    notify(format === "doc" ? "Word-compatible file downloaded." : `${format.toUpperCase()} outline downloaded.`);
  }

  async function copyOutline(format: "text" | "markdown") {
    if (!activeDocument) return;
    const content = format === "markdown" ? buildMarkdown(activeDocument) : buildText(activeDocument);

    try {
      await navigator.clipboard.writeText(content);
      notify(`Outline copied as ${format}.`);
    } catch {
      notify("Copying was blocked by your browser. Use the download buttons instead.");
    }
  }

  async function copyBibliography() {
    if (!activeDocument) return;
    const lines = bibliography(activeDocument);
    if (!lines.length) {
      notify("Add a source first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      notify("Bibliography copied.");
    } catch {
      notify("Copying was blocked by your browser.");
    }
  }

  function printOutline() {
    if (!activeDocument) return;

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const frameDoc = frame.contentDocument || frameWindow?.document;

    if (!frameWindow || !frameDoc) {
      frame.remove();
      notify("Printing is not available in this browser.");
      return;
    }

    frameDoc.open();
    frameDoc.write(buildHtml(activeDocument));
    frameDoc.close();

    frameWindow.onafterprint = () => frame.remove();
    window.setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(() => frame.remove(), 60000);
    }, 300);
  }

  async function savePdf() {
    if (!activeDocument || pdfBusy) return;

    const doc = activeDocument;
    setPdfBusy(true);

    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;";

    try {
      const parsed = new DOMParser().parseFromString(buildHtml(doc), "text/html");

      const style = document.createElement("style");
      style.textContent = PDF_CSS;

      const root = document.createElement("div");
      root.className = "eob-pdf-root";
      root.innerHTML = parsed.body.innerHTML;

      host.appendChild(style);
      host.appendChild(root);
      document.body.appendChild(host);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore html2pdf.js may not ship its own type definitions
      const mod = await import("html2pdf.js");
      const factory =
        (mod as unknown as { default?: Html2PdfFactory }).default ??
        (mod as unknown as Html2PdfFactory);

      await factory()
        .set({
          margin: [12, 12, 12, 12],
          filename: `${safeName(doc)}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollX: 0, scrollY: 0 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: ["h2", "h3", "h4", "h5", "h6"] },
        })
        .from(root)
        .save();

      notify("PDF saved to your downloads.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      notify(
        /html2pdf|cannot find module|dynamically imported/i.test(message)
          ? "PDF library not found. Run: npm install html2pdf.js"
          : "The PDF could not be created. Please try the Print button instead."
      );
    } finally {
      host.remove();
      setPdfBusy(false);
    }
  }

  function exportBackup() {
    downloadFile(
      "toolsab-essay-outlines-backup.json",
      JSON.stringify({ documents, activeId }, null, 2),
      "application/json"
    );
    notify("Your outline backup was downloaded.");
  }

  async function importJSON(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Please choose a JSON file smaller than 5 MB.");

      const parsed = JSON.parse(await file.text()) as unknown;
      const list: unknown[] = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { documents?: unknown[] }).documents)
          ? (parsed as { documents: unknown[] }).documents
          : [parsed];

      const imported = list
        .map((item) => sanitizeDocument(item, false))
        .filter((item): item is EssayDocument => item !== null);

      if (!imported.length) throw new Error("No valid essay outline was found in this JSON file.");

      setDocuments((current) => [...current, ...imported]);
      setActiveId(imported[0].id);
      setSelectedId(null);
      notify(`${imported.length} outline${imported.length === 1 ? "" : "s"} imported successfully.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "The JSON file could not be imported.");
    } finally {
      event.target.value = "";
    }
  }

  /* ------------------------------- shortcuts ------------------------------- */

  useEffect(() => {
    shortcutRef.current = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (mod && key === "s") {
        event.preventDefault();
        notify("Everything is saved automatically in this browser.");
        return;
      }
      if (mod && key === "k") {
        event.preventDefault();
        setView("outline");
        searchRef.current?.focus();
        return;
      }
      if (key === "escape") {
        setDialog(null);
        setShowTemplates(false);
        setShowBulk(false);
        return;
      }
      if (event.altKey && selectedId && !typing && view === "outline") {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          moveUp();
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          moveDown();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          indent();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          outdent();
        }
      }
    };
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => shortcutRef.current(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!showTemplates && !showBulk && !dialog) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [showTemplates, showBulk, dialog]);

  /* --------------------------------- render -------------------------------- */

  const allTemplates = [...templates, ...customTemplates];
  const tip = selectedSection ? tipFor(selectedSection.title) : "";
  const targetGap = activeDocument ? activeDocument.targetWords - allocatedWords : 0;

  return (
    <main className="eob-app" data-theme={theme}>
      <style jsx global>{`
        .eob-app {
          --eob-accent: #ff5a1f;
          --eob-accent-2: #ff8a4c;
          --eob-accent-dark: #e94b13;
          --eob-bg: #f6f6f9;
          --eob-card: #ffffff;
          --eob-surface: #fafafc;
          --eob-ink: #1f2128;
          --eob-muted: #747886;
          --eob-border: #e8e8ee;
          --eob-soft: #fff3ed;
          --eob-soft-border: #ffd2c0;
          --eob-input: #ffffff;
          --eob-shadow: 0 10px 36px rgba(30, 37, 60, 0.07);
          --eob-good: #168448;
          --eob-good-bg: #e7f7ee;
          --eob-bad: #c43c3c;
          --eob-bad-bg: #fff0f0;
          color: var(--eob-ink);
          font-family: inherit;
          width: 100%;
          background: var(--eob-bg);
          padding: 18px;
          border-radius: 22px;
        }

        .eob-app[data-theme="dark"] {
          --eob-bg: #101116;
          --eob-card: #181a22;
          --eob-surface: #1d2029;
          --eob-ink: #eceef5;
          --eob-muted: #9aa0b2;
          --eob-border: #2a2d3a;
          --eob-soft: #2a1b15;
          --eob-soft-border: #5b2f1d;
          --eob-input: #13151c;
          --eob-shadow: 0 10px 36px rgba(0, 0, 0, 0.35);
          --eob-good: #4ade80;
          --eob-good-bg: #12301f;
          --eob-bad: #ff7b7b;
          --eob-bad-bg: #3a1a1a;
        }

        .eob-app * { box-sizing: border-box; }
        .eob-app button { font-family: inherit; }

        /* ---------- Hero header ---------- */
        .eob-hero {
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
          padding: 24px 26px;
          border-radius: 18px;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #ff5a1f 0%, #ff8a4c 55%, #ffb36b 100%);
          color: #fff;
          box-shadow: 0 14px 40px rgba(255, 90, 31, 0.28);
        }
        .eob-hero::after {
          content: "";
          position: absolute;
          right: -70px;
          top: -90px;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.14);
          pointer-events: none;
        }
        .eob-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.85;
          margin-bottom: 7px;
        }
        .eob-heading {
          margin: 0;
          font-size: clamp(24px, 3vw, 33px);
          font-weight: 850;
          letter-spacing: -0.04em;
          line-height: 1.12;
        }
        .eob-subheading {
          margin: 9px 0 0;
          max-width: 620px;
          line-height: 1.6;
          font-size: 14px;
          opacity: 0.92;
        }
        .eob-hero-actions {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .eob-hero .eob-ghost {
          background: rgba(255, 255, 255, 0.18);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.35);
          backdrop-filter: blur(6px);
        }
        .eob-hero .eob-ghost:hover:not(:disabled) { background: rgba(255, 255, 255, 0.3); }
        .eob-hero .eob-ghost:disabled { opacity: 0.45; cursor: not-allowed; }
        .eob-hero .eob-white { background: #fff; color: var(--eob-accent-dark); box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
        .eob-hero .eob-white:hover { transform: translateY(-1px); }

        /* ---------- Buttons ---------- */
        .eob-primary, .eob-secondary, .eob-danger-button, .eob-ghost, .eob-white {
          border: 0;
          border-radius: 11px;
          padding: 10px 14px;
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.16s ease;
          white-space: nowrap;
        }
        .eob-primary {
          background: linear-gradient(135deg, var(--eob-accent), var(--eob-accent-2));
          color: #fff;
          box-shadow: 0 6px 16px rgba(255, 90, 31, 0.28);
        }
        .eob-primary:hover { transform: translateY(-1px); box-shadow: 0 9px 22px rgba(255, 90, 31, 0.34); }
        .eob-secondary {
          color: var(--eob-ink);
          background: var(--eob-card);
          border: 1px solid var(--eob-border);
        }
        .eob-secondary:hover:not(:disabled) { border-color: var(--eob-accent); color: var(--eob-accent); }
        .eob-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
        .eob-danger-button { color: var(--eob-bad); background: var(--eob-bad-bg); }
        .eob-danger-button:hover { filter: brightness(0.97); }
        .eob-small { padding: 7px 10px; font-size: 11.5px; border-radius: 9px; }

        /* ---------- Layout ---------- */
        .eob-layout {
          display: grid;
          grid-template-columns: minmax(230px, 270px) minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }
        .eob-layout.focus { grid-template-columns: minmax(0, 1fr); }
        .eob-panel {
          background: var(--eob-card);
          border: 1px solid var(--eob-border);
          border-radius: 18px;
          box-shadow: var(--eob-shadow);
          min-width: 0;
        }
        .eob-sidebar { padding: 15px; position: sticky; top: 12px; }
        .eob-sidebar-title {
          font-size: 11px;
          color: var(--eob-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 800;
          margin: 2px 0 12px;
        }
        .eob-doc-tools { display: grid; grid-template-columns: 1fr auto; gap: 6px; margin-top: 10px; }
        .eob-doc-list { display: grid; gap: 7px; margin: 12px 0; max-height: 380px; overflow: auto; padding-right: 2px; }
        .eob-doc-item { display: flex; gap: 6px; align-items: stretch; }
        .eob-doc-select {
          flex: 1;
          min-width: 0;
          border: 1px solid transparent;
          background: var(--eob-surface);
          color: var(--eob-ink);
          text-align: left;
          border-radius: 12px;
          padding: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .eob-doc-select:hover { border-color: var(--eob-soft-border); }
        .eob-doc-select.active { background: var(--eob-soft); border-color: var(--eob-soft-border); }
        .eob-doc-select strong { display: block; overflow-wrap: anywhere; font-size: 12px; line-height: 1.4; }
        .eob-doc-select small { display: block; margin-top: 3px; color: var(--eob-muted); font-size: 10px; }
        .eob-mini-bar { height: 4px; border-radius: 99px; background: var(--eob-border); margin-top: 7px; overflow: hidden; }
        .eob-mini-bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--eob-accent-2), var(--eob-accent)); }
        .eob-mini-actions { display: flex; flex-direction: column; gap: 3px; }
        .eob-mini-actions button {
          border: 0; border-radius: 7px; background: var(--eob-surface); color: var(--eob-muted);
          cursor: pointer; width: 26px; height: 26px; font-size: 12px;
        }
        .eob-mini-actions button:hover { background: var(--eob-soft); color: var(--eob-accent); }
        .eob-note-box {
          border-radius: 12px; background: var(--eob-surface); padding: 11px; color: var(--eob-muted);
          font-size: 11px; line-height: 1.65; margin-top: 12px;
        }
        .eob-note-box strong { color: var(--eob-ink); }
        .eob-kbd {
          display: inline-block; border: 1px solid var(--eob-border); border-bottom-width: 2px; border-radius: 5px;
          padding: 0 5px; font-size: 10px; background: var(--eob-card); color: var(--eob-ink);
        }

        .eob-main { padding: 20px; }
        .eob-empty { text-align: center; padding: 55px 18px; }
        .eob-empty-icon {
          width: 60px; height: 60px; margin: 0 auto 15px; border-radius: 19px; display: grid; place-items: center;
          background: var(--eob-soft); color: var(--eob-accent); font-size: 27px;
        }
        .eob-empty h3 { margin: 0 0 8px; font-size: 19px; }
        .eob-empty p { color: var(--eob-muted); font-size: 13px; line-height: 1.6; max-width: 420px; margin: 0 auto 18px; }

        /* ---------- Document top ---------- */
        .eob-doc-top {
          display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap;
          padding-bottom: 16px; border-bottom: 1px solid var(--eob-border);
        }
        .eob-doc-title { font-size: 20px; font-weight: 850; letter-spacing: -0.03em; margin: 0; overflow-wrap: anywhere; }
        .eob-pill-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .eob-pill {
          display: inline-flex; align-items: center; gap: 5px; color: var(--eob-accent); background: var(--eob-soft);
          padding: 5px 10px; border-radius: 99px; font-size: 10.5px; font-weight: 800;
        }
        .eob-pill.neutral { color: var(--eob-muted); background: var(--eob-surface); font-weight: 700; }
        .eob-progress { min-width: 150px; max-width: 220px; flex: 1; }
        .eob-progress-label { display: flex; justify-content: space-between; font-size: 11px; color: var(--eob-muted); margin-bottom: 7px; }
        .eob-progress-track { height: 8px; background: var(--eob-border); border-radius: 99px; overflow: hidden; }
        .eob-progress-fill {
          height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--eob-accent-2), var(--eob-accent));
          transition: width 0.25s ease;
        }

        /* ---------- Tabs ---------- */
        .eob-tabs {
          display: inline-flex; gap: 4px; padding: 4px; background: var(--eob-surface); border: 1px solid var(--eob-border);
          border-radius: 13px; margin: 16px 0 4px; flex-wrap: wrap;
        }
        .eob-tab {
          border: 0; background: transparent; color: var(--eob-muted); font-size: 12px; font-weight: 750;
          padding: 8px 14px; border-radius: 10px; cursor: pointer; transition: all 0.15s;
        }
        .eob-tab:hover { color: var(--eob-ink); }
        .eob-tab.active { background: var(--eob-card); color: var(--eob-accent); box-shadow: 0 2px 10px rgba(30, 37, 60, 0.1); }

        /* ---------- Fields ---------- */
        .eob-details-toggle {
          display: flex; justify-content: space-between; align-items: center; width: 100%; border: 0; background: transparent;
          color: var(--eob-ink); font-size: 13px; font-weight: 850; padding: 14px 0 4px; cursor: pointer;
        }
        .eob-details-toggle span { color: var(--eob-muted); font-weight: 600; font-size: 11px; }
        .eob-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 10px 0 14px; }
        .eob-field { display: grid; gap: 6px; min-width: 0; align-content: start; }
        .eob-field.full { grid-column: 1 / -1; }
        .eob-field label { color: var(--eob-muted); font-size: 11px; font-weight: 800; }
        .eob-field-hint { font-size: 10px; color: var(--eob-muted); }
        .eob-field input, .eob-field textarea, .eob-field select, .eob-search, .eob-modal textarea, .eob-small-input {
          width: 100%; min-width: 0; border: 1px solid var(--eob-border); border-radius: 10px; padding: 10px 11px;
          color: var(--eob-ink); background: var(--eob-input); outline: none; font: inherit; font-size: 12.5px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .eob-field textarea { min-height: 78px; resize: vertical; line-height: 1.55; }
        .eob-field input:focus, .eob-field textarea:focus, .eob-field select:focus, .eob-search:focus, .eob-modal textarea:focus, .eob-small-input:focus {
          border-color: var(--eob-accent); box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.15);
        }

        .eob-toolbar { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
        .eob-section-heading {
          display: flex; justify-content: space-between; gap: 10px; align-items: center; flex-wrap: wrap; margin: 16px 0 10px;
        }
        .eob-section-heading h3 { font-size: 14px; margin: 0; font-weight: 850; }
        .eob-section-heading p { margin: 4px 0 0; color: var(--eob-muted); font-size: 11px; }

        /* ---------- Workbench ---------- */
        .eob-workbench { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr); gap: 14px; align-items: start; margin-top: 10px; }
        .eob-outline-area {
          background: var(--eob-surface); border: 1px solid var(--eob-border); border-radius: 14px; padding: 10px; min-height: 140px;
          max-height: 720px; overflow: auto;
        }
        .eob-tree { display: grid; gap: 4px; }
        .eob-tree-item { min-width: 0; }
        .eob-row {
          position: relative; display: flex; align-items: center; gap: 3px; min-width: 0; border: 1px solid transparent;
          border-left: 3px solid var(--eob-dot); border-radius: 10px; background: var(--eob-card); padding: 4px 5px; transition: all 0.14s;
        }
        .eob-row:hover { border-color: var(--eob-soft-border); border-left-color: var(--eob-dot); }
        .eob-row.selected { background: var(--eob-soft); border-color: var(--eob-soft-border); border-left-color: var(--eob-dot); box-shadow: 0 4px 14px rgba(255, 90, 31, 0.1); }
        .eob-row.completed .eob-row-title { color: var(--eob-muted); text-decoration: line-through; }
        .eob-row.dragging { opacity: 0.45; }
        .eob-row.drop-before { box-shadow: 0 -3px 0 0 var(--eob-accent); }
        .eob-row.drop-after { box-shadow: 0 3px 0 0 var(--eob-accent); }
        .eob-row.drop-inside { outline: 2px dashed var(--eob-accent); outline-offset: -2px; background: var(--eob-soft); }
        .eob-caret {
          flex: 0 0 22px; width: 22px; height: 26px; border: 0; background: transparent; color: var(--eob-muted); cursor: pointer; font-size: 12px; border-radius: 6px;
        }
        .eob-caret:hover { background: var(--eob-surface); color: var(--eob-ink); }
        .eob-caret.empty { cursor: default; pointer-events: none; }
        .eob-row-main {
          display: flex; align-items: center; gap: 9px; text-align: left; min-width: 0; flex: 1; border: 0; background: transparent;
          color: inherit; padding: 4px 3px; cursor: pointer;
        }
        .eob-num {
          display: grid; place-items: center; flex: 0 0 auto; min-width: 26px; height: 24px; padding: 0 6px; border-radius: 7px;
          background: var(--eob-surface); color: var(--eob-muted); font-size: 10px; font-weight: 800;
        }
        .eob-row-text { display: grid; min-width: 0; }
        .eob-row-title { font-size: 12.5px; font-weight: 700; overflow-wrap: anywhere; }
        .eob-row-meta { display: flex; flex-wrap: wrap; gap: 4px 9px; margin-top: 3px; color: var(--eob-muted); font-size: 9.5px; font-weight: 500; }
        .eob-row-actions { display: flex; align-items: center; gap: 1px; }
        .eob-icon {
          width: 25px; height: 25px; border: 0; border-radius: 7px; background: transparent; color: var(--eob-muted); cursor: pointer; font-size: 14px;
        }
        .eob-icon:hover:not(:disabled) { background: var(--eob-surface); color: var(--eob-ink); }
        .eob-icon:disabled { opacity: 0.35; cursor: not-allowed; }
        .eob-icon.is-done { background: var(--eob-good-bg); color: var(--eob-good); }
        .eob-icon.danger:hover { background: var(--eob-bad-bg); color: var(--eob-bad); }
        .eob-children { margin: 4px 0 4px 15px; padding-left: 9px; border-left: 1px dashed var(--eob-border); }

        .eob-editor {
          border: 1px solid var(--eob-soft-border); background: var(--eob-soft); border-radius: 14px; padding: 15px;
          position: sticky; top: 12px;
        }
        .eob-editor-title { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
        .eob-editor-title strong { font-size: 13px; }
        .eob-editor-title span { color: var(--eob-muted); font-size: 10px; }
        .eob-editor .eob-field + .eob-field { margin-top: 11px; }
        .eob-editor .eob-field input, .eob-editor .eob-field textarea, .eob-editor .eob-field select { background: var(--eob-card); }
        .eob-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 11px; }
        .eob-colors { display: flex; gap: 7px; flex-wrap: wrap; }
        .eob-color {
          width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--eob-card); cursor: pointer; box-shadow: 0 0 0 1px var(--eob-border);
        }
        .eob-color.none { background: repeating-linear-gradient(45deg, var(--eob-surface), var(--eob-surface) 4px, var(--eob-border) 4px, var(--eob-border) 5px); }
        .eob-color.active { box-shadow: 0 0 0 2px var(--eob-accent); }
        .eob-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .eob-chip {
          border: 1px solid var(--eob-border); background: var(--eob-card); color: var(--eob-muted); border-radius: 99px; padding: 4px 10px;
          font-size: 10.5px; cursor: pointer; font-weight: 700;
        }
        .eob-chip.active { background: var(--eob-accent); border-color: var(--eob-accent); color: #fff; }
        .eob-tip {
          margin-top: 11px; padding: 10px 12px; border-radius: 10px; background: var(--eob-card); border: 1px dashed var(--eob-soft-border);
          font-size: 11px; line-height: 1.6; color: var(--eob-muted);
        }
        .eob-tip strong { color: var(--eob-accent); }
        .eob-editor-empty { text-align: center; color: var(--eob-muted); font-size: 12px; line-height: 1.7; padding: 24px 10px; }

        /* ---------- Preview ---------- */
        .eob-preview {
          background: var(--eob-card); border: 1px solid var(--eob-border); border-radius: 14px; padding: 30px 34px; margin-top: 12px;
          font-family: Georgia, "Times New Roman", serif; line-height: 1.7; max-width: 820px;
        }
        .eob-preview h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: -0.02em; }
        .eob-prev-info { color: var(--eob-muted); font-size: 13px; margin-bottom: 14px; font-family: inherit; }
        .eob-prev-thesis { border-left: 4px solid var(--eob-accent); background: var(--eob-soft); padding: 10px 14px; border-radius: 6px; margin: 14px 0 20px; font-size: 14px; }
        .eob-prev-section h3 { font-size: 19px; margin: 24px 0 4px; padding-bottom: 4px; border-bottom: 1px solid var(--eob-border); }
        .eob-prev-section h4 { font-size: 16px; margin: 16px 0 3px; }
        .eob-prev-section h5, .eob-prev-section h6 { font-size: 14px; margin: 12px 0 3px; }
        .eob-prev-num { color: var(--eob-accent); }
        .eob-prev-notes { margin: 3px 0 7px; white-space: pre-wrap; font-size: 14px; }
        .eob-prev-meta { margin: 0 0 8px; font-style: italic; color: var(--eob-muted); font-size: 12px; }
        .eob-prev-refs { margin-top: 28px; }
        .eob-prev-refs h3 { font-size: 19px; border-bottom: 1px solid var(--eob-border); padding-bottom: 4px; }
        .eob-prev-refs li { margin-bottom: 6px; font-size: 13.5px; }

        /* ---------- Sources ---------- */
        .eob-source-grid { display: grid; gap: 10px; margin-top: 12px; }
        .eob-source {
          display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; padding: 12px; background: var(--eob-surface);
          border: 1px solid var(--eob-border); border-radius: 13px;
        }
        .eob-source .c2 { grid-column: span 2; }
        .eob-source .c3 { grid-column: span 3; }
        .eob-source .c6 { grid-column: 1 / -1; }
        .eob-source-footer { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
        .eob-source-footer small { color: var(--eob-muted); font-size: 10.5px; }
        .eob-bib { margin-top: 14px; padding: 14px 16px; background: var(--eob-surface); border: 1px solid var(--eob-border); border-radius: 13px; }
        .eob-bib ul { margin: 8px 0 0; padding-left: 18px; font-size: 12.5px; line-height: 1.7; }
        .eob-bib-note { color: var(--eob-muted); font-size: 10.5px; margin-top: 8px; }

        /* ---------- Insights ---------- */
        .eob-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 12px; }
        .eob-stat { background: var(--eob-surface); border: 1px solid var(--eob-border); border-radius: 13px; padding: 13px; }
        .eob-stat strong { display: block; font-size: 22px; letter-spacing: -0.03em; }
        .eob-stat span { font-size: 10.5px; color: var(--eob-muted); font-weight: 700; }
        .eob-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
        .eob-card { background: var(--eob-surface); border: 1px solid var(--eob-border); border-radius: 14px; padding: 15px; min-width: 0; }
        .eob-card h4 { margin: 0 0 10px; font-size: 13px; }
        .eob-score { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .eob-score-ring {
          width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; font-weight: 850; font-size: 14px;
          background: conic-gradient(var(--eob-accent) calc(var(--eob-pct) * 1%), var(--eob-border) 0);
          position: relative;
        }
        .eob-score-ring::before { content: ""; position: absolute; inset: 6px; background: var(--eob-surface); border-radius: 50%; }
        .eob-score-ring span { position: relative; }
        .eob-check { display: flex; gap: 9px; align-items: flex-start; padding: 7px 0; font-size: 12px; line-height: 1.5; border-top: 1px solid var(--eob-border); }
        .eob-check:first-of-type { border-top: 0; }
        .eob-check-mark {
          flex: 0 0 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 800; margin-top: 1px;
        }
        .eob-check-mark.ok { background: var(--eob-good-bg); color: var(--eob-good); }
        .eob-check-mark.no { background: var(--eob-bad-bg); color: var(--eob-bad); }
        .eob-check small { display: block; color: var(--eob-muted); font-size: 10.5px; margin-top: 1px; }
        .eob-bars { display: grid; gap: 9px; }
        .eob-bar-row { display: grid; gap: 4px; font-size: 11px; }
        .eob-bar-label { display: flex; justify-content: space-between; gap: 8px; color: var(--eob-muted); }
        .eob-bar-label b { color: var(--eob-ink); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .eob-bar-track { height: 8px; background: var(--eob-border); border-radius: 99px; overflow: hidden; }
        .eob-bar-fill { height: 100%; background: linear-gradient(90deg, var(--eob-accent-2), var(--eob-accent)); border-radius: inherit; }

        /* ---------- Export, help, notice ---------- */
        .eob-export-bar {
          display: flex; flex-wrap: wrap; align-items: center; gap: 7px; border-top: 1px solid var(--eob-border); margin-top: 18px; padding-top: 15px;
        }
        .eob-export-label { font-size: 11px; color: var(--eob-muted); font-weight: 800; margin-right: 3px; }
        .eob-help {
          margin-top: 16px; padding: 13px 15px; background: var(--eob-surface); border: 1px solid var(--eob-border); border-radius: 13px;
          color: var(--eob-muted); font-size: 11px; line-height: 1.7;
        }
        .eob-help strong { color: var(--eob-ink); }
        .eob-toast {
          position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 100002; max-width: min(92vw, 460px);
          background: #1f2128; color: #fff; border-radius: 12px; padding: 11px 16px; font-size: 12px; line-height: 1.5;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.3); border-left: 4px solid var(--eob-accent);
        }
        .eob-save-state { font-size: 10.5px; opacity: 0.9; }

        /* ---------- Templates + modal ---------- */
        .eob-template-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 15px; }
        .eob-template-card {
          position: relative; border: 1px solid var(--eob-border); border-radius: 13px; padding: 14px; text-align: left; background: var(--eob-card);
          cursor: pointer; transition: all 0.16s; color: inherit;
        }
        .eob-template-card:hover { border-color: var(--eob-accent); background: var(--eob-soft); transform: translateY(-1px); }
        .eob-template-card strong { display: block; font-size: 12.5px; margin-bottom: 5px; padding-right: 20px; }
        .eob-template-card span { display: block; color: var(--eob-muted); font-size: 10.5px; line-height: 1.5; }
        .eob-template-card .eob-badge {
          display: inline-block; margin-top: 7px; padding: 2px 8px; border-radius: 99px; background: var(--eob-soft); color: var(--eob-accent);
          font-size: 9.5px; font-weight: 800;
        }
        .eob-template-del {
          position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border: 0; border-radius: 6px; background: transparent;
          color: var(--eob-muted); cursor: pointer; font-size: 14px;
        }
        .eob-template-del:hover { background: var(--eob-bad-bg); color: var(--eob-bad); }
        .eob-overlay {
          position: fixed; inset: 0; z-index: 100000; background: rgba(15, 17, 25, 0.55); display: grid; place-items: center; padding: 18px;
          backdrop-filter: blur(3px);
        }
        .eob-modal {
          width: min(560px, 100%); background: var(--eob-card); border: 1px solid var(--eob-border); border-radius: 18px; padding: 20px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35); color: var(--eob-ink);
        }
        .eob-modal h3 { margin: 0 0 6px; font-size: 16px; }
        .eob-modal p { margin: 0 0 12px; color: var(--eob-muted); font-size: 12px; line-height: 1.6; }
        .eob-modal textarea { min-height: 220px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; resize: vertical; }
        .eob-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
        .eob-modal-wide { width: min(900px, 100%); max-height: 88vh; overflow: auto; padding: 22px; }
        .eob-modal-small { width: min(420px, 100%); }
        .eob-modal-small .eob-small-input { margin-top: 2px; }
        .eob-overlay-top { z-index: 100001; }
        .eob-app.eob-portal { background: transparent; padding: 0; border-radius: 0; width: 0; height: 0; overflow: visible; }
        .eob-danger-solid {
          border: 0; border-radius: 11px; padding: 10px 14px; font-size: 12.5px; font-weight: 750; cursor: pointer;
          background: #d93636; color: #fff; box-shadow: 0 6px 16px rgba(217, 54, 54, 0.25); transition: all 0.16s ease;
        }
        .eob-danger-solid:hover { background: #c22d2d; transform: translateY(-1px); }
        .eob-modal-actions button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* ---------- Responsive ---------- */
        @media (max-width: 1080px) {
          .eob-workbench { grid-template-columns: 1fr; }
          .eob-editor { position: static; }
        }
        @media (max-width: 820px) {
          .eob-layout { grid-template-columns: 1fr; }
          .eob-sidebar { order: 2; position: static; }
          .eob-main { padding: 14px; }
          .eob-template-grid, .eob-cards { grid-template-columns: 1fr; }
          .eob-source { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .eob-source .c2, .eob-source .c3 { grid-column: span 2; }
          .eob-preview { padding: 20px 18px; }
        }
        @media (max-width: 520px) {
          .eob-app { padding: 10px; border-radius: 16px; }
          .eob-hero { padding: 18px; }
          .eob-fields, .eob-two { grid-template-columns: 1fr; }
          .eob-field.full { grid-column: auto; }
          .eob-row-actions .eob-icon { width: 22px; }
          .eob-row { align-items: flex-start; }
        }
        @media print {
          .eob-hero, .eob-sidebar, .eob-tabs, .eob-export-bar, .eob-help, .eob-toast { display: none !important; }
        }
      `}</style>

      {/* ------------------------------ Hero header ------------------------------ */}
      <header className="eob-hero">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="eob-eyebrow">ToolsAB Writing Tools · Pro</div>
          <h2 className="eob-heading">Essay Outline Builder</h2>
          <p className="eob-subheading">
            Plan, structure, and polish your essay before you write. Templates, drag-and-drop outlining,
            word budgets, sources, a thesis checker, and one-click export, all saved in your browser.
          </p>
        </div>

        <div className="eob-hero-actions">
          <button type="button" className="eob-ghost" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            ↶ Undo
          </button>
          <button type="button" className="eob-ghost" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            ↷ Redo
          </button>
          <button
            type="button"
            className="eob-ghost"
            onClick={() => setFocusMode((value) => !value)}
            title="Hide the essay list for a distraction-free view"
          >
            {focusMode ? "Exit Focus" : "Focus Mode"}
          </button>
          <button
            type="button"
            className="eob-ghost"
            onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
            title="Switch between light and dark mode"
          >
            {theme === "light" ? "☾ Dark" : "☀ Light"}
          </button>
          <button type="button" className="eob-white" onClick={() => setShowTemplates((value) => !value)}>
            + Create New Essay
          </button>
        </div>
      </header>

      {/* ------------------------------- Templates ------------------------------- */}
      {showTemplates && hydrated && createPortal(
        <div className="eob-app eob-portal" data-theme={theme}>
        <div className="eob-overlay" onClick={() => setShowTemplates(false)}>
        <section
          className="eob-modal eob-modal-wide"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="eob-section-heading" style={{ marginTop: 0 }}>
            <div>
              <h3>Choose an essay template</h3>
              <p>Select a structure to get started, or choose a blank outline. Your own saved templates appear at the end.</p>
            </div>
            <button type="button" className="eob-secondary" onClick={() => setShowTemplates(false)}>
              Close
            </button>
          </div>

          <div className="eob-template-grid">
            {allTemplates.map((template, index) => (
              <div key={`${template.name}-${index}`} style={{ position: "relative" }}>
                <button
                  type="button"
                  className="eob-template-card"
                  style={{ width: "100%" }}
                  onClick={() => createNewOutline(template)}
                >
                  <strong>{template.name}</strong>
                  <span>{template.description}</span>
                  {template.custom && <span className="eob-badge">Custom template</span>}
                </button>
                {template.custom && (
                  <button
                    type="button"
                    className="eob-template-del"
                    title="Delete this template"
                    onClick={() => deleteCustomTemplate(index - templates.length)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        </div>
        </div>,
        document.body
      )}

      <div className={`eob-layout ${focusMode ? "focus" : ""}`}>
        {/* -------------------------------- Sidebar -------------------------------- */}
        {!focusMode && (
          <aside className="eob-panel eob-sidebar">
            <div className="eob-sidebar-title">My Essays ({documents.length})</div>

            <button type="button" className="eob-primary" style={{ width: "100%" }} onClick={() => setShowTemplates(true)}>
              + New Essay Outline
            </button>

            {documents.length > 1 && (
              <div className="eob-doc-tools">
                <input
                  className="eob-small-input"
                  value={docSearch}
                  onChange={(event) => setDocSearch(event.target.value)}
                  placeholder="Search essays..."
                  aria-label="Search your essays"
                />
                <select
                  className="eob-small-input"
                  style={{ width: "auto" }}
                  value={docSort}
                  onChange={(event) => setDocSort(event.target.value as "created" | "recent" | "name")}
                  aria-label="Sort essays"
                >
                  <option value="created">Created</option>
                  <option value="recent">Recent</option>
                  <option value="name">A-Z</option>
                </select>
              </div>
            )}

            <div className="eob-doc-list">
              {documents.length === 0 ? (
                <div className="eob-note-box">You have not created an essay outline yet. Choose a template to start.</div>
              ) : sortedDocuments.length === 0 ? (
                <div className="eob-note-box">No essays match your search.</div>
              ) : (
                sortedDocuments.map((doc) => {
                  const total = countSections(doc.sections);
                  const done = countCompleted(doc.sections);
                  const pct = total ? Math.round((done / total) * 100) : 0;

                  return (
                    <div className="eob-doc-item" key={doc.id}>
                      <button
                        type="button"
                        className={`eob-doc-select ${activeId === doc.id ? "active" : ""}`}
                        onClick={() => {
                          setActiveId(doc.id);
                          setSelectedId(null);
                          setSearch("");
                        }}
                      >
                        <strong>{doc.title}</strong>
                        <small>
                          {doc.essayType} · {timeAgo(doc.updatedAt)}
                        </small>
                        <div className="eob-mini-bar">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </button>

                      <div className="eob-mini-actions">
                        <button type="button" title="Rename outline" onClick={() => renameDocument(doc.id)}>
                          ✎
                        </button>
                        <button type="button" title="Duplicate outline" onClick={() => duplicateDocument(doc.id)}>
                          ⧉
                        </button>
                        <button type="button" title="Delete outline" onClick={() => deleteDocument(doc.id)}>
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button type="button" className="eob-secondary" style={{ width: "100%" }} onClick={() => importRef.current?.click()}>
              Import JSON
            </button>
            <button
              type="button"
              className="eob-secondary"
              style={{ width: "100%", marginTop: 7 }}
              onClick={exportBackup}
              disabled={!documents.length}
            >
              Download All Outlines
            </button>
            <input ref={importRef} type="file" accept=".json,application/json" onChange={importJSON} style={{ display: "none" }} />

            <div className="eob-note-box">
              <strong>Automatic saving</strong>
              <br />
              Your essays are saved in this browser as you work
              {savedAt ? ` (last saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})` : ""}.
              Download a JSON backup to move your outlines to another device.
            </div>

            <div className="eob-note-box">
              <strong>Shortcuts</strong>
              <br />
              <span className="eob-kbd">Ctrl</span> + <span className="eob-kbd">Z</span> undo ·{" "}
              <span className="eob-kbd">Ctrl</span> + <span className="eob-kbd">Shift</span> + <span className="eob-kbd">Z</span> redo
              <br />
              <span className="eob-kbd">Ctrl</span> + <span className="eob-kbd">K</span> search sections
              <br />
              <span className="eob-kbd">Alt</span> + arrows move or indent the selected section
            </div>
          </aside>
        )}

        {/* --------------------------------- Main ---------------------------------- */}
        <section className="eob-panel eob-main">
          {!hydrated ? (
            <div className="eob-empty">
              <div className="eob-empty-icon">✎</div>
              <h3>Loading your workspace...</h3>
              <p>Your saved essay outlines are being prepared.</p>
            </div>
          ) : !activeDocument ? (
            <div className="eob-empty">
              <div className="eob-empty-icon">✎</div>
              <h3>Start planning your essay</h3>
              <p>Choose an essay type and build a clear structure before writing your first paragraph.</p>
              <button type="button" className="eob-primary" onClick={() => setShowTemplates(true)}>
                Choose an Essay Template
              </button>
            </div>
          ) : (
            <>
              {/* ---------- Document top ---------- */}
              <div className="eob-doc-top">
                <div style={{ minWidth: 0 }}>
                  <h3 className="eob-doc-title">{activeDocument.title || "Untitled Essay"}</h3>
                  <div className="eob-pill-row">
                    <span className="eob-pill">{activeDocument.essayType}</span>
                    <span className="eob-pill neutral">{totalSections} sections</span>
                    <span className="eob-pill neutral">{noteWords} words of notes</span>
                    {activeDocument.targetWords > 0 && (
                      <span className="eob-pill neutral">Target {activeDocument.targetWords} words</span>
                    )}
                  </div>
                </div>

                <div className="eob-progress">
                  <div className="eob-progress-label">
                    <span>Outline progress</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="eob-progress-track">
                    <div className="eob-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="eob-progress-label" style={{ marginTop: 6, marginBottom: 0 }}>
                    <span>
                      {completedSections} of {totalSections} sections completed
                    </span>
                  </div>
                </div>
              </div>

              {/* ---------- Essay details ---------- */}
              <button type="button" className="eob-details-toggle" onClick={() => setShowDetails((value) => !value)}>
                Essay details
                <span>{showDetails ? "Hide ▴" : "Show ▾"}</span>
              </button>

              {showDetails && (
                <div className="eob-fields">
                  <div className="eob-field full">
                    <label htmlFor="eob-title">Essay title</label>
                    <input
                      id="eob-title"
                      value={activeDocument.title}
                      onChange={(event) => patchDocument({ title: event.target.value }, "title")}
                      placeholder="Example: The Importance of Environmental Protection"
                      maxLength={200}
                    />
                  </div>

                  <div className="eob-field">
                    <label htmlFor="eob-topic">Essay topic</label>
                    <input
                      id="eob-topic"
                      value={activeDocument.topic}
                      onChange={(event) => patchDocument({ topic: event.target.value }, "topic")}
                      placeholder="What is your essay about?"
                      maxLength={2000}
                    />
                  </div>

                  <div className="eob-field">
                    <label htmlFor="eob-audience">Target audience</label>
                    <input
                      id="eob-audience"
                      value={activeDocument.audience}
                      onChange={(event) => patchDocument({ audience: event.target.value }, "audience")}
                      placeholder="Example: College students"
                      maxLength={500}
                    />
                  </div>

                  <div className="eob-field">
                    <label htmlFor="eob-type">Essay type</label>
                    <select
                      id="eob-type"
                      value={activeDocument.essayType}
                      onChange={(event) => patchDocument({ essayType: event.target.value })}
                    >
                      {[...new Set([...templates.map((t) => t.name), activeDocument.essayType])].map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="eob-field">
                    <label htmlFor="eob-words">Target essay length (words)</label>
                    <input
                      id="eob-words"
                      type="number"
                      min={0}
                      max={1000000}
                      step={50}
                      value={activeDocument.targetWords || ""}
                      onChange={(event) =>
                        patchDocument(
                          { targetWords: clamp(parseInt(event.target.value, 10) || 0, 0, 1000000) },
                          "targetWords"
                        )
                      }
                      placeholder="Example: 1000"
                    />
                    {activeDocument.targetWords > 0 && (
                      <span className="eob-field-hint">
                        About {Math.max(1, Math.round(activeDocument.targetWords / 200))} min to read aloud (approx.)
                      </span>
                    )}
                  </div>

                  <div className="eob-field full">
                    <label htmlFor="eob-thesis">Thesis statement / Main idea</label>
                    <textarea
                      id="eob-thesis"
                      value={activeDocument.thesis}
                      onChange={(event) => patchDocument({ thesis: event.target.value }, "thesis")}
                      placeholder="Write the main point or argument your essay will explain or support..."
                      maxLength={5000}
                    />
                    <span className="eob-field-hint">
                      {thesisAnalysis.words} words
                      {activeDocument.thesis.trim() ? ` · Thesis strength ${thesisAnalysis.score}% (see Insights)` : ""}
                    </span>
                  </div>
                </div>
              )}

              {/* ---------- Tabs ---------- */}
              <div className="eob-tabs" role="tablist">
                {(
                  [
                    ["outline", "Outline"],
                    ["preview", "Preview"],
                    ["sources", `Sources (${activeDocument.sources.length})`],
                    ["insights", "Insights"],
                  ] as [ViewMode, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={view === id}
                    className={`eob-tab ${view === id ? "active" : ""}`}
                    onClick={() => setView(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* =========================== OUTLINE VIEW =========================== */}
              {view === "outline" && (
                <>
                  <div className="eob-section-heading">
                    <div>
                      <h3>Your essay structure</h3>
                      <p>
                        Select a section to edit it. Drag onto the top or bottom edge of a row to reorder, or onto the middle to nest it.
                      </p>
                    </div>
                    <button type="button" className="eob-primary" onClick={() => addSection()}>
                      + Add Section
                    </button>
                  </div>

                  <div className="eob-toolbar" style={{ marginBottom: 10 }}>
                    <button type="button" className="eob-secondary eob-small" onClick={() => setShowBulk(true)}>
                      Paste outline
                    </button>
                    <button type="button" className="eob-secondary eob-small" onClick={() => setAllCollapsed(false)}>
                      Expand all
                    </button>
                    <button type="button" className="eob-secondary eob-small" onClick={() => setAllCollapsed(true)}>
                      Collapse all
                    </button>
                    <button type="button" className="eob-secondary eob-small" onClick={distributeWordTargets}>
                      Spread word targets
                    </button>
                    <button
                      type="button"
                      className="eob-secondary eob-small"
                      onClick={resetProgress}
                      disabled={completedSections === 0}
                    >
                      Reset progress
                    </button>
                    <button type="button" className="eob-secondary eob-small" onClick={saveAsTemplate}>
                      Save as template
                    </button>
                  </div>

                  <input
                    ref={searchRef}
                    className="eob-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search section titles and notes... (Ctrl+K)"
                    aria-label="Search essay sections"
                  />

                  <div className="eob-workbench">
                    <div
                      className="eob-outline-area"
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (dropHint) setDropHint(null);
                      }}
                      onDrop={handleDropRoot}
                    >
                      {activeDocument.sections.length === 0 ? (
                        <div className="eob-empty" style={{ padding: "28px 12px" }}>
                          <h3>Your outline is empty</h3>
                          <p>Add your first section, or paste an indented list to build the outline in seconds.</p>
                          <div className="eob-toolbar" style={{ justifyContent: "center" }}>
                            <button type="button" className="eob-primary" onClick={() => addSection()}>
                              + Add First Section
                            </button>
                            <button type="button" className="eob-secondary" onClick={() => setShowBulk(true)}>
                              Paste outline
                            </button>
                          </div>
                        </div>
                      ) : visibleIds && visibleIds.size === 0 ? (
                        <p style={{ textAlign: "center", color: "var(--eob-muted)", fontSize: 12, padding: 20 }}>
                          No matching sections found.
                        </p>
                      ) : (
                        <SectionTree
                          sections={activeDocument.sections}
                          numbering={numbering}
                          selectedId={selectedId}
                          visible={visibleIds}
                          draggingId={draggingId}
                          dropHint={dropHint}
                          doc={activeDocument}
                          onSelect={setSelectedId}
                          onAddChild={(id) => addSection(id)}
                          onToggleDone={toggleDone}
                          onToggleCollapse={toggleCollapse}
                          onDelete={deleteSection}
                          onDuplicate={duplicateSection}
                          onDragStartRow={handleDragStartRow}
                          onDragEndRow={handleDragEnd}
                          onDragOverRow={handleDragOverRow}
                          onDragLeaveRow={handleDragLeaveRow}
                          onDropRow={handleDropRow}
                        />
                      )}
                    </div>

                    {/* ---------- Section editor ---------- */}
                    <div className="eob-editor">
                      {selectedSection ? (
                        <>
                          <div className="eob-editor-title">
                            <strong>
                              Edit section {numbering[selectedSection.id]}
                            </strong>
                            <span>Changes save automatically</span>
                          </div>

                          <div className="eob-field">
                            <label htmlFor="eob-section-title">Section heading</label>
                            <input
                              id="eob-section-title"
                              value={selectedSection.title}
                              onChange={(event) => patchSelected({ title: event.target.value }, "title")}
                              placeholder="Enter a section heading"
                              maxLength={300}
                            />
                          </div>

                          <div className="eob-field">
                            <label htmlFor="eob-section-notes">Notes and supporting ideas</label>
                            <textarea
                              id="eob-section-notes"
                              value={selectedSection.notes}
                              onChange={(event) => patchSelected({ notes: event.target.value }, "notes")}
                              placeholder="Add evidence, examples, facts, explanations, quotations, or reminders for this section..."
                              maxLength={10000}
                              style={{ minHeight: 130 }}
                            />
                            <span className="eob-field-hint">{wordCount(selectedSection.notes)} words of notes</span>
                          </div>

                          <div className="eob-two">
                            <div className="eob-field">
                              <label htmlFor="eob-section-target">Word target</label>
                              <input
                                id="eob-section-target"
                                type="number"
                                min={0}
                                max={100000}
                                step={10}
                                value={selectedSection.wordTarget || ""}
                                onChange={(event) =>
                                  patchSelected(
                                    { wordTarget: clamp(parseInt(event.target.value, 10) || 0, 0, 100000) },
                                    "target"
                                  )
                                }
                                placeholder="Optional"
                              />
                            </div>
                            <div className="eob-field">
                              <label>Color label</label>
                              <div className="eob-colors">
                                {COLORS.map((color) => (
                                  <button
                                    key={color.id}
                                    type="button"
                                    title={color.label}
                                    aria-label={`Color ${color.label}`}
                                    className={`eob-color ${color.id === "none" ? "none" : ""} ${selectedSection.color === color.id ? "active" : ""}`}
                                    style={color.id === "none" ? undefined : { background: color.hex }}
                                    onClick={() => patchSelected({ color: color.id })}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {activeDocument.sources.length > 0 && (
                            <div className="eob-field" style={{ marginTop: 11 }}>
                              <label>Linked sources</label>
                              <div className="eob-chips">
                                {activeDocument.sources.map((source) => (
                                  <button
                                    key={source.id}
                                    type="button"
                                    className={`eob-chip ${selectedSection.sourceIds.includes(source.id) ? "active" : ""}`}
                                    onClick={() => toggleSourceLink(source.id)}
                                    title={source.title || source.author}
                                  >
                                    {shortAuthor(source.author)} {source.year || "n.d."}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {tip && (
                            <div className="eob-tip">
                              <strong>Writing tip:</strong> {tip}
                            </div>
                          )}

                          <div className="eob-toolbar" style={{ marginTop: 12 }}>
                            <button type="button" className="eob-secondary eob-small" onClick={moveUp} title="Move up (Alt+↑)">
                              ↑ Up
                            </button>
                            <button type="button" className="eob-secondary eob-small" onClick={moveDown} title="Move down (Alt+↓)">
                              ↓ Down
                            </button>
                            <button type="button" className="eob-secondary eob-small" onClick={indent} title="Make subsection of the section above (Alt+→)">
                              ⇥ Indent
                            </button>
                            <button type="button" className="eob-secondary eob-small" onClick={outdent} title="Move up one level (Alt+←)">
                              ⇤ Outdent
                            </button>
                          </div>

                          <div className="eob-toolbar" style={{ marginTop: 8 }}>
                            <button type="button" className="eob-secondary eob-small" onClick={() => addSection(selectedSection.id)}>
                              + Subsection
                            </button>
                            <button type="button" className="eob-secondary eob-small" onClick={() => toggleDone(selectedSection.id)}>
                              {selectedSection.completed ? "Mark Incomplete" : "Mark Complete"}
                            </button>
                            <button type="button" className="eob-secondary eob-small" onClick={() => duplicateSection(selectedSection.id)}>
                              Duplicate
                            </button>
                            <button type="button" className="eob-danger-button eob-small" onClick={() => deleteSection(selectedSection.id)}>
                              Delete
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="eob-editor-empty">
                          <strong style={{ color: "var(--eob-ink)", fontSize: 13 }}>No section selected</strong>
                          <br />
                          Click any section in your outline to edit its heading, notes, word target, color, and linked sources.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* =========================== PREVIEW VIEW =========================== */}
              {view === "preview" && (
                <>
                  <div className="eob-section-heading">
                    <div>
                      <h3>Formatted preview</h3>
                      <p>This is how your outline will look when you print it or save it as a document.</p>
                    </div>
                    <div className="eob-toolbar">
                      <button type="button" className="eob-secondary eob-small" onClick={() => copyOutline("text")}>
                        Copy text
                      </button>
                      <button type="button" className="eob-secondary eob-small" onClick={() => copyOutline("markdown")}>
                        Copy Markdown
                      </button>
                      <button type="button" className="eob-secondary eob-small" onClick={printOutline}>
                        Print
                      </button>
                      <button type="button" className="eob-primary eob-small" onClick={savePdf} disabled={pdfBusy}>
                        {pdfBusy ? "Creating PDF..." : "Save PDF"}
                      </button>
                    </div>
                  </div>

                  <article className="eob-preview">
                    <h1>{activeDocument.title || "Untitled Essay"}</h1>
                    <div className="eob-prev-info">
                      {[
                        activeDocument.essayType,
                        activeDocument.topic,
                        activeDocument.audience ? `Audience: ${activeDocument.audience}` : "",
                        activeDocument.targetWords ? `Target: ${activeDocument.targetWords} words` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {activeDocument.thesis.trim() && (
                      <div className="eob-prev-thesis">
                        <strong>Thesis:</strong> {activeDocument.thesis}
                      </div>
                    )}
                    {activeDocument.sections.length === 0 ? (
                      <p style={{ color: "var(--eob-muted)" }}>Your outline is empty. Add sections in the Outline tab.</p>
                    ) : (
                      <PreviewTree sections={activeDocument.sections} numbering={numbering} doc={activeDocument} />
                    )}
                    {bibliography(activeDocument).length > 0 && (
                      <div className="eob-prev-refs">
                        <h3>References</h3>
                        <ul>
                          {bibliography(activeDocument).map((line, index) => (
                            <li key={index}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                </>
              )}

              {/* =========================== SOURCES VIEW =========================== */}
              {view === "sources" && (
                <>
                  <div className="eob-section-heading">
                    <div>
                      <h3>Sources and references</h3>
                      <p>Add the books, articles, and websites you plan to use, then link them to sections in the Outline tab.</p>
                    </div>
                    <div className="eob-toolbar">
                      <select
                        className="eob-small-input"
                        style={{ width: "auto" }}
                        value={activeDocument.citationStyle}
                        onChange={(event) => patchDocument({ citationStyle: event.target.value as CitationStyle })}
                        aria-label="Citation style"
                      >
                        {CITATION_STYLES.map((style) => (
                          <option key={style.id} value={style.id}>
                            {style.label} style
                          </option>
                        ))}
                      </select>
                      <button type="button" className="eob-primary eob-small" onClick={addSource}>
                        + Add Source
                      </button>
                    </div>
                  </div>

                  {activeDocument.sources.length === 0 ? (
                    <div className="eob-empty" style={{ padding: "34px 12px" }}>
                      <h3>No sources yet</h3>
                      <p>Keep track of your research here so your bibliography is ready when you start writing.</p>
                      <button type="button" className="eob-primary" onClick={addSource}>
                        + Add Your First Source
                      </button>
                    </div>
                  ) : (
                    <div className="eob-source-grid">
                      {activeDocument.sources.map((source) => {
                        const linkedCount = (() => {
                          let count = 0;
                          const walk = (items: EssaySection[]) =>
                            items.forEach((item) => {
                              if (item.sourceIds.includes(source.id)) count += 1;
                              walk(item.children);
                            });
                          walk(activeDocument.sections);
                          return count;
                        })();

                        return (
                          <div className="eob-source" key={source.id}>
                            <div className="eob-field c3">
                              <label>Author(s)</label>
                              <input
                                value={source.author}
                                onChange={(event) => updateSource(source.id, { author: event.target.value }, "author")}
                                placeholder="Last, First"
                                maxLength={300}
                              />
                            </div>
                            <div className="eob-field c3">
                              <label>Title</label>
                              <input
                                value={source.title}
                                onChange={(event) => updateSource(source.id, { title: event.target.value }, "title")}
                                placeholder="Title of the work"
                                maxLength={500}
                              />
                            </div>
                            <div className="eob-field c2">
                              <label>Year</label>
                              <input
                                value={source.year}
                                onChange={(event) => updateSource(source.id, { year: event.target.value }, "year")}
                                placeholder="2024"
                                maxLength={20}
                              />
                            </div>
                            <div className="eob-field c2">
                              <label>Publisher / Journal</label>
                              <input
                                value={source.publisher}
                                onChange={(event) => updateSource(source.id, { publisher: event.target.value }, "publisher")}
                                placeholder="Publisher or website"
                                maxLength={300}
                              />
                            </div>
                            <div className="eob-field c2">
                              <label>URL / DOI</label>
                              <input
                                value={source.url}
                                onChange={(event) => updateSource(source.id, { url: event.target.value }, "url")}
                                placeholder="https://"
                                maxLength={1000}
                              />
                            </div>
                            <div className="eob-source-footer">
                              <small>
                                {linkedCount === 0
                                  ? "Not linked to any section yet"
                                  : `Linked to ${linkedCount} section${linkedCount === 1 ? "" : "s"}`}
                              </small>
                              <button type="button" className="eob-danger-button eob-small" onClick={() => deleteSource(source.id)}>
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {bibliography(activeDocument).length > 0 && (
                    <div className="eob-bib">
                      <div className="eob-toolbar" style={{ justifyContent: "space-between" }}>
                        <strong style={{ fontSize: 13 }}>
                          Bibliography ({CITATION_STYLES.find((s) => s.id === activeDocument.citationStyle)?.label})
                        </strong>
                        <button type="button" className="eob-secondary eob-small" onClick={copyBibliography}>
                          Copy bibliography
                        </button>
                      </div>
                      <ul>
                        {bibliography(activeDocument).map((line, index) => (
                          <li key={index}>{line}</li>
                        ))}
                      </ul>
                      <div className="eob-bib-note">
                        Citations are simplified for planning. Always double-check the final format against your style guide.
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ========================== INSIGHTS VIEW =========================== */}
              {view === "insights" && (
                <>
                  <div className="eob-stats">
                    <div className="eob-stat">
                      <strong>{totalSections}</strong>
                      <span>Total sections</span>
                    </div>
                    <div className="eob-stat">
                      <strong>{progress}%</strong>
                      <span>Outline complete</span>
                    </div>
                    <div className="eob-stat">
                      <strong>{noteWords}</strong>
                      <span>Words of notes</span>
                    </div>
                    <div className="eob-stat">
                      <strong>{activeDocument.targetWords || "-"}</strong>
                      <span>Essay target (words)</span>
                    </div>
                    <div className="eob-stat">
                      <strong>{allocatedWords || "-"}</strong>
                      <span>
                        Allocated to sections
                        {activeDocument.targetWords > 0 && allocatedWords > 0 && targetGap !== 0
                          ? ` (${targetGap > 0 ? `${targetGap} left` : `${Math.abs(targetGap)} over`})`
                          : ""}
                      </span>
                    </div>
                    <div className="eob-stat">
                      <strong>{activeDocument.sources.length}</strong>
                      <span>Sources</span>
                    </div>
                  </div>

                  <div className="eob-cards">
                    <div className="eob-card">
                      <h4>Thesis checker</h4>
                      {!activeDocument.thesis.trim() ? (
                        <p style={{ margin: 0, fontSize: 12, color: "var(--eob-muted)", lineHeight: 1.6 }}>
                          Write your thesis statement in Essay details to get instant feedback.
                        </p>
                      ) : (
                        <>
                          <div className="eob-score">
                            <div className="eob-score-ring" style={{ "--eob-pct": thesisAnalysis.score } as CSSProperties}>
                              <span>{thesisAnalysis.score}%</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--eob-muted)", lineHeight: 1.5 }}>
                              {thesisAnalysis.score >= 80
                                ? "Strong thesis. It is clear and arguable."
                                : thesisAnalysis.score >= 50
                                  ? "Good start. A few tweaks will sharpen it."
                                  : "Needs work. Follow the tips below."}
                            </div>
                          </div>
                          {thesisAnalysis.checks.map((check) => (
                            <div className="eob-check" key={check.label}>
                              <span className={`eob-check-mark ${check.ok ? "ok" : "no"}`}>{check.ok ? "✓" : "!"}</span>
                              <div>
                                {check.label}
                                {!check.ok && <small>{check.tip}</small>}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    <div className="eob-card">
                      <h4>Outline health</h4>
                      {outlineChecks.map((check) => (
                        <div className="eob-check" key={check.label}>
                          <span className={`eob-check-mark ${check.ok ? "ok" : "no"}`}>{check.ok ? "✓" : "!"}</span>
                          <div>
                            {check.label}
                            {!check.ok && <small>{check.tip}</small>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="eob-card" style={{ gridColumn: "1 / -1" }}>
                      <h4>Balance of your main sections</h4>
                      {activeDocument.sections.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 12, color: "var(--eob-muted)" }}>Add sections to see how your essay is balanced.</p>
                      ) : (
                        <div className="eob-bars">
                          {(() => {
                            const rows = activeDocument.sections.map((section) => ({
                              id: section.id,
                              title: section.title || "Untitled section",
                              target: effectiveTarget(section),
                              words: noteWordsDeep(section),
                            }));
                            const useTarget = rows.some((row) => row.target > 0);
                            const max = Math.max(1, ...rows.map((row) => (useTarget ? row.target : row.words)));

                            return rows.map((row) => {
                              const value = useTarget ? row.target : row.words;
                              return (
                                <div className="eob-bar-row" key={row.id}>
                                  <div className="eob-bar-label">
                                    <b>{row.title}</b>
                                    <span>
                                      {value} {useTarget ? "words planned" : "words of notes"}
                                    </span>
                                  </div>
                                  <div className="eob-bar-track">
                                    <div className="eob-bar-fill" style={{ width: `${(value / max) * 100}%` }} />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ---------- Export ---------- */}
              <div className="eob-export-bar">
                <span className="eob-export-label">Download outline:</span>
                <button type="button" className="eob-secondary eob-small" onClick={() => exportOutline("txt")}>
                  TXT
                </button>
                <button type="button" className="eob-secondary eob-small" onClick={() => exportOutline("md")}>
                  Markdown
                </button>
                <button type="button" className="eob-secondary eob-small" onClick={() => exportOutline("doc")}>
                  Word
                </button>
                <button type="button" className="eob-secondary eob-small" onClick={() => exportOutline("html")}>
                  HTML
                </button>
                <button type="button" className="eob-secondary eob-small" onClick={() => exportOutline("json")}>
                  JSON
                </button>
                <button type="button" className="eob-secondary eob-small" onClick={printOutline}>
                  Print
                </button>
                <button type="button" className="eob-primary eob-small" onClick={savePdf} disabled={pdfBusy}>
                  {pdfBusy ? "Creating PDF..." : "Save PDF"}
                </button>
              </div>

              <div className="eob-help">
                <strong>How to use this builder:</strong> Fill in your essay details and thesis, then build your structure in the
                Outline tab. Drag sections to reorder or nest them, add notes, word targets, and linked sources, and mark sections
                complete as you go. Check the Preview tab to see the finished layout and the Insights tab for feedback on your thesis
                and outline. Download or print your outline when you are ready to start writing.
              </div>
            </>
          )}
        </section>
      </div>

      {/* --------------------------- Paste outline modal --------------------------- */}
      {showBulk && hydrated && createPortal(
        <div className="eob-app eob-portal" data-theme={theme}>
        <div className="eob-overlay" onClick={() => setShowBulk(false)}>
          <div className="eob-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Paste an outline</h3>
            <p>
              Type or paste one heading per line. Indent a line (two spaces or a tab) to make it a subsection. Bullets and numbers such
              as &quot;-&quot;, &quot;1.&quot; or &quot;1.1&quot; are removed automatically.
            </p>
            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              placeholder={"Introduction\n  Hook\n  Thesis\nBody\n  Point 1\n  Point 2\nConclusion"}
              autoFocus
            />
            <div className="eob-modal-actions">
              <button type="button" className="eob-secondary" onClick={() => setShowBulk(false)}>
                Cancel
              </button>
              <button type="button" className="eob-primary" onClick={importBulk}>
                Add to outline
              </button>
            </div>
          </div>
        </div>
        </div>,
        document.body
      )}

      {/* ----------------------------- Custom dialog ----------------------------- */}
      {dialog && hydrated && createPortal(
        <div className="eob-app eob-portal" data-theme={theme}>
        <div className="eob-overlay eob-overlay-top" onClick={closeDialog}>
          <div
            className="eob-modal eob-modal-small"
            role="alertdialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{dialog.title}</h3>
            <p>{dialog.message}</p>

            {dialog.input && (
              <input
                className="eob-small-input"
                value={dialogValue}
                autoFocus
                maxLength={200}
                placeholder={dialog.placeholder}
                onChange={(event) => setDialogValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitDialog();
                  }
                }}
              />
            )}

            <div className="eob-modal-actions">
              <button type="button" className="eob-secondary" onClick={closeDialog}>
                Cancel
              </button>
              <button
                type="button"
                className={dialog.danger ? "eob-danger-solid" : "eob-primary"}
                disabled={dialog.input && !dialogValue.trim()}
                onClick={submitDialog}
                autoFocus={!dialog.input}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
        </div>,
        document.body
      )}

      {notice && hydrated && createPortal(
        <div className="eob-app eob-portal" data-theme={theme}>
          <div className="eob-toast" role="status">
            {notice}
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}