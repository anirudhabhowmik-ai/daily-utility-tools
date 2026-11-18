import { notFound } from "next/navigation";
import ToolLandingPage from "../tools/ToolLandingPage";
import { PDF_EDITORIAL_CONTENT } from "./content";
import { getPdfTool } from "./catalog";
import PdfToolWorkspace from "./PdfToolWorkspace";

export default function PdfToolLandingPage({ slug }: { slug: string }) {
  const tool = getPdfTool(slug);
  const content = PDF_EDITORIAL_CONTENT[slug];
  if (!tool || !content) notFound();

  return (
    <ToolLandingPage
      title={tool.title}
      summary={content.summary}
      toolContent={<PdfToolWorkspace tool={tool} />}
      highlights={content.highlights}
      steps={content.steps}
      note={content.note}
      faqs={content.faqs}
      category="PDF utilities"
      parentHref="/pdf"
      parentLabel="All PDF tools"
      showPageHeader={false}
    />
  );
}
