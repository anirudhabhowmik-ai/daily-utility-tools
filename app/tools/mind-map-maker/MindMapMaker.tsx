"use client";

import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type Layout = "horizontal" | "vertical" | "radial";

type MindNode = {
  id: string;
  text: string;
  parentId: string | null;
  x: number;
  y: number;
  color: string;
  collapsed: boolean;
};

type MindMap = {
  id: string;
  title: string;
  rootId: string;
  layout: Layout;
  nodes: MindNode[];
  updatedAt: string;
};

type Snapshot = {
  maps: MindMap[];
  activeId: string;
  selectedId: string;
};

type Outline = { text: string; children?: Outline[] };

type ViewBox = { x: number; y: number; width: number; height: number };

type DragState =
  | {
      type: "node";
      startX: number;
      startY: number;
      origins: Map<string, { x: number; y: number }>;
      before: Snapshot;
      moved: boolean;
    }
  | {
      type: "pan";
      clientX: number;
      clientY: number;
      scale: number;
      originalView: ViewBox;
    };

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "toolsab-mind-map-maker-v2";
const BRAND = "#ff5a1f";
const NODE_WIDTH = 190;
const NODE_HEIGHT = 64;
const COLORS = [
  "#ff5a1f",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#ca8a04",
  "#9333ea",
  "#db2777",
  "#64748b",
];
const INITIAL_VIEW: ViewBox = { x: 0, y: 0, width: 1800, height: 1100 };
const LAYOUT_LABELS: Record<Layout, string> = {
  horizontal: "Horizontal tree",
  vertical: "Vertical tree",
  radial: "Radial",
};

const TEMPLATES: { id: string; label: string; title: string; outline: Outline }[] = [
  {
    id: "blank",
    label: "Blank",
    title: "Untitled mind map",
    outline: { text: "Central idea" },
  },
  {
    id: "brainstorm",
    label: "Brainstorm",
    title: "Brainstorm",
    outline: {
      text: "Big question",
      children: [
        { text: "Ideas", children: [{ text: "Idea one" }, { text: "Idea two" }] },
        { text: "Resources", children: [{ text: "People" }, { text: "Budget" }] },
        { text: "Risks", children: [{ text: "Unknowns" }, { text: "Blockers" }] },
        { text: "Next steps" },
      ],
    },
  },
  {
    id: "project",
    label: "Project plan",
    title: "Project plan",
    outline: {
      text: "Project",
      children: [
        { text: "Goals", children: [{ text: "Primary goal" }, { text: "Success metrics" }] },
        { text: "Tasks", children: [{ text: "Research" }, { text: "Design" }, { text: "Build" }] },
        { text: "Team", children: [{ text: "Owner" }, { text: "Contributors" }] },
        { text: "Timeline", children: [{ text: "Milestones" }, { text: "Deadline" }] },
      ],
    },
  },
  {
    id: "study",
    label: "Study notes",
    title: "Study notes",
    outline: {
      text: "Subject",
      children: [
        { text: "Key concepts", children: [{ text: "Definition" }, { text: "Examples" }] },
        { text: "Formulas and rules" },
        { text: "Questions to review" },
        { text: "Sources", children: [{ text: "Textbook" }, { text: "Lecture notes" }] },
      ],
    },
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "mind-map";

function wrapText(text: string, max = 19): string[] {
  const clean = text.trim() || "Untitled";
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (let word of words) {
    while (word.length > max) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(word.slice(0, max));
      word = word.slice(max);
    }

    if (!current) current = word;
    else if ((current + " " + word).length <= max) current += " " + word;
    else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);

  if (lines.length > 2) {
    const two = lines.slice(0, 2);
    const last = two[1];
    two[1] = (last.length > max - 1 ? last.slice(0, max - 1) : last) + "…";
    return two;
  }

  return lines;
}

function descendants(nodes: MindNode[], id: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>([id]);
  const queue = [id];

  while (queue.length) {
    const parent = queue.shift()!;
    for (const node of nodes) {
      if (node.parentId === parent && !seen.has(node.id)) {
        seen.add(node.id);
        result.push(node.id);
        queue.push(node.id);
      }
    }
  }

  return result;
}

function visibleNodeIds(nodes: MindNode[], rootId: string) {
  const result = new Set<string>();
  const childrenOf = new Map<string, MindNode[]>();

  nodes.forEach((node) => {
    if (!node.parentId) return;
    const list = childrenOf.get(node.parentId) ?? [];
    list.push(node);
    childrenOf.set(node.parentId, list);
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));

  const visit = (id: string) => {
    if (result.has(id)) return;
    result.add(id);
    const current = byId.get(id);
    if (!current || current.collapsed) return;
    (childrenOf.get(id) ?? []).forEach((child) => visit(child.id));
  };

  visit(rootId);
  return result;
}

function boundsOf(nodes: MindNode[]) {
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + NODE_WIDTH);
    maxY = Math.max(maxY, node.y + NODE_HEIGHT);
  });

  return { minX, minY, maxX, maxY };
}

/**
 * Lays out the visible part of the tree. The root keeps its current position,
 * so the map does not jump around when topics are added or removed.
 */
function arrangeNodes(nodes: MindNode[], rootId: string, layout: Layout): MindNode[] {
  const copy = nodes.map((node) => ({ ...node }));
  const byId = new Map(copy.map((node) => [node.id, node]));
  const root = byId.get(rootId);
  if (!root) return copy;

  const childMap = new Map<string, MindNode[]>();
  copy.forEach((node) => {
    if (!node.parentId) return;
    const list = childMap.get(node.parentId) ?? [];
    list.push(node);
    childMap.set(node.parentId, list);
  });

  const originX = root.x;
  const originY = root.y;
  const placed = new Set<string>();
  const kids = (node: MindNode) => (node.collapsed ? [] : childMap.get(node.id) ?? []);

  if (layout === "horizontal") {
    let cursor = 0;

    const walk = (node: MindNode, depth: number) => {
      placed.add(node.id);
      const children = kids(node).filter((child) => !placed.has(child.id));

      if (!children.length) {
        node.y = cursor;
        cursor += NODE_HEIGHT + 34;
      } else {
        children.forEach((child) => walk(child, depth + 1));
        node.y = (children[0].y + children[children.length - 1].y) / 2;
      }

      node.x = depth * (NODE_WIDTH + 80);
    };

    walk(root, 0);
  }

  if (layout === "vertical") {
    let cursor = 0;

    const walk = (node: MindNode, depth: number) => {
      placed.add(node.id);
      const children = kids(node).filter((child) => !placed.has(child.id));

      if (!children.length) {
        node.x = cursor;
        cursor += NODE_WIDTH + 40;
      } else {
        children.forEach((child) => walk(child, depth + 1));
        node.x = (children[0].x + children[children.length - 1].x) / 2;
      }

      node.y = depth * (NODE_HEIGHT + 90);
    };

    walk(root, 0);
  }

  if (layout === "radial") {
    const leafCache = new Map<string, number>();

    const leaves = (node: MindNode, guard = new Set<string>()): number => {
      if (leafCache.has(node.id)) return leafCache.get(node.id)!;
      if (guard.has(node.id)) return 1;
      guard.add(node.id);
      const children = kids(node);
      const total = children.length
        ? children.reduce((sum, child) => sum + leaves(child, guard), 0)
        : 1;
      leafCache.set(node.id, total);
      return total;
    };

    root.x = -NODE_WIDTH / 2;
    root.y = -NODE_HEIGHT / 2;
    placed.add(root.id);

    const place = (parent: MindNode, depth: number, start: number, end: number) => {
      const children = kids(parent).filter((child) => !placed.has(child.id));
      if (!children.length) return;

      const total = children.reduce((sum, child) => sum + leaves(child), 0);
      let cursor = start;

      children.forEach((child) => {
        placed.add(child.id);
        const span = ((end - start) * leaves(child)) / total;
        const angle = cursor + span / 2;
        const radius = 300 + (depth - 1) * 240;

        child.x = Math.cos(angle) * radius - NODE_WIDTH / 2;
        child.y = Math.sin(angle) * radius - NODE_HEIGHT / 2;

        place(child, depth + 1, cursor, cursor + span);
        cursor += span;
      });
    };

    place(root, 1, -Math.PI / 2, (Math.PI * 3) / 2);
  }

  const dx = originX - root.x;
  const dy = originY - root.y;

  copy.forEach((node) => {
    if (placed.has(node.id)) {
      node.x += dx;
      node.y += dy;
    }
  });

  return copy;
}

