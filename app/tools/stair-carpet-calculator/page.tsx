import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import StairCarpetCalculator from "./StairCarpetCalculator";

export const metadata: Metadata = {
  title: "Stair Carpet Calculator | ToolsAB",
  description: "Estimate carpet and padding needs for a staircase with a simple measurement-based calculation.",
  alternates: { canonical: "/tools/stair-carpet-calculator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<StairCarpetCalculator />}
      title="Stair Carpet Calculator"
      summary="Estimate the amount of carpet and padding required for a staircase using tread width, riser count, and carpet depth."
      highlights={[
        "Useful for planning stair runners, full stair carpeting, or a replacement job.",
        "Helps estimate material before shopping or ordering a custom runner.",
        "Works best for straightforward staircase measurements and standard carpet widths.",
      ]}
      steps={[
        "Measure the total number of steps and the width of each tread.",
        "Enter the stair run, carpet width, and additional allowance for fitting.",
        "Review the estimated carpet and padding lengths before you buy materials.",
        "Adjust for waste and stair nosing if your installer recommends a larger allowance.",
      ]}
      faqs={[
        {
          question: "Does this include waste or cutting allowance?",
          answer: "This estimate is typically a starting point. Many carpet jobs require extra material for pattern matching, trimming, and installation waste, especially on a staircase.",
        },
        {
          question: "What if my stairs are uneven or curved?",
          answer: "Straight stairs are the easiest case. Curved or winder stairs often need a custom measurement and may require a fabric or carpet specialist to estimate material more accurately.",
        },
        {
          question: "Should I buy padding too?",
          answer: "Padding is often required for comfort and noise reduction. Add it to your project budget separately if your installer or product requirements call for it.",
        },
      ]}
      note="Stair measurements vary with nosing, landing transitions, and runner width. Use the estimate as a planning guide and confirm final measurements on site before cutting material."
    />
  );
}
