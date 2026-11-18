import type { ReactNode } from "react";
import ToolBreadcrumb from "./ToolBreadcrumb";

type ToolLandingPageProps = {
  toolContent: ReactNode;
  title: string;
  summary: string;
  highlights: string[];
  steps: string[];
  faqs: Array<{ question: string; answer: string }>;
  note?: string;
  category?: string;
  parentHref?: string;
  parentLabel?: string;
  showPageHeader?: boolean;
};

export default function ToolLandingPage({
  toolContent,
  title,
  summary,
  highlights,
  steps,
  faqs,
  note,
  category,
  parentHref,
  parentLabel,
  showPageHeader = true,
}: ToolLandingPageProps) {
  return (
    <article className={`animate-fade-in${showPageHeader ? "" : " tool-landing-page-compact"}`}>
      <ToolBreadcrumb title={title} parentHref={parentHref} parentLabel={parentLabel} />
      {showPageHeader ? (
        <header className="tool-page-header">
          <p className="tool-page-category">{category || "Browser-based utility"}</p>
          <h1>{title}</h1>
          <p>{summary}</p>
        </header>
      ) : null}

      {toolContent}

      <div className="article-content">
        <h2>Why this tool is useful</h2>
        <p>{summary}</p>
        <ul>
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>How to use it</h2>
        <ol>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        {note ? (
          <>
            <h2>Helpful notes</h2>
            <p>{note}</p>
          </>
        ) : null}

        <h2>Frequently asked questions</h2>
        <div className="tool-faq-list">
          {faqs.map((faq) => (
            <div className="tool-faq-item" key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
