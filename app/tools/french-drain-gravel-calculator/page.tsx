import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import GravelCalculator from "./GravelCalculator";

export const metadata: Metadata = {
  title: "French Drain Gravel Calculator | DailyTools",
  description: "Estimate gravel volume and trench dimensions for a French drain before you purchase materials.",
  alternates: { canonical: "/tools/french-drain-gravel-calculator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<GravelCalculator />}
      title="French Drain Gravel Calculator"
      summary="Estimate the gravel and trench dimensions needed for a French drain project before you buy materials or begin digging."
      highlights={[
        "Calculate gravel volume from trench length, width, and depth.",
        "Helpful for planning a basement drainage trench, downspout drain, or yard runoff fix.",
        "Gives a practical material estimate for budgeting and ordering rock or aggregate.",
      ]}
      steps={[
        "Measure the trench length and planned width.",
        "Enter the trench depth and the gravel layer thickness you want.",
        "Review the estimated gravel volume and adjust the dimensions if needed.",
        "Use the estimate to plan a purchase and verify the final layout on site.",
      ]}
      faqs={[
        {
          question: "Does this include pipe, fabric, or fittings?",
          answer: "This estimate focuses on the gravel volume and trench dimensions. Perforated pipe, landscape fabric, and connectors are usually additional materials and may need a separate budget line.",
        },
        {
          question: "What units does it use?",
          answer: "The tool can be used with the unit system you prefer, whether that is feet, inches, or metric values. Always make sure the same units are used consistently in the calculation."
        },
        {
          question: "Should I buy extra material?",
          answer: "It is often smart to add a little extra for compaction, edge fill, and unexpected adjustments on site. A small overage helps avoid a last-minute shortage without overbuying too much.",
        },
      ]}
      note="A French drain layout depends on soil conditions, slope, and water flow. This calculator is a planning tool, not a substitute for proper site grading or drainage design."
    />
  );
}
