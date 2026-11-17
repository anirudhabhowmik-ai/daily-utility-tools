import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import BoardFeetCalculator from "./BoardFeetCalculator";

export const metadata: Metadata = {
  title: "Board Feet Calculator | DailyTools",
  description: "Estimate board feet for lumber projects and woodworking jobs using size, quantity, and thickness inputs.",
  alternates: { canonical: "/tools/board-feet-calculator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<BoardFeetCalculator />}
      title="Board Feet Calculator"
      summary="Estimate the wood volume in board feet for framing, trim, cabinetry, and woodworking projects before you buy lumber."
      highlights={[
        "Useful for comparing lumber volume across different board sizes and quantities.",
        "Helpful for budgeting material for furniture, trim, and custom woodworking projects.",
        "Quickly convert raw measurements into a standard board-foot estimate.",
      ]}
      steps={[
        "Measure the board thickness, width, and length in inches.",
        "Enter the quantity of boards or pieces you plan to buy.",
        "Review the board-foot total and compare it with your lumber budget.",
        "Use the estimate as a planning baseline before ordering material.",
      ]}
      faqs={[
        {
          question: "What is a board foot?",
          answer: "A board foot is a standard volume measurement for lumber. It is based on thickness, width, and length so different board sizes can be compared in a consistent way.",
        },
        {
          question: "Does this replace the actual lumber order?",
          answer: "No. It is a planning estimate. Actual stock availability, defects, and project waste can change the final quantity you need.",
        },
        {
          question: "Should I add extra for waste?",
          answer: "For many woodworking jobs, it is wise to buy a little extra material for cuts, defects, and mistakes. A small overage is often worth it on custom furniture or trim work.",
        },
      ]}
      note="Board feet measure volume, not finished surface area. Always confirm the actual nominal size of the lumber you plan to buy, because stock dimensions can vary from the worked size."
    />
  );
}