function buildMap(title: string, outline: Outline, layout: Layout = "horizontal"): MindMap {
  const nodes: MindNode[] = [];
  const rootId = uid();

  nodes.push({
    id: rootId,
    text: outline.text,
    parentId: null,
    x: 120,
    y: 300,
    color: BRAND,
    collapsed: false,
  });

  const visit = (item: Outline, parentId: string, color: string) => {
    const id = uid();
    nodes.push({ id, text: item.text, parentId, x: 0, y: 0, color, collapsed: false });
    item.children?.forEach((child) => visit(child, id, color));
  };

  outline.children?.forEach((child, index) =>
    visit(child, rootId, COLORS[(index + 1) % COLORS.length])
  );

  return {
    id: uid(),
    title,
    rootId,
    layout,
    updatedAt: new Date().toISOString(),
    nodes: arrangeNodes(nodes, rootId, layout),
  };
}

function normalizeMap(value: unknown): MindMap | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.nodes) || !input.nodes.length) return null;

  const nodes: MindNode[] = input.nodes
    .filter(
      (item): item is Record<string, unknown> => !!item && typeof item === "object"
    )
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id ? item.id : uid(),
      text:
        typeof item.text === "string" && item.text.trim()
          ? item.text.slice(0, 200)
          : `Topic ${index + 1}`,
      parentId: typeof item.parentId === "string" ? item.parentId : null,
      x: Number.isFinite(Number(item.x)) ? Number(item.x) : 120 + index * 230,
      y: Number.isFinite(Number(item.y)) ? Number(item.y) : 300,
      color:
        typeof item.color === "string" && /^#[0-9a-f]{6}$/i.test(item.color)
          ? item.color
          : COLORS[index % COLORS.length],
      collapsed: item.collapsed === true,
    }));

  if (!nodes.length) return null;

  const root =
    nodes.find((node) => node.id === input.rootId && !node.parentId) ??
    nodes.find((node) => !node.parentId);

  if (!root) return null;

  const ids = new Set(nodes.map((node) => node.id));

  nodes.forEach((node) => {
    if (node.id !== root.id && (!node.parentId || !ids.has(node.parentId))) {
      node.parentId = root.id;
    }
  });

  root.parentId = null;

  const layout: Layout =
    input.layout === "vertical" || input.layout === "radial" ? input.layout : "horizontal";

  return {
    id: typeof input.id === "string" && input.id ? input.id : uid(),
    title:
      typeof input.title === "string" && input.title.trim()
        ? input.title.slice(0, 100)
        : "Imported mind map",
    rootId: root.id,
    layout,
    nodes,
    updatedAt:
      typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
  };
}

