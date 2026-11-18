import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import CoatingCalculator from "./CoatingCalculator";

export const metadata: Metadata = {
  title: "Epoxy Floor Coating Calculator | ToolsAB",
  description: "Estimate floor coating coverage, resin quantity, and decorative additives for garage and workshop floors.",
  alternates: { canonical: "/tools/epoxy-floor-coating-calculator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<CoatingCalculator />}
      title="Epoxy Floor Coating Calculator"
      summary="Estimate the amount of epoxy resin, hardener, and additives needed to coat a garage, basement, or workshop floor."
      highlights={[
        "Calculate material needs based on floor area, thickness, and coating count.",
        "Helpful for planning a single-coat utility floor or a premium decorative finish.",
        "Makes it easier to compare coverage needs before ordering product.",
      ]}
      steps={[
        "Measure the room or slab area in square feet or square meters.",
        "Enter the coating thickness or estimated mils per layer.",
        "Add the number of coats or layers you plan to apply.",
        "Review the total resin and additive estimate before purchase.",
      ]}
      faqs={[
        {
          question: "Does this include primer or decorative flakes?",
          answer: "Some projects require primer, broadcast flakes, and a topcoat in addition to the base resin. This calculator works best as a starting estimate for the main coating materials.",
        },
        {
          question: "How accurate is the estimate?",
          answer: "It is a planning tool. Surface texture, porosity, and substrate condition can change the final usage rate, so a small overage is often recommended.",
        },
        {
          question: "Should I order extra product?",
          answer: "Many installers order extra material to cover edge loss, touch-ups, and small mistakes. The exact overage depends on floor condition and application method.",
        },
      ]}
      note="Surface preparation matters as much as material quantity. A clean, dry, and properly profiled floor will give a more accurate result and a more durable final finish."
    />
  );
}
