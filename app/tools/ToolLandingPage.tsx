import type { ReactNode } from "react";

type ToolLandingPageProps = {
  toolContent: ReactNode;
  title: string;
  summary: string;
  highlights: string[];
  steps: string[];
  faqs: Array<{ question: string; answer: string }>;
  note?: string;
};

export default function ToolLandingPage({
  toolContent,
  title,
  summary,
  highlights,
  steps,
  faqs,
  note,
}: ToolLandingPageProps) {
  return (
    <article className="animate-fade-in">
      <header style={{ marginTop: "3rem", marginBottom: "2rem" }}>
        <h1>{title}</h1>
        <p style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>{summary}</p>
      </header>

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
        {faqs.map((faq) => (
          <div key={faq.question}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
