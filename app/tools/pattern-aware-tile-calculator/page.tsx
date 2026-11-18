import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import TileCalculator from "./TileCalculator";

export const metadata: Metadata = {
  title: "Pattern-Aware Tile Calculator | ToolsAB",
  description: "Estimate tile counts for offset, staggered, and pattern-based layouts before buying materials.",
  alternates: { canonical: "/tools/pattern-aware-tile-calculator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<TileCalculator />}
      title="Pattern-Aware Tile Calculator"
      summary="Estimate how many tiles you need for wall and floor projects that use offset or patterned layouts."
      highlights={[
        "Helps plan for brick patterns, staggered layouts, and repeating offset designs.",
        "Provides a quick estimate before buying tile, trim, or grout materials.",
        "Useful for bathroom, backsplash, and floor projects where pattern alignment matters.",
      ]}
      steps={[
        "Enter the room dimensions and the tile size you plan to use.",
        "Set the pattern offset or stagger amount for your layout design.",
        "Add a waste percentage for cuts, breakage, and edge trimming.",
        "Review the total tile count and decide how much to buy.",
      ]}
      faqs={[
        {
          question: "Does the pattern change the number of tiles?",
          answer: "Yes. A staggered or offset pattern often requires more tiles than a straight grid because more cuts and alignment losses are involved.",
        },
        {
          question: "Should I add waste?",
          answer: "Always. A 5% to 15% overage is common depending on the pattern, tile size, and your tolerance for cuts around edges and fixtures.",
        },
        {
          question: "What about grout and trim?",
          answer: "Tile count is only one piece of the project. Grout, spacers, and trim are separate materials and may need their own estimate depending on your layout.",
        },
      ]}
      note="Pattern-heavy layouts look best when the design is planned in advance. Always check the tile manufacturer's recommendations for grout spacing, edge trim, and required alignment details."
    />
  );
}
