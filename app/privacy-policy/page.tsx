import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | DailyTools",
  description: "Learn how DailyTools handles your data, browser processing, and third-party ad services.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <article className="animate-fade-in">
      <header style={{ marginTop: "3rem", marginBottom: "2rem" }}>
        <h1>Privacy Policy</h1>
        <p style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>
          DailyTools is designed around a simple principle: keep data local when possible and avoid collecting unnecessary personal information.
        </p>
      </header>

      <div className="article-content">
        <h2>Information we do not collect</h2>
        <p>
          Most tools on DailyTools run directly in your browser. In many cases, the data you enter is processed locally on your device and is not transmitted to our servers.
        </p>
        <p>
          We do not require you to create an account, provide your email address, or submit personal profile information in order to use the calculator or utility tools on this site.
        </p>

        <h2>Files and text entered into tools</h2>
        <p>
          If you upload an image, enter a password, or type information into a tool, that content is generally processed on your device. It is not stored in a database by DailyTools unless you explicitly save or download the result.
        </p>

        <h2>Cookies and analytics</h2>
        <p>
          This site may use basic browser storage for preferences or settings only when needed for the tool experience. Any third-party advertising providers, including Google AdSense, may use cookies or similar technologies to personalize or measure ads in accordance with their own privacy policies.
        </p>

        <h2>Third-party services</h2>
        <p>
          We may use external services for hosting, analytics, and advertising. These providers may collect usage information according to their own policies, and we recommend reviewing those policies if you have questions about ad personalization or analytics.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our tools or legal requirements. The most recent version will appear on this page.
        </p>
      </div>
    </article>
  );
}
