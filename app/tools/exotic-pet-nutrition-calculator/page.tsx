import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";

export const metadata: Metadata = {
  title: "Exotic Pet Feeding Tracker | DailyTools",
  description: "Compare daily pet feeding amounts with a target provided by your veterinarian. This browser tool does not prescribe nutrition.",
  alternates: { canonical: "/tools/exotic-pet-nutrition-calculator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      tool="exotic-pet-nutrition-calculator"
      title="Exotic Pet Feeding Tracker"
      summary="Track how much food your pet has eaten against a daily target provided by your veterinarian. This tool records your inputs; it does not calculate nutritional needs."
      highlights={[
        "Log individual meals and compare the running total with a vet-provided daily target.",
        "Label each entry with a food item or note to make the day's record easier to review.",
        "Export the log as a CSV for your records or a follow-up conversation with your veterinarian.",
      ]}
      steps={[
        "Enter the daily amount recommended by your veterinarian.",
        "Optionally add a food label, enter the amount for one meal, and log it.",
        "Repeat for each meal; review the running total and progress toward the entered target.",
        "Remove an entry if needed, or export the day's list as a CSV file.",
      ]}
      faqs={[
        {
          question: "Does this calculator recommend how much to feed?",
          answer: "No. It only compares your entries with a target you supply. Exotic pet nutrition varies by species and individual health, so feeding targets should come from a veterinarian familiar with the animal.",
        },
        {
          question: "Does it save my feeding record?",
          answer: "No. Entries remain in the current page session and clear when you leave or refresh. You can export the current list as a CSV file before leaving.",
        },
        {
          question: "What if my pet refuses food or has a health change?",
          answer: "Contact a licensed veterinarian or qualified exotic-animal specialist. Do not rely on a calculator to assess illness or make a major diet change.",
        },
      ]}
      note="This page is a tracking aid, not veterinary advice. Use only a feeding target recommended by a qualified professional who knows your pet's species and health history."
    />
  );
}
