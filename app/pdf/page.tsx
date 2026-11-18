import type { Metadata } from "next";
import Link from "next/link";
import { PDF_TOOLS } from "./catalog";

export const metadata: Metadata = {
  title: "All PDF Tools | ToolsAB",
  description: "Merge, convert, protect, compress, and organize PDF files with ToolsAB.",
  alternates: { canonical: "/pdf" },
};

export default function PdfToolsPage() {
  return (
    <div className="animate-fade-in">
      <nav className="tool-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / PDF Tools
      </nav>
      <header className="tool-page-header">
        <p className="tool-page-category">PDF TOOLBOX</p>
        <h1>All PDF tools</h1>
        <p>Choose a focused tool to convert, organize, and protect your documents.</p>
      </header>
      <section className="tools-grid pdf-tools-grid" aria-label="PDF tools">
        {PDF_TOOLS.map((tool) => (
          <Link href={`/pdf/${tool.slug}`} key={tool.slug} className="tool-card">
            <div className="tool-card-top">
              <span className="tool-category">PDF TOOL</span>
              <span className="tool-arrow" aria-hidden="true">↗</span>
            </div>
            <h2>{tool.title}</h2>
            <p>{tool.description}</p>
          </Link>
        ))}
      </section>
      <p className="pdf-privacy-note">
        Files used by conversion tools are sent to the configured PDF processing service.
        Avoid uploading documents containing information you do not want processed there.
      </p>
    </div>
  );
}
