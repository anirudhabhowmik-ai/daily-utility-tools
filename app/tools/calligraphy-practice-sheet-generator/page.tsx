import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import CalligraphySheetGenerator from "./CalligraphySheetGenerator";

export const metadata: Metadata = {
  title: "Calligraphy Practice Sheet Generator | DailyTools",
  description: "Generate printable calligraphy practice sheets with spacing guides, slant lines, and simple layouts for practice.",
  alternates: { canonical: "/tools/calligraphy-practice-sheet-generator" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<CalligraphySheetGenerator />}
      title="Calligraphy Practice Sheet Generator"
      summary="Create printable practice sheets with guides, letter spacing, and consistent layout for modern calligraphy and hand lettering practice."
      highlights={[
        "Useful for workshops, beginner practice, and consistent daily writing drills.",
        "Quickly generate lined or slanted workspace sheets without manual drawing.",
        "Great for brush lettering, pointed pen work, and basic hand-lettering warmups.",
      ]}
      steps={[
        "Choose the sheet style and spacing you want to practice.",
        "Set the line height, slant angle, and page layout to match your preferred script.",
        "Generate the sheet and print it or save it for later practice.",
        "Use the grid as a consistent baseline for daily letter drills and rhythm practice.",
      ]}
      faqs={[
        {
          question: "Who is this for?",
          answer: "This is helpful for beginners, classroom practice, and hobbyists who want a clean guide for brush lettering or modern calligraphy.",
        },
        {
          question: "Can I print the sheets?",
          answer: "Yes. The layouts are designed to be easy to print and reuse for handwriting practice, warm-ups, and letter formation exercises.",
        },
        {
          question: "Do I need special tools to use them?",
          answer: "No. A simple pen, brush pen, or pointed-pen nib works well. The guide lines simply help keep your letterforms consistent and balanced.",
        },
      ]}
      note="Practice is more effective when you keep sessions short and repeatable. Simple drills with clear spacing guides help build rhythm, confidence, and consistency over time."
    />
  );
}
