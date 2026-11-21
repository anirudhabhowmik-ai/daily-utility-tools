
import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import CalligraphySheetGenerator from "./CalligraphySheetGenerator";

export const metadata: Metadata = {
  title: "Free Calligraphy Practice Sheet Generator | Printable Writing Guides",
  description:
    "Create free printable calligraphy practice sheets with adjustable writing bands, slant guides, A4 and US Letter paper sizes, custom colors and downloadable SVG files.",
  alternates: {
    canonical: "/tools/calligraphy-practice-sheet-generator",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<CalligraphySheetGenerator />}
      title="Free Calligraphy Practice Sheet Generator"

      summary="Create your own printable calligraphy practice sheets without drawing writing guides by hand. Adjust the writing area, slant angle, line spacing, paper size and guide colors to make a practice sheet that suits your lettering style. Preview your design, download it as an SVG file or print it for your next writing session."

      highlights={[
        "Create custom calligraphy practice sheets with adjustable writing bands and middle reference lines.",
        "Choose A4 or US Letter paper in portrait or landscape orientation.",
        "Set the slant angle and horizontal spacing between diagonal lettering guides.",
        "Show or hide the top line, middle line, baseline and slant guides independently.",
        "Choose from blue, gray, purple and green guide themes or customize individual guide colors.",
        "Adjust page margins and guide thickness to suit your preferred writing space.",
        "Preview your practice sheet while changing settings, without repeatedly downloading files.",
        "Download a scalable SVG file that you can keep, reopen and print."
      ]}

      steps={[
        "Open the generator and choose your paper size. Select A4 for standard A4 paper or US Letter if that is the paper used by your printer.",
        "Choose portrait or landscape orientation. Portrait gives you a taller writing area, while landscape provides a wider space for lettering exercises.",
        "Set the page margin to decide how much space should remain around the writing guides. A larger margin leaves more room around the edges of the sheet.",
        "Choose the writing band height. This controls the vertical space between the top writing line and the baseline. The generator also adds a descender gap below each row.",
        "Set your preferred slant angle. This changes the direction of the diagonal guides and helps you practise keeping letters at a consistent angle.",
        "Adjust the horizontal spacing between slant guides. Smaller spacing creates more diagonal guides across the page, while larger spacing creates fewer.",
        "Turn the top lines, middle lines, baseline guides or slant guides on or off depending on the type of lettering exercise you want to practise.",
        "Open the Appearance tab to choose a guide color theme, change the middle-line style, adjust line thickness or select custom colors.",
        "Check the live preview to see how the finished sheet will look. Open the sheet information section if you want to review the writing row count and other measurements.",
        "When you are happy with the layout, download the SVG file or use the print option to make a physical practice sheet."
      ]}

      faqs={[
        {
          question: "What is a calligraphy practice sheet?",
          answer:
            "A calligraphy practice sheet is a page with guide lines that help you practise letter height, spacing, alignment and writing angle. The guides provide visual references while you form letters and words. Instead of drawing these lines manually, this generator creates a printable sheet using the measurements you choose."
        },
        {
          question: "Is this calligraphy practice sheet generator free?",
          answer:
            "Yes. You can use the generator to customize your practice sheet, preview the layout and download the resulting SVG file without creating an account. You can also use the print option to produce a paper copy."
        },
        {
          question: "Can I create A4 calligraphy practice sheets?",
          answer:
            "Yes. Select A4 in the paper size setting. The generator uses the standard A4 dimensions of 210 × 297 mm in portrait orientation. You can also switch to landscape orientation if you prefer a wider page."
        },
        {
          question: "Can I make a US Letter practice sheet?",
          answer:
            "Yes. Choose US Letter from the paper size menu. The generator uses a page size of 215.9 × 279.4 mm in portrait orientation. This is useful if your printer or stationery is set up for standard US Letter paper."
        },
        {
          question: "What is the difference between writing band height and row pitch?",
          answer:
            "Writing band height is the vertical distance from the top writing line to the baseline of a row. Row pitch is the distance from the top line of one row to the top line of the next row. This generator adds a descender gap equal to 60% of the writing band height, so the row pitch is larger than the band height."
        },
        {
          question: "What is the descender gap used for?",
          answer:
            "Some lowercase letters extend below the baseline. These are called descenders. Examples include g, j, p, q and y. The extra gap below each writing band leaves room for these letter shapes and helps prevent them from overlapping the next row. The current generator uses a fixed gap equal to 60% of the writing band height."
        },
        {
          question: "What does the slant angle setting do?",
          answer:
            "The slant angle controls the angle of the diagonal reference lines. These lines help you practise keeping your letters consistently tilted. For example, a 55-degree setting creates diagonal guides at 55 degrees relative to the horizontal direction. You can choose an angle between 35 and 80 degrees."
        },
        {
          question: "What does slant guide spacing mean?",
          answer:
            "Slant guide spacing controls the horizontal distance between neighbouring diagonal guides. A smaller value places more guides across the writing area. A larger value creates a more open layout with fewer guides. The measurement is the horizontal spacing between the lines, not the shortest perpendicular distance between them."
        },
        {
          question: "What are the top line, middle line and baseline?",
          answer:
            "The top line marks the upper boundary of the main writing area. The middle line provides a reference for letter height, particularly for lowercase letters. The baseline marks where the main body of a letter sits. Together, these lines provide a simple structure for practising consistent letter proportions."
        },
        {
          question: "Can I use this generator for modern calligraphy and brush lettering?",
          answer:
            "Yes. The adjustable writing guides can be useful for modern calligraphy, brush lettering, pointed-pen practice and general hand lettering. You can experiment with different band heights and slant angles to create a layout that suits your preferred style. The guides are practice references rather than strict rules for any particular lettering method."
        },
        {
          question: "Can beginners use these printable calligraphy sheets?",
          answer:
            "Yes. Beginners can start with a larger writing band, visible middle lines and slant guides. This gives them more room to practise basic strokes and letter shapes. As their control improves, they can reduce the writing band height or change the guide settings to make their exercises more challenging."
        },
        {
          question: "Can I change the color of the writing guides?",
          answer:
            "Yes. You can choose from the built-in blue, gray, purple and green themes. If you want a different appearance, select custom colors and adjust the baseline, middle line, top line and slant guide colors individually."
        },
        {
          question: "Can I hide some of the writing guides?",
          answer:
            "Yes. The writing guide settings include separate switches for the slant guides, top lines, middle lines and baselines. For example, you can hide the diagonal guides if you only want horizontal writing references. You can also create a simpler sheet by hiding the middle lines."
        },
        {
          question: "What file format does the generator download?",
          answer:
            "The download option creates an SVG file. SVG is a vector image format, which means its lines and shapes can be scaled without becoming pixelated. You can keep the file as a reusable template or open it in compatible vector graphics and document applications."
        },
        {
          question: "How do I print the practice sheet at the correct size?",
          answer:
            "Use the print option and check that the selected paper size matches the sheet you created. Choose Actual Size or 100% scaling where available, set the correct paper orientation and turn off browser headers and footers. Avoid Fit to Page if you need the measurements to remain exact. Your printer's printable area and driver settings can still affect the final output."
        },
        {
          question: "Why does my printed sheet look different from the preview?",
          answer:
            "The on-screen preview is a scaled representation of the page, while the printed result depends on your printer settings. Check the selected paper size, orientation, scaling percentage and printer margins. Some printers cannot print close to the paper edges, so the physical output may have slightly different margins."
        },
        {
          question: "Does the generator save my practice sheets automatically?",
          answer:
            "The generator creates the sheet from your current settings in the browser. It does not provide an online account or cloud storage for saved designs. Download the SVG file if you want to keep a particular layout and use it again later."
        },
        {
          question: "Do I need a special pen to use the practice sheets?",
          answer:
            "No. You can practise with a regular pencil, fineliner, brush pen or calligraphy pen. The best choice depends on the lettering style you want to learn. A pencil or simple pen is a good starting point for practising basic shapes and consistent letter spacing."
        }
      ]}

      note="Good lettering develops through regular practice rather than complicated equipment. Start with comfortable writing band heights, use the middle and baseline guides to understand letter proportions, and practise keeping your strokes consistent. Once the basic movements feel comfortable, experiment with different slant angles and smaller writing spaces. You can create a fresh sheet whenever you want to change your practice routine."
    />
  );
}
