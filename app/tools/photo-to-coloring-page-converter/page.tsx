import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import ColoringPageConverter from "./ColoringPageConverter";

export const metadata: Metadata = {
  title: "Photo to Coloring Page Converter | DailyTools",
  description: "Turn a photo into a simple black-and-white coloring page for kids, classrooms, or creative practice.",
  alternates: { canonical: "/tools/photo-to-coloring-page-converter" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<ColoringPageConverter />}
      title="Photo to Coloring Page Converter"
      summary="Turn a reference image into a simplified black-and-white illustration that can be printed for coloring and creative practice."
      highlights={[
        "Simplify photos or illustrations into bold, printable outlines.",
        "Useful for classroom art, children's activities, and personal relaxation projects.",
        "Keeps the process in-browser so the image stays on the device during conversion.",
      ]}
      steps={[
        "Upload the image or photo you want to turn into a coloring page.",
        "Adjust the contrast, outline intensity, and grayscale settings if needed.",
        "Preview the simplified version and make any final adjustments.",
        "Download or print the final black-and-white page.",
      ]}
      faqs={[
        {
          question: "Will every photo make a good coloring page?",
          answer: "Photos with clear subject shapes and strong contrast tend to work best. Detailed or highly textured images may need extra simplification to create cleaner outlines.",
        },
        {
          question: "Is this only for kids?",
          answer: "No. It is also useful for classroom projects, sketchbook practice, party activities, and relaxing creative exercises for adults.",
        },
        {
          question: "Does the image leave the browser?",
          answer: "The conversion happens locally in the browser. Your uploaded image is not sent to a remote processing service unless you choose to save or share the result afterward.",
        },
      ]}
      note="More detailed images can create busy line work. For cleaner results, start with a simple photo or reduce visual detail before converting it to a coloring page."
    />
  );
}
