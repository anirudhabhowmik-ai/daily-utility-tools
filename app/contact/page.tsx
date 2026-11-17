import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact DailyTools | Questions and Feedback",
  description: "Contact DailyTools with feedback, questions, or support requests about our browser-based utility tools.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <article className="animate-fade-in">
      <header className="tool-page-header">
        <p className="tool-page-category">Get in touch</p>
        <h1>Contact DailyTools</h1>
        <p>
          We welcome feedback, suggestions, and questions about the tools and content on DailyTools.
        </p>
      </header>

      <div className="article-content">
        <h2>Questions or feedback</h2>
        <p>
          If you have a question about a calculator, a request for a new utility, or feedback on how a page could be clearer, send a message using the email below.
        </p>

        <p>
          <strong>Email:</strong>{" "}
          <a href="mailto:hello@dailytools.app">hello@dailytools.app</a>
        </p>

        <p>
          Please include a brief description of the tool, the issue you encountered, or the improvement you would like to see. This helps us respond more quickly and make future updates more useful.
        </p>

        <h2>Best use of contact requests</h2>
        <ul>
          <li>Bug reports for a tool or page</li>
          <li>Ideas for new calculators or helpers</li>
          <li>Clarification about privacy or browser-side processing</li>
          <li>Suggestions to improve readability or usability</li>
        </ul>
      </div>
    </article>
  );
}
