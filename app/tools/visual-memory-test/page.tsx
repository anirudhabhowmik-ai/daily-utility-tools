
import type { Metadata } from "next";
import VisualMemoryTest from "./VisualMemoryTest";

export const metadata: Metadata = {
  title: "Visual Memory Test – Free Online Visual Memory Game | ToolsAB",
  description:
    "Play the free Visual Memory Test online. Memorize highlighted squares, recreate patterns, and challenge your visual memory with easy, medium, and hard levels.",
  keywords: [
    "visual memory test",
    "visual memory game",
    "online memory test",
    "visual memory training",
    "brain games",
    "pattern memory test",
    "free memory game",
  ],
  alternates: {
    canonical: "/tools/visual-memory-test",
  },
  openGraph: {
    title: "Visual Memory Test – Free Online Memory Game",
    description:
      "How many squares can you remember? Play this free visual memory game and challenge yourself with increasingly difficult patterns.",
    url: "/tools/visual-memory-test",
    type: "website",
    siteName: "ToolsAB",
  },
  twitter: {
    card: "summary",
    title: "Visual Memory Test – Free Online Memory Game",
    description:
      "Memorize highlighted squares and test your visual memory with this free online brain game.",
  },
};

export default function VisualMemoryTestPage() {
  return <VisualMemoryTest />;
}