function downloadFile(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function MindMapMaker() {
  const [maps, setMaps] = useState<MindMap[]>([]);
  const [activeId, setActiveId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [viewBox, setViewBox] = useState<ViewBox>(INITIAL_VIEW);
  const [showMaps, setShowMaps] = useState(false);
  const [autoLayout, setAutoLayout] = useState(true);
  const [colorBranch, setColorBranch] = useState(true);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const revealRef = useRef<string | null>(null);

  const activeMap = maps.find((map) => map.id === activeId) ?? maps[0] ?? null;
  const selectedNode =
    activeMap?.nodes.find((node) => node.id === selectedId) ??
    activeMap?.nodes.find((node) => node.id === activeMap.rootId) ??
    null;
  const selId = selectedNode?.id ?? "";
  const layout: Layout = activeMap?.layout ?? "horizontal";

  /* ------------------------------ history -------------------------------- */

  const snapshot = useCallback(
    (): Snapshot => ({ maps, activeId: activeMap?.id ?? activeId, selectedId: selId }),
    [maps, activeId, activeMap?.id, selId]
  );

  const remember = useCallback(() => {
    setPast((current) => [...current.slice(-39), snapshot()]);
    setFuture([]);
  }, [snapshot]);

  /* ------------------------------ lifecycle ------------------------------ */

  useEffect(() => {
    let initial: MindMap[] = [];

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) {
        initial = parsed.map(normalizeMap).filter(Boolean) as MindMap[];
      }
    } catch {
      initial = [];
    }

    if (!initial.length) initial = [buildMap("My first mind map", TEMPLATES[1].outline)];

    setMaps(initial);
    setActiveId(initial[0].id);
    setSelectedId(initial[0].rootId);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
    } catch {
      setNotice("Browser storage is full. Export a backup to keep your work.");
    }
  }, [maps, hydrated]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  /* ------------------------------ view helpers --------------------------- */

  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const result = point.matrixTransform(ctm.inverse());
    return { x: result.x, y: result.y };
  }, []);

  const fitNodes = useCallback((nodes: MindNode[], rootId: string) => {
    const ids = visibleNodeIds(nodes, rootId);
    const visible = nodes.filter((node) => ids.has(node.id));
    const { minX, minY, maxX, maxY } = boundsOf(visible);
    const rect = svgRef.current?.getBoundingClientRect();
    const aspect = rect && rect.height ? rect.width / rect.height : 1.6;

    const boxW = maxX - minX;
    const boxH = maxY - minY;
    const width = Math.max(boxW + 160, (boxH + 160) * aspect, 700);
    const height = width / aspect;

    setViewBox({
      x: minX - (width - boxW) / 2,
      y: minY - (height - boxH) / 2,
      width,
      height,
    });
  }, []);

  const fitView = useCallback(() => {
    if (activeMap) fitNodes(activeMap.nodes, activeMap.rootId);
  }, [activeMap, fitNodes]);

  // Fit the map when the workspace opens or another map becomes active.
  useEffect(() => {
    if (hydrated && activeMap) fitNodes(activeMap.nodes, activeMap.rootId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, activeMap?.id]);

  // Pan the canvas when a freshly added or navigated topic is off screen.
  useEffect(() => {
    const id = revealRef.current;
    if (!id || !activeMap) return;
    revealRef.current = null;

    const node = activeMap.nodes.find((item) => item.id === id);
    if (!node) return;

    setViewBox((view) => {
      const margin = 40;
      const outside =
        node.x < view.x + margin ||
        node.y < view.y + margin ||
        node.x + NODE_WIDTH > view.x + view.width - margin ||
        node.y + NODE_HEIGHT > view.y + view.height - margin;

      if (!outside) return view;

      return {
        ...view,
        x: node.x + NODE_WIDTH / 2 - view.width / 2,
        y: node.y + NODE_HEIGHT / 2 - view.height / 2,
      };
    });
  }, [activeMap]);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setViewBox((view) => {
      const width = view.width * factor;
      if (width < 300 || width > 9000) return view;

      const centerX = cx ?? view.x + view.width / 2;
      const centerY = cy ?? view.y + view.height / 2;

      return {
        x: centerX - (centerX - view.x) * factor,
        y: centerY - (centerY - view.y) * factor,
        width,
        height: view.height * factor,
      };
    });
  }, []);

  // Ctrl / Cmd + scroll (and trackpad pinch) zooms toward the cursor.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const point = toSvgPoint(event.clientX, event.clientY);
      zoomAt(event.deltaY > 0 ? 1.1 : 0.9, point.x, point.y);
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [hydrated, activeMap?.id, toSvgPoint, zoomAt]);

  /* ------------------------------ derived -------------------------------- */

  const visibleIds = useMemo(
    () => (activeMap ? visibleNodeIds(activeMap.nodes, activeMap.rootId) : new Set<string>()),
    [activeMap]
  );

  const visibleNodes = useMemo(
    () => activeMap?.nodes.filter((node) => visibleIds.has(node.id)) ?? [],
    [activeMap, visibleIds]
  );

  const nodeById = useMemo(
    () => new Map((activeMap?.nodes ?? []).map((node) => [node.id, node])),
    [activeMap]
  );

  const childCounts = useMemo(() => {
    const counts = new Map<string, number>();
    activeMap?.nodes.forEach((node) => {
      if (node.parentId) counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
    });
    return counts;
  }, [activeMap]);

  const matches = useMemo(() => {
    if (!activeMap || !search.trim()) return new Set<string>();
    const query = search.trim().toLowerCase();
    return new Set(
      activeMap.nodes.filter((node) => node.text.toLowerCase().includes(query)).map((node) => node.id)
    );
  }, [activeMap, search]);

  const searchResults = useMemo(
    () => activeMap?.nodes.filter((node) => matches.has(node.id)) ?? [],
    [activeMap, matches]
  );

  /* ------------------------------ map actions ---------------------------- */

  const updateNodes = useCallback(
    (fn: (map: MindMap) => MindNode[], relayout = false) => {
      if (!activeMap) return;
      remember();
      const mapId = activeMap.id;

      setMaps((current) =>
        current.map((map) => {
          if (map.id !== mapId) return map;
          let nodes = fn(map);
          if (relayout && autoLayout) nodes = arrangeNodes(nodes, map.rootId, map.layout);
          return { ...map, nodes, updatedAt: new Date().toISOString() };
        })
      );
    },
    [activeMap, autoLayout, remember]
  );

  const createNewMap = (templateId = "blank") => {
    const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];
    remember();

    const title =
      template.id === "blank" ? `Mind map ${maps.length + 1}` : template.title;
    const map = buildMap(title, template.outline);

    setMaps((current) => [...current, map]);
    setActiveId(map.id);
    setSelectedId(map.rootId);
    setSearch("");
    setShowMaps(false);
    setNotice("New mind map created.");
  };

  const duplicateMap = (id: string) => {
    const source = maps.find((map) => map.id === id);
    if (!source) return;

    remember();
    const idMap = new Map(source.nodes.map((node) => [node.id, uid()]));

    const copy: MindMap = {
      ...source,
      id: uid(),
      title: `${source.title} copy`.slice(0, 100),
      rootId: idMap.get(source.rootId)!,
      updatedAt: new Date().toISOString(),
      nodes: source.nodes.map((node) => ({
        ...node,
        id: idMap.get(node.id)!,
        parentId: node.parentId ? idMap.get(node.parentId) ?? null : null,
      })),
    };

    setMaps((current) => [...current, copy]);
    setActiveId(copy.id);
    setSelectedId(copy.rootId);
    setShowMaps(false);
    setNotice("Mind map duplicated.");
  };

  const removeMap = (id: string) => {
    if (maps.length <= 1) {
      setNotice("At least one mind map must remain.");
      return;
    }

    const target = maps.find((map) => map.id === id);
    if (!window.confirm(`Delete "${target?.title ?? "this mind map"}"? You can undo this.`)) {
      return;
    }

    remember();
    const remaining = maps.filter((map) => map.id !== id);
    setMaps(remaining);

    if (id === activeMap?.id) {
      setActiveId(remaining[0].id);
      setSelectedId(remaining[0].rootId);
    }

    setNotice("Mind map deleted.");
  };

  const renameMap = (title: string) => {
    if (!activeMap) return;
    const mapId = activeMap.id;
    setMaps((current) =>
      current.map((map) =>
        map.id === mapId ? { ...map, title, updatedAt: new Date().toISOString() } : map
      )
    );
  };

  /* ------------------------------ topic actions -------------------------- */

  const focusEditor = () => {
    setTimeout(() => {
      textRef.current?.focus();
      textRef.current?.select();
    }, 60);
  };

  const addTopic = (fromId: string, sibling = false) => {
    if (!activeMap) return;

    const selected = nodeById.get(fromId);
    if (!selected) return;

    // The central topic has no siblings, so a sibling request adds a child.
    const useSibling = sibling && !!selected.parentId;
    const parent = useSibling ? nodeById.get(selected.parentId!) : selected;
    if (!parent) return;

    const siblings = activeMap.nodes.filter((node) => node.parentId === parent.id);
    const root = nodeById.get(activeMap.rootId)!;

    let x = parent.x + NODE_WIDTH + 80;
    let y = siblings.length ? siblings[siblings.length - 1].y + NODE_HEIGHT + 34 : parent.y;

    if (activeMap.layout === "vertical") {
      x = siblings.length ? siblings[siblings.length - 1].x + NODE_WIDTH + 40 : parent.x;
      y = parent.y + NODE_HEIGHT + 90;
    }

    if (activeMap.layout === "radial") {
      const angle =
        parent.id === root.id
          ? siblings.length * 0.9
          : Math.atan2(parent.y - root.y, parent.x - root.x);
      x = parent.x + Math.cos(angle) * 260;
      y = parent.y + Math.sin(angle) * 260;
    }

    const color =
      parent.id === activeMap.rootId
        ? COLORS[(siblings.length + 1) % COLORS.length]
        : parent.color;

    const node: MindNode = {
      id: uid(),
      text: "New topic",
      parentId: parent.id,
      x,
      y,
      color,
      collapsed: false,
    };

    updateNodes(
      (map) => [
        ...map.nodes.map((item) =>
          item.id === parent.id ? { ...item, collapsed: false } : item
        ),
        node,
      ],
      true
    );

    revealRef.current = node.id;
    setSelectedId(node.id);
    focusEditor();
  };

  const setNodeText = (id: string, text: string) => {
    if (!activeMap) return;
    const mapId = activeMap.id;
    setMaps((current) =>
      current.map((map) =>
        map.id === mapId
          ? {
              ...map,
              updatedAt: new Date().toISOString(),
              nodes: map.nodes.map((node) =>
                node.id === id ? { ...node, text: text.slice(0, 200) } : node
              ),
            }
          : map
      )
    );
  };

  const deleteTopic = () => {
    if (!activeMap || !selectedNode) return;

    if (selectedNode.id === activeMap.rootId) {
      setNotice("The central topic cannot be deleted.");
      return;
    }

    const removeIds = new Set([selectedNode.id, ...descendants(activeMap.nodes, selectedNode.id)]);
    const parentId = selectedNode.parentId;

    updateNodes((map) => map.nodes.filter((node) => !removeIds.has(node.id)), true);

    if (parentId) {
      revealRef.current = parentId;
      setSelectedId(parentId);
    }

    setNotice(
      removeIds.size > 1
        ? `Topic and ${removeIds.size - 1} subtopic${removeIds.size - 1 === 1 ? "" : "s"} deleted.`
        : "Topic deleted."
    );
  };

  const changeColor = (color: string) => {
    if (!activeMap || !selectedNode) return;
    const targets = new Set([selectedNode.id]);
    if (colorBranch) descendants(activeMap.nodes, selectedNode.id).forEach((id) => targets.add(id));

    updateNodes((map) =>
      map.nodes.map((node) => (targets.has(node.id) ? { ...node, color } : node))
    );
  };

  const toggleCollapse = (id = selId) => {
    const target = nodeById.get(id);
    if (!target || !childCounts.get(id)) return;

    updateNodes(
      (map) =>
        map.nodes.map((node) => (node.id === id ? { ...node, collapsed: !node.collapsed } : node)),
      true
    );
  };

  const setAllCollapsed = (collapsed: boolean) => {
    if (!activeMap) return;

    updateNodes(
      (map) =>
        map.nodes.map((node) =>
          node.id === map.rootId && collapsed
            ? { ...node, collapsed: false }
            : { ...node, collapsed: collapsed && (childCounts.get(node.id) ?? 0) > 0 }
        ),
      true
    );
    setNotice(collapsed ? "All branches collapsed." : "All branches expanded.");
  };

  const changeLayout = (next: Layout) => {
    if (!activeMap) return;

    remember();
    const arranged = arrangeNodes(activeMap.nodes, activeMap.rootId, next);
    const mapId = activeMap.id;

    setMaps((current) =>
      current.map((map) =>
        map.id === mapId
          ? { ...map, layout: next, nodes: arranged, updatedAt: new Date().toISOString() }
          : map
      )
    );

    fitNodes(arranged, activeMap.rootId);
    setNotice(`${LAYOUT_LABELS[next]} layout applied.`);
  };

  const navigate = (key: string) => {
    if (!activeMap || !selectedNode) return;

    let target: MindNode | undefined;
    const siblings = activeMap.nodes.filter((node) => node.parentId === selectedNode.parentId);
    const index = siblings.findIndex((node) => node.id === selectedNode.id);

    if (key === "ArrowLeft") target = selectedNode.parentId ? nodeById.get(selectedNode.parentId) : undefined;
    if (key === "ArrowRight" && !selectedNode.collapsed) {
      target = activeMap.nodes.find((node) => node.parentId === selectedNode.id);
    }
    if (key === "ArrowUp" && selectedNode.parentId) target = siblings[index - 1];
    if (key === "ArrowDown" && selectedNode.parentId) target = siblings[index + 1];

    if (target) {
      revealRef.current = target.id;
      setSelectedId(target.id);
    }
  };

  /* ------------------------------ undo / redo ---------------------------- */

  const undo = () => {
    if (!past.length) return;
    const previous = past[past.length - 1];
    setFuture((current) => [...current, snapshot()]);
    setPast((current) => current.slice(0, -1));
    setMaps(previous.maps);
    setActiveId(previous.activeId);
    setSelectedId(previous.selectedId);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[future.length - 1];
    setPast((current) => [...current, snapshot()]);
    setFuture((current) => current.slice(0, -1));
    setMaps(next.maps);
    setActiveId(next.activeId);
    setSelectedId(next.selectedId);
  };

  /* ------------------------------ import / export ------------------------ */

  const exportJson = () => {
    if (!activeMap) return;
    downloadFile(`${slug(activeMap.title)}.json`, JSON.stringify(activeMap, null, 2), "application/json");
    setNotice("Mind map exported as JSON.");
  };

  const exportAll = () => {
    downloadFile("toolsab-mind-maps-backup.json", JSON.stringify(maps, null, 2), "application/json");
    setNotice("Backup of all mind maps exported.");
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const input = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.maps)
          ? parsed.maps
          : [parsed];

      const imported = input.map(normalizeMap).filter(Boolean) as MindMap[];
      if (!imported.length) throw new Error("Invalid file");

      const prepared = imported.map((map) => {
        const idMap = new Map(map.nodes.map((node) => [node.id, uid()]));
        return {
          ...map,
          id: uid(),
          rootId: idMap.get(map.rootId)!,
          nodes: map.nodes.map((node) => ({
            ...node,
            id: idMap.get(node.id)!,
            parentId: node.parentId ? idMap.get(node.parentId) ?? null : null,
          })),
        };
      });

      remember();
      setMaps((current) => [...current, ...prepared]);
      setActiveId(prepared[0].id);
      setSelectedId(prepared[0].rootId);
      setNotice(`${prepared.length} mind map${prepared.length === 1 ? "" : "s"} imported.`);
    } catch {
      setNotice("Import failed. Choose a valid ToolsAB mind map JSON file.");
    }

    event.target.value = "";
  };

  const buildExportSvg = () => {
    const svg = svgRef.current;
    if (!svg || !activeMap) return null;

    const { minX, minY, maxX, maxY } = boundsOf(visibleNodes);
    const pad = 60;
    const width = Math.round(maxX - minX + pad * 2);
    const height = Math.round(maxY - minY + pad * 2);
    const ns = "http://www.w3.org/2000/svg";

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('[data-export="skip"]').forEach((element) => element.remove());
    clone.removeAttribute("class");
    clone.removeAttribute("style");
    clone.setAttribute("xmlns", ns);
    clone.setAttribute("viewBox", `${minX - pad} ${minY - pad} ${width} ${height}`);
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.setAttribute("font-family", "Inter, 'Segoe UI', Arial, sans-serif");

    const background = document.createElementNS(ns, "rect");
    background.setAttribute("x", String(minX - pad));
    background.setAttribute("y", String(minY - pad));
    background.setAttribute("width", String(width));
    background.setAttribute("height", String(height));
    background.setAttribute("fill", "#ffffff");
    clone.insertBefore(background, clone.firstChild);

    return { xml: new XMLSerializer().serializeToString(clone), width, height };
  };

  const exportSvg = () => {
    const built = buildExportSvg();
    if (!built || !activeMap) return;
    downloadFile(`${slug(activeMap.title)}.svg`, built.xml, "image/svg+xml");
    setNotice("Mind map exported as SVG.");
  };

  const exportPng = () => {
    const built = buildExportSvg();
    if (!built || !activeMap) return;

    const title = activeMap.title;
    const scale = 2;
    const url = URL.createObjectURL(new Blob([built.xml], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = built.width * scale;
      canvas.height = built.height * scale;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(url);
        setNotice("PNG export is not supported in this browser.");
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) {
          setNotice("PNG export failed. Try SVG instead.");
          return;
        }
        downloadFile(`${slug(title)}.png`, blob, "image/png");
        setNotice("Mind map exported as PNG.");
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      setNotice("PNG export failed. Try SVG instead.");
    };

    image.src = url;
  };

  const printMap = () => {
    fitView();
    setTimeout(() => window.print(), 250);
  };

  /* ------------------------------ pointer handling ----------------------- */

  const startNodeDrag = (event: ReactPointerEvent<SVGGElement>, node: MindNode) => {
    event.stopPropagation();
    if (event.button !== 0 || !activeMap) return;

    const point = toSvgPoint(event.clientX, event.clientY);
    const ids = new Set([node.id]);
    if (!event.altKey) descendants(activeMap.nodes, node.id).forEach((id) => ids.add(id));

    const origins = new Map<string, { x: number; y: number }>();
    activeMap.nodes.forEach((item) => {
      if (ids.has(item.id)) origins.set(item.id, { x: item.x, y: item.y });
    });

    dragRef.current = {
      type: "node",
      startX: point.x,
      startY: point.y,
      origins,
      before: snapshot(),
      moved: false,
    };

    setSelectedId(node.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;

    const ctm = svgRef.current?.getScreenCTM();
    dragRef.current = {
      type: "pan",
      clientX: event.clientX,
      clientY: event.clientY,
      scale: ctm && ctm.a ? 1 / ctm.a : 1,
      originalView: viewBox,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || !activeMap) return;

    if (drag.type === "pan") {
      setViewBox({
        ...drag.originalView,
        x: drag.originalView.x - (event.clientX - drag.clientX) * drag.scale,
        y: drag.originalView.y - (event.clientY - drag.clientY) * drag.scale,
      });
      return;
    }

    const point = toSvgPoint(event.clientX, event.clientY);
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;

    if (!drag.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 4) return;
      drag.moved = true;
      setPast((current) => [...current.slice(-39), drag.before]);
      setFuture([]);
    }

    const mapId = activeMap.id;
    setMaps((current) =>
      current.map((map) =>
        map.id === mapId
          ? {
              ...map,
              nodes: map.nodes.map((node) => {
                const origin = drag.origins.get(node.id);
                return origin ? { ...node, x: origin.x + dx, y: origin.y + dy } : node;
              }),
            }
          : map
      )
    );
  };

  const finishPointer = () => {
    dragRef.current = null;
  };

  /* ------------------------------ keyboard ------------------------------- */

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
      if (typing) return;

      const bodyLike = !target || target === document.body || !!svgRef.current?.contains(target);
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (mod || event.altKey) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!bodyLike) return;
        event.preventDefault();
        deleteTopic();
        return;
      }

      if (event.key === "Escape") {
        setSearch("");
        return;
      }

      if (!bodyLike) return;

      if (event.key === "Tab") {
        event.preventDefault();
        addTopic(selId);
      } else if (event.key === "Enter") {
        event.preventDefault();
        addTopic(selId, true);
      } else if (event.key === "F2") {
        event.preventDefault();
        focusEditor();
      } else if (event.key === " ") {
        event.preventDefault();
        toggleCollapse();
      } else if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        navigate(event.key);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  /* ------------------------------ rendering helpers ---------------------- */

  const connection = (parent: MindNode, child: MindNode) => {
    let x1: number, y1: number, x2: number, y2: number;
    let d: string;

    if (layout === "vertical") {
      const down = child.y + NODE_HEIGHT / 2 >= parent.y + NODE_HEIGHT / 2;
      x1 = parent.x + NODE_WIDTH / 2;
      y1 = down ? parent.y + NODE_HEIGHT : parent.y;
      x2 = child.x + NODE_WIDTH / 2;
      y2 = down ? child.y : child.y + NODE_HEIGHT;
      const mid = (y1 + y2) / 2;
      d = `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
    } else if (layout === "radial") {
      x1 = parent.x + NODE_WIDTH / 2;
      y1 = parent.y + NODE_HEIGHT / 2;
      x2 = child.x + NODE_WIDTH / 2;
      y2 = child.y + NODE_HEIGHT / 2;
      const mid = (x1 + x2) / 2;
      d = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
    } else {
      const right = child.x + NODE_WIDTH / 2 >= parent.x + NODE_WIDTH / 2;
      x1 = right ? parent.x + NODE_WIDTH : parent.x;
      y1 = parent.y + NODE_HEIGHT / 2;
      x2 = right ? child.x : child.x + NODE_WIDTH;
      y2 = child.y + NODE_HEIGHT / 2;
      const mid = (x1 + x2) / 2;
      d = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
    }

    return (
      <path
        key={`${parent.id}-${child.id}`}
        d={d}
        fill="none"
        stroke={child.color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.65"
      />
    );
  };

  const zoomPercent = (() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return 100;
    return Math.round(Math.min(rect.width / viewBox.width, rect.height / viewBox.height) * 100);
  })();

  const hiddenCount = (id: string) => descendants(activeMap?.nodes ?? [], id).length;

  /* ------------------------------ render --------------------------------- */

  if (!hydrated || !activeMap || !selectedNode) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: 360,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 18,
          border: "1px solid #e8e8ec",
          background: "#fff",
          fontSize: 14,
          color: "#6b7280",
        }}
      >
        Loading your workspace...
      </div>
    );
  }

  const savedAt = new Date(activeMap.updatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const selectedChildren = childCounts.get(selectedNode.id) ?? 0;
  const isRootSelected = selectedNode.id === activeMap.rootId;

  return (
    <div className="mm-root">
      <style jsx global>{`
        .mm-root,
        .mm-root *,
        .mm-root *::before,
        .mm-root *::after {
          box-sizing: border-box;
        }

        .mm-root {
          display: flex;
          flex-direction: column;
          gap: 18px;
          width: 100%;
          color: #1e2430;
          font-size: 14px;
          line-height: 1.5;
          --mm-brand: #ff5a1f;
          --mm-brand-dark: #e9470d;
          --mm-border: #e8e8ec;
        }

        .mm-root button,
        .mm-root input,
        .mm-root select,
        .mm-root textarea {
          font-family: inherit;
          margin: 0;
        }

        .mm-root h2,
        .mm-root h3,
        .mm-root p {
          margin: 0;
        }

        .mm-root button {
          cursor: pointer;
          transition: background 150ms ease, border-color 150ms ease, color 150ms ease,
            box-shadow 150ms ease, transform 150ms ease;
        }

        .mm-root button:active:not(:disabled) {
          transform: scale(0.97);
        }

        .mm-root button:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        .mm-root button:focus-visible,
        .mm-root select:focus-visible,
        .mm-root input:focus-visible,
        .mm-root textarea:focus-visible {
          outline: 2px solid var(--mm-brand);
          outline-offset: 2px;
        }

        /* Hero */
        .mm-root .mm-hero {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 30px 34px;
          border: 1px solid #ffe1d3;
          border-radius: 24px;
          background: linear-gradient(135deg, #fff3ec 0%, #ffffff 55%, #fff0f3 100%);
        }

        .mm-root .mm-hero::after {
          content: "";
          position: absolute;
          right: -60px;
          top: -80px;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background: rgba(255, 90, 31, 0.12);
          filter: blur(40px);
          pointer-events: none;
        }

        .mm-root .mm-hero h2 {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
        }

        .mm-root .mm-hero p {
          margin-top: 8px;
          max-width: 520px;
          color: #556070;
          font-size: 14px;
        }

        .mm-root .mm-hero > * {
          position: relative;
          z-index: 1;
        }

        /* Panels */
        .mm-root .mm-panel {
          border: 1px solid var(--mm-border);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .mm-root .mm-pad {
          padding: 16px 18px;
        }

        .mm-root .mm-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .mm-root .mm-docbar-top {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
        }

        .mm-root .mm-grow {
          flex: 1;
          min-width: 240px;
        }

        .mm-root .mm-meta {
          margin-top: 8px;
          font-size: 12px;
          color: #6b7280;
        }

        .mm-root .mm-label {
          display: block;
          margin-bottom: 7px;
          font-size: 12px;
          font-weight: 700;
          color: #69707d;
        }

        /* Buttons */
        .mm-root .mm-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          padding: 8px 14px;
          border: 1px solid transparent;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 650;
          line-height: 1.2;
          white-space: nowrap;
        }

        .mm-root .mm-primary {
          background: linear-gradient(180deg, #ff6a33, #ff5a1f);
          color: #fff;
          box-shadow: 0 6px 16px rgba(255, 90, 31, 0.28);
        }

        .mm-root .mm-primary:hover:not(:disabled) {
          background: linear-gradient(180deg, #ff5a1f, #e9470d);
        }

        .mm-root .mm-secondary {
          border-color: var(--mm-border);
          background: #fff;
          color: #3b4150;
        }

        .mm-root .mm-secondary:hover:not(:disabled) {
          border-color: #ffb49a;
          background: #fff7f3;
          color: #d83d0b;
        }

        .mm-root .mm-soft {
          background: #fff1ea;
          color: #c2410c;
        }

        .mm-root .mm-soft:hover:not(:disabled) {
          background: #ffe4d6;
        }

        .mm-root .mm-danger {
          border-color: #fde2e2;
          background: #fff;
          color: #dc2626;
        }

        .mm-root .mm-danger:hover:not(:disabled) {
          background: #fef2f2;
        }

        .mm-root .mm-block {
          width: 100%;
          justify-content: flex-start;
        }

        .mm-root .mm-icon {
          width: 34px;
          min-height: 34px;
          padding: 0;
          font-size: 18px;
        }

        .mm-root .mm-small {
          min-height: 34px;
          padding: 6px 12px;
        }

        .mm-root .mm-link-btn {
          border: 0;
          border-radius: 8px;
          background: none;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
        }

        .mm-root .mm-link-btn:hover {
          background: #f3f4f6;
        }

        .mm-root .mm-link-btn.is-danger {
          color: #dc2626;
        }

        .mm-root .mm-link-btn.is-danger:hover {
          background: #fef2f2;
        }

        /* Inputs */
        .mm-root .mm-input {
          display: block;
          width: 100%;
          border: 1px solid #e1e3e8;
          border-radius: 11px;
          background: #fff;
          padding: 10px 12px;
          font-size: 14px;
          color: #20242d;
          outline: none;
        }

        .mm-root .mm-input:focus {
          border-color: var(--mm-brand);
          box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.12);
        }

        .mm-root .mm-title-input {
          max-width: 520px;
          font-size: 16px;
          font-weight: 700;
        }

        .mm-root .mm-textarea {
          min-height: 80px;
          resize: vertical;
          line-height: 1.45;
        }

        .mm-root .mm-field {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 600;
          color: #6b7280;
        }

        .mm-root .mm-select {
          height: 38px;
          appearance: none;
          -webkit-appearance: none;
          border: 1px solid var(--mm-border);
          border-radius: 10px;
          padding: 0 32px 0 12px;
          background-color: #fff;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='none' stroke='%23697080' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' d='M2.5 4.5 6 8l3.5-3.5'/></svg>");
          background-repeat: no-repeat;
          background-position: right 11px center;
          font-size: 12.5px;
          font-weight: 600;
          color: #3b4150;
          cursor: pointer;
        }

        .mm-root .mm-check {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 600;
          color: #3b4150;
          cursor: pointer;
        }

        .mm-root .mm-check input {
          width: 16px;
          height: 16px;
          accent-color: #ff5a1f;
        }

        .mm-root .mm-hidden {
          display: none;
        }

        /* Maps list */
        .mm-root .mm-maps {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f1f2f5;
        }

        .mm-root .mm-maps-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .mm-root .mm-map-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 8px;
        }

        .mm-root .mm-map-card {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
        }

        .mm-root .mm-map-card.is-active {
          border-color: #ffb49a;
          background: #fff6f1;
        }

        .mm-root .mm-map-open {
          flex: 1;
          min-width: 0;
          border: 0;
          background: none;
          padding: 0;
          text-align: left;
          color: inherit;
        }

        .mm-root .mm-map-name {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 700;
          color: #1e2430;
        }

        .mm-root .mm-map-count {
          font-size: 12px;
          color: #6b7280;
        }

        /* Toolbar */
        .mm-root .mm-toolbar {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px 16px;
        }

        .mm-root .mm-toolbar-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .mm-root .mm-toolbar-row + .mm-toolbar-row {
          padding-top: 12px;
          border-top: 1px solid #f1f2f5;
        }

        .mm-root .mm-sep {
          width: 1px;
          height: 24px;
          margin: 0 4px;
          background: #e5e7eb;
        }

        .mm-root .mm-push {
          margin-left: auto;
        }

        .mm-root .mm-group-label {
          margin-right: 2px;
          font-size: 12.5px;
          font-weight: 700;
          color: #69707d;
        }

        /* Workspace */
        .mm-root .mm-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 16px;
          align-items: start;
        }

        @media (max-width: 1100px) {
          .mm-root .mm-workspace {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .mm-root .mm-canvas-card {
          min-width: 0;
          overflow: hidden;
        }

        .mm-root .mm-canvas-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid #f1f2f5;
        }

        .mm-root .mm-h3 {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .mm-root .mm-sub {
          margin-top: 2px;
          max-width: 560px;
          font-size: 12px;
          color: #6b7280;
        }

        .mm-root .mm-zoom {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .mm-root .mm-zoom-text {
          min-width: 46px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          font-variant-numeric: tabular-nums;
        }

        .mm-root .mm-stage {
          position: relative;
        }

        .mm-root .mm-canvas {
          display: block;
          width: 100%;
          height: 580px;
          background: #fafafa;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          cursor: default;
        }

        .mm-root .mm-canvas:active {
          cursor: move;
        }

        @media (max-width: 640px) {
          .mm-root .mm-canvas {
            height: 420px;
          }
        }

        .mm-root .mm-node {
          cursor: grab;
          touch-action: none;
        }

        .mm-root .mm-node:active {
          cursor: grabbing;
        }

        .mm-root .mm-hint {
          position: absolute;
          left: 12px;
          bottom: 12px;
          padding: 7px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.95);
          font-size: 11.5px;
          color: #6b7280;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          pointer-events: none;
        }

        .mm-root .mm-search {
          padding: 14px 18px;
          border-top: 1px solid #f1f2f5;
        }

        .mm-root .mm-results {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 10px;
          max-height: 190px;
          overflow-y: auto;
        }

        .mm-root .mm-result {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          border: 0;
          border-radius: 8px;
          background: none;
          padding: 8px 10px;
          text-align: left;
          font-size: 13px;
          color: #1e2430;
        }

        .mm-root .mm-result:hover {
          background: #fff4ee;
        }

        .mm-root .mm-result span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mm-root .mm-dot {
          flex: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .mm-root .mm-empty {
          font-size: 12px;
          color: #6b7280;
        }

        /* Inspector */
        .mm-root .mm-aside {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .mm-root .mm-aside-head {
          padding: 16px 18px;
          border-bottom: 1px solid #f1f2f5;
          background: linear-gradient(90deg, #fff3ec, #fff);
          border-radius: 18px 18px 0 0;
        }

        .mm-root .mm-aside-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px 18px 18px;
        }

        .mm-root .mm-section {
          padding-top: 16px;
          border-top: 1px solid #f1f2f5;
        }

        .mm-root .mm-hint-text {
          margin-top: 6px;
          font-size: 11.5px;
          color: #9097a3;
        }

        .mm-root .mm-swatches {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .mm-root .mm-swatch {
          width: 30px;
          height: 30px;
          padding: 0;
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 0 1px #d9dce3;
        }

        .mm-root .mm-swatch.is-on {
          box-shadow: 0 0 0 2px #0f172a;
        }

        .mm-root .mm-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mm-root .mm-kv {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 4px 0;
          font-size: 12.5px;
          color: #556070;
        }

        .mm-root kbd {
          border: 1px solid #e2e5ea;
          border-bottom-width: 2px;
          border-radius: 6px;
          background: #f8f9fb;
          padding: 2px 8px;
          font-family: inherit;
          font-size: 11.5px;
          font-weight: 600;
          color: #3b4150;
          white-space: nowrap;
        }

        .mm-root .mm-tip {
          padding: 16px 18px;
          border: 1px solid #ffe1d3;
          border-radius: 16px;
          background: #fff6f1;
        }

        .mm-root .mm-tip strong {
          display: block;
          font-size: 13px;
          color: #9a3412;
        }

        .mm-root .mm-tip p {
          margin-top: 4px;
          font-size: 12.5px;
          line-height: 1.55;
          color: #b45309;
        }

        .mm-root .mm-notice {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          border: 1px solid #ffe1d3;
          border-radius: 12px;
          background: #fff6f1;
          font-size: 12.5px;
          font-weight: 600;
          color: #9a3412;
        }

        .mm-root .mm-notice button {
          border: 0;
          background: none;
          font-size: 12.5px;
          font-weight: 700;
          color: #9a3412;
        }

        .mm-root .mm-privacy {
          padding: 16px 18px;
          border: 1px solid var(--mm-border);
          border-radius: 14px;
          background: #fff;
        }

        .mm-root .mm-privacy p {
          margin-top: 4px;
          font-size: 12.5px;
          line-height: 1.6;
          color: #6b7280;
        }

        @media (prefers-reduced-motion: reduce) {
          .mm-root * {
            transition: none !important;
          }
        }

        @media print {
          body * {
            visibility: hidden !important;
          }

          .mm-print-area,
          .mm-print-area * {
            visibility: visible !important;
          }

          .mm-print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
          }

          .mm-root .mm-canvas {
            width: 100% !important;
            height: auto !important;
          }

          .mm-no-print {
            display: none !important;
          }

          @page {
            size: landscape;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Header */}
      <div className="mm-hero mm-no-print">
        <div>
          <h2>Mind Map Studio</h2>
          <p>
            Turn scattered thoughts into a clear visual structure. Build branches, rearrange them
            freely, and export when you are done.
          </p>
        </div>

        <button type="button" onClick={() => createNewMap("blank")} className="mm-btn mm-primary">
          ＋ New mind map
        </button>
      </div>

      {/* Document bar */}
      <div className="mm-panel mm-pad mm-no-print">
        <div className="mm-docbar-top">
          <div className="mm-grow">
            <label className="mm-label" htmlFor="mm-title">
              Mind map name
            </label>
            <input
              id="mm-title"
              className="mm-input mm-title-input"
              value={activeMap.title}
              maxLength={100}
              onChange={(event) => renameMap(event.target.value)}
              placeholder="Name your mind map"
            />
            <p className="mm-meta">
              {visibleNodes.length} of {activeMap.nodes.length} topics shown. Saved in this browser
              at {savedAt}.
            </p>
          </div>

          <div className="mm-row">
            <button
              type="button"
              className="mm-btn mm-secondary"
              onClick={() => setShowMaps((value) => !value)}
              aria-expanded={showMaps}
            >
              ▤ My maps ({maps.length})
            </button>
            <button
              type="button"
              className="mm-btn mm-secondary"
              onClick={undo}
              disabled={!past.length}
              title="Undo (Ctrl + Z)"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              className="mm-btn mm-secondary"
              onClick={redo}
              disabled={!future.length}
              title="Redo (Ctrl + Y)"
            >
              ↷ Redo
            </button>
          </div>
        </div>

        {showMaps && (
          <div className="mm-maps">
            <div className="mm-maps-head">
              <h3 className="mm-h3">Your saved mind maps</h3>
              <button type="button" onClick={() => setShowMaps(false)} className="mm-link-btn">
                Close
              </button>
            </div>

            <div className="mm-map-grid">
              {maps.map((map) => (
                <div
                  key={map.id}
                  className={`mm-map-card ${map.id === activeMap.id ? "is-active" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(map.id);
                      setSelectedId(map.rootId);
                      setSearch("");
                      setShowMaps(false);
                    }}
                    className="mm-map-open"
                  >
                    <span className="mm-map-name">{map.title}</span>
                    <span className="mm-map-count">{map.nodes.length} topics</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => duplicateMap(map.id)}
                    className="mm-link-btn"
                    aria-label={`Duplicate ${map.title}`}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMap(map.id)}
                    className="mm-link-btn is-danger"
                    aria-label={`Delete ${map.title}`}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <span className="mm-label">Start a new map from a template</span>
              <div className="mm-row">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => createNewMap(template.id)}
                    className="mm-btn mm-secondary"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="mm-panel mm-toolbar mm-no-print">
        <div className="mm-toolbar-row">
          <button type="button" className="mm-btn mm-primary" onClick={() => addTopic(selId)}>
            ＋ Add subtopic
          </button>

          <button
            type="button"
            className="mm-btn mm-secondary"
            onClick={() => addTopic(selId, true)}
            disabled={isRootSelected}
          >
            ＋ Add sibling
          </button>

          <span className="mm-sep" />

          <label className="mm-field">
            Layout
            <select
              value={activeMap.layout}
              onChange={(event) => changeLayout(event.target.value as Layout)}
              className="mm-select"
            >
              {(Object.keys(LAYOUT_LABELS) as Layout[]).map((key) => (
                <option key={key} value={key}>
                  {LAYOUT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="mm-btn mm-secondary"
            onClick={() => changeLayout(activeMap.layout)}
            title="Re-arrange every topic using the current layout"
          >
            ✦ Tidy up
          </button>

          <label className="mm-check">
            <input
              type="checkbox"
              checked={autoLayout}
              onChange={(event) => setAutoLayout(event.target.checked)}
            />
            Auto-arrange
          </label>

          <div className="mm-row mm-push">
            <button type="button" className="mm-btn mm-secondary" onClick={() => setAllCollapsed(false)}>
              Expand all
            </button>
            <button type="button" className="mm-btn mm-secondary" onClick={() => setAllCollapsed(true)}>
              Collapse all
            </button>
          </div>
        </div>

        <div className="mm-toolbar-row">
          <span className="mm-group-label">Export</span>
          <button type="button" className="mm-btn mm-secondary" onClick={exportPng}>
            PNG
          </button>
          <button type="button" className="mm-btn mm-secondary" onClick={exportSvg}>
            SVG
          </button>
          <button type="button" className="mm-btn mm-secondary" onClick={exportJson}>
            JSON
          </button>
          <button type="button" className="mm-btn mm-secondary" onClick={printMap}>
            Print / PDF
          </button>

          <span className="mm-sep" />

          <button type="button" className="mm-btn mm-secondary" onClick={() => fileRef.current?.click()}>
            ↑ Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="mm-hidden"
            onChange={importJson}
          />
          <button type="button" className="mm-btn mm-secondary" onClick={exportAll}>
            Backup all maps
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="mm-workspace">
        <section className="mm-panel mm-canvas-card">
          <div className="mm-canvas-head mm-no-print">
            <div>
              <h3 className="mm-h3">Canvas</h3>
              <p className="mm-sub">
                Click a topic to edit it. Drag a topic to move its branch, or hold Alt to move only
                that topic. Drag empty space to pan.
              </p>
            </div>

            <div className="mm-zoom">
              <button
                type="button"
                onClick={() => zoomAt(1.25)}
                className="mm-btn mm-secondary mm-icon"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="mm-zoom-text">{zoomPercent}%</span>
              <button
                type="button"
                onClick={() => zoomAt(0.8)}
                className="mm-btn mm-secondary mm-icon"
                aria-label="Zoom in"
              >
                +
              </button>
              <button type="button" onClick={fitView} className="mm-btn mm-secondary mm-small">
                Fit to screen
              </button>
            </div>
          </div>

          <div className="mm-print-area mm-stage">
            <svg
              ref={svgRef}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
              preserveAspectRatio="xMidYMid meet"
              className="mm-canvas"
              onPointerDown={startPan}
              onPointerMove={movePointer}
              onPointerUp={finishPointer}
              onPointerCancel={finishPointer}
              role="img"
              aria-label={`Mind map canvas for ${activeMap.title}`}
            >
              <defs>
                <pattern id="mm-dot-grid" width="26" height="26" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.2" fill="#e1e5eb" />
                </pattern>

                <filter id="mm-shadow" x="-30%" y="-30%" width="160%" height="180%">
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="5"
                    floodColor="#1e293b"
                    floodOpacity="0.12"
                  />
                </filter>
              </defs>

              <rect
                data-export="skip"
                x={viewBox.x - 4000}
                y={viewBox.y - 4000}
                width={viewBox.width + 8000}
                height={viewBox.height + 8000}
                fill="url(#mm-dot-grid)"
              />

              {visibleNodes.map((node) => {
                if (!node.parentId) return null;
                const parent = nodeById.get(node.parentId);
                return parent && visibleIds.has(parent.id) ? connection(parent, node) : null;
              })}

              {visibleNodes.map((node) => {
                const selected = selId === node.id;
                const matched = matches.has(node.id);
                const dimmed = !!search.trim() && !matched;
                const isRoot = node.id === activeMap.rootId;
                const children = childCounts.get(node.id) ?? 0;
                const lines = wrapText(node.text, isRoot ? 17 : 19);
                const textX = isRoot ? 20 : 24;
                const startY = NODE_HEIGHT / 2 - (lines.length - 1) * 9 + 5;
                const badgeX = layout === "vertical" ? NODE_WIDTH / 2 : NODE_WIDTH;
                const badgeY = layout === "vertical" ? NODE_HEIGHT : NODE_HEIGHT / 2;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    className="mm-node"
                    opacity={dimmed ? 0.35 : 1}
                    onPointerDown={(event) => startNodeDrag(event, node)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(node.id);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(node.id);
                      focusEditor();
                    }}
                  >
                    {selected && (
                      <rect
                        data-export="skip"
                        x="-6"
                        y="-6"
                        width={NODE_WIDTH + 12}
                        height={NODE_HEIGHT + 12}
                        rx="18"
                        fill="none"
                        stroke={BRAND}
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                    )}

                    {matched && (
                      <rect
                        data-export="skip"
                        x="-4"
                        y="-4"
                        width={NODE_WIDTH + 8}
                        height={NODE_HEIGHT + 8}
                        rx="16"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3"
                      />
                    )}

                    {isRoot ? (
                      <rect
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                        rx="16"
                        fill={node.color}
                        filter="url(#mm-shadow)"
                      />
                    ) : (
                      <>
                        <rect
                          width={NODE_WIDTH}
                          height={NODE_HEIGHT}
                          rx="14"
                          fill={node.color}
                          filter="url(#mm-shadow)"
                        />
                        <rect
                          x="6"
                          width={NODE_WIDTH - 6}
                          height={NODE_HEIGHT}
                          rx="12"
                          fill="white"
                          stroke={selected ? BRAND : "#e5e7eb"}
                          strokeWidth={selected ? 2 : 1}
                        />
                      </>
                    )}

                    <text
                      fill={isRoot ? "#ffffff" : "#202938"}
                      fontSize={isRoot ? 15 : 14}
                      fontWeight={isRoot ? 750 : 600}
                      pointerEvents="none"
                    >
                      {lines.map((line, index) => (
                        <tspan key={index} x={textX} y={startY + index * 18}>
                          {line}
                        </tspan>
                      ))}
                    </text>

                    {children > 0 && (
                      <g
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(node.id);
                          toggleCollapse(node.id);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <circle
                          cx={badgeX}
                          cy={badgeY}
                          r="12"
                          fill="white"
                          stroke={node.color}
                          strokeWidth="2.5"
                        />
                        <text
                          x={badgeX}
                          y={badgeY + 4}
                          textAnchor="middle"
                          fill={node.color}
                          fontSize={node.collapsed ? 10 : 14}
                          fontWeight="700"
                          pointerEvents="none"
                        >
                          {node.collapsed ? `+${hiddenCount(node.id)}` : "−"}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            <div className="mm-hint mm-no-print">Ctrl + scroll to zoom</div>
          </div>

          <div className="mm-search mm-no-print">
            <div className="mm-row" style={{ flexWrap: "nowrap" }}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search topics in this mind map..."
                className="mm-input"
                aria-label="Search topics"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="mm-btn mm-secondary">
                  Clear
                </button>
              )}
            </div>

            {search.trim() && (
              <div className="mm-results">
                {searchResults.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => {
                      // Expand any collapsed ancestors so the match becomes visible.
                      const ancestors = new Set<string>();
                      let cursor = node.parentId ? nodeById.get(node.parentId) : undefined;
                      while (cursor && !ancestors.has(cursor.id)) {
                        ancestors.add(cursor.id);
                        cursor = cursor.parentId ? nodeById.get(cursor.parentId) : undefined;
                      }

                      const needsExpand = [...ancestors].some((id) => nodeById.get(id)?.collapsed);
                      if (needsExpand) {
                        updateNodes(
                          (map) =>
                            map.nodes.map((item) =>
                              ancestors.has(item.id) ? { ...item, collapsed: false } : item
                            ),
                          true
                        );
                      }

                      revealRef.current = node.id;
                      setSelectedId(node.id);
                    }}
                    className="mm-result"
                  >
                    <span className="mm-dot" style={{ background: node.color }} />
                    <span>{node.text}</span>
                  </button>
                ))}
                {!searchResults.length && <p className="mm-empty">No matching topics found.</p>}
              </div>
            )}
          </div>
        </section>

        {/* Inspector */}
        <aside className="mm-aside mm-no-print">
          <div className="mm-panel">
            <div className="mm-aside-head">
              <h3 className="mm-h3" style={{ fontSize: 16 }}>
                Topic inspector
              </h3>
              <p className="mm-sub">
                {isRootSelected ? "Central topic" : "Branch topic"}
                {selectedChildren > 0
                  ? `, ${selectedChildren} direct subtopic${selectedChildren === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>

            <div className="mm-aside-body">
              <div>
                <label className="mm-label" htmlFor="mm-topic-text">
                  Topic name
                </label>
                <textarea
                  id="mm-topic-text"
                  ref={textRef}
                  className="mm-input mm-textarea"
                  rows={3}
                  maxLength={200}
                  value={selectedNode.text}
                  onFocus={remember}
                  onChange={(event) => setNodeText(selectedNode.id, event.target.value)}
                  onBlur={() => {
                    if (!selectedNode.text.trim()) setNodeText(selectedNode.id, "New topic");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") event.currentTarget.blur();
                  }}
                  placeholder="Enter a topic name..."
                />
                <p className="mm-hint-text">
                  {selectedNode.text.length}/200 characters. Changes save as you type. Press Enter
                  to finish.
                </p>
              </div>

              <div className="mm-section">
                <span className="mm-label">Branch colour</span>
                <div className="mm-swatches">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => changeColor(color)}
                      className={`mm-swatch ${selectedNode.color === color ? "is-on" : ""}`}
                      style={{ background: color }}
                      aria-label={`Choose colour ${color}`}
                      aria-pressed={selectedNode.color === color}
                    />
                  ))}
                </div>
                <label className="mm-check" style={{ marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={colorBranch}
                    onChange={(event) => setColorBranch(event.target.checked)}
                  />
                  Apply colour to all subtopics
                </label>
              </div>

              <div className="mm-section">
                <span className="mm-label">Actions</span>
                <div className="mm-stack">
                  <button
                    type="button"
                    onClick={() => addTopic(selId)}
                    className="mm-btn mm-soft mm-block"
                  >
                    ＋ Add child topic
                  </button>

                  <button
                    type="button"
                    onClick={() => addTopic(selId, true)}
                    disabled={isRootSelected}
                    className="mm-btn mm-secondary mm-block"
                  >
                    ＋ Add sibling topic
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCollapse()}
                    disabled={!selectedChildren}
                    className="mm-btn mm-secondary mm-block"
                  >
                    {selectedNode.collapsed ? "＋ Expand child branches" : "− Collapse child branches"}
                  </button>

                  <button
                    type="button"
                    onClick={deleteTopic}
                    disabled={isRootSelected}
                    className="mm-btn mm-danger mm-block"
                  >
                    Delete topic and subtopics
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mm-panel mm-pad">
            <h3 className="mm-h3">Keyboard shortcuts</h3>
            <div style={{ marginTop: 10 }}>
              {[
                ["Add subtopic", "Tab"],
                ["Add sibling", "Enter"],
                ["Rename topic", "F2"],
                ["Collapse or expand", "Space"],
                ["Move selection", "Arrow keys"],
                ["Delete topic", "Delete"],
                ["Undo", "Ctrl + Z"],
                ["Redo", "Ctrl + Y"],
                ["Clear search", "Esc"],
              ].map(([label, keys]) => (
                <div key={label} className="mm-kv">
                  <span>{label}</span>
                  <kbd>{keys}</kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="mm-tip">
            <strong>Tip</strong>
            <p>
              Keep the central topic short. Use main branches for broad categories and smaller
              branches for supporting details.
            </p>
          </div>
        </aside>
      </div>

      {notice && (
        <div role="status" className="mm-notice mm-no-print">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="mm-privacy mm-no-print">
        <h3 className="mm-h3">Your workspace and privacy</h3>
        <p>
          Your mind maps are saved automatically in this browser. They are not uploaded to an
          online account or synchronized between devices. Export JSON backups regularly if you want
          to keep or transfer your work.
        </p>
      </div>
    </div>
  );
}