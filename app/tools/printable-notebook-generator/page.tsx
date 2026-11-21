
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import PrintableNotebookGenerator from "./PrintableNotebookGenerator";

export const metadata: Metadata = {
  title: "Printable Notebook Generator - Create Custom Notebook Pages | ToolsAB",
  description:
    "Create and print custom notebook pages with ruled, grid, dot grid, Cornell notes, and planner templates. Customize paper size, spacing, margins, and page count.",
  alternates: {
    canonical: "/tools/printable-notebook-generator",
  },
};

export default function PrintableNotebookGeneratorPage() {
  return (
    <ToolLandingPage
      toolContent={<PrintableNotebookGenerator />}
      title="Printable Notebook Generator"
      summary="Create your own printable notebook pages in a few steps. Choose from lined paper, college-ruled pages, dot grids, square grids, Cornell notes, daily planners, weekly planners, and more. Customize the paper size, orientation, margins, spacing, and number of pages, then print your notebook or save it as a PDF."
      highlights={[
        "11 notebook and planner page templates",
        "A4, A5, US Letter, and US Legal paper sizes",
        "Portrait and landscape page layouts",
        "Adjustable margins, line spacing, and grid spacing",
        "Custom notebook title, subtitle, and cover page",
        "Print multiple pages or save them as a PDF",
        "Save and reuse your notebook settings",
      ]}
      steps={[
        "Choose the type of page you want, such as ruled paper, dot grid, Cornell notes, or a planner.",
        "Select your paper size and choose portrait or landscape orientation.",
        "Adjust the margins, line spacing, grid size, and line color to suit your needs.",
        "Enter a notebook title, choose the number of pages, and optionally add a cover page.",
        "Check the live preview to see how your notebook pages will look.",
        "Click Print notebook / Save PDF. Select your printer or choose Save as PDF in the browser print dialog.",
      ]}
      faqs={[
        {
          question: "Can I create a notebook with multiple pages?",
          answer:
            "Yes. Choose the number of content pages you need, from 1 to 100. You can also include a separate cover page.",
        },
        {
          question: "Which paper sizes are supported?",
          answer:
            "The generator supports A4, A5, US Letter, and US Legal paper sizes. You can also choose portrait or landscape orientation.",
        },
        {
          question: "Can I create Cornell notes pages?",
          answer:
            "Yes. Select the Cornell Notes template to get a cue and question column, a larger notes area, and a summary section.",
        },
        {
          question: "Can I save my notebook as a PDF?",
          answer:
            "Yes. Click Print notebook / Save PDF and select Save as PDF in your browser's print dialog. You can also send the pages directly to a printer.",
        },
        {
          question: "Can I change the line spacing and color?",
          answer:
            "Yes. For ruled pages, you can adjust the line spacing and line color. Dot grid and square grid templates also have an adjustable grid size.",
        },
        {
          question: "Are my notebook settings uploaded?",
          answer:
            "No. The tool works in your browser and saves your settings in local browser storage. It does not upload your notebook settings to a server.",
        },
        {
          question: "Why does my printed page look different from the preview?",
          answer:
            "The preview is an on-screen representation. For accurate printing, choose the same paper size and orientation in your browser's print dialog. Disable browser headers and footers if they appear on the printed pages.",
        },
      ]}
      note="Printing results depend on your printer settings. For the intended paper dimensions, select the matching paper size in the print dialog and use 100% or actual-size scaling where available."
    />
  );
}
