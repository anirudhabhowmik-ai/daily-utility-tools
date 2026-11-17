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
          If you select a file or enter information into a tool, it is generally processed in your browser and is not sent to a DailyTools processing server. Some tools save a working copy in your browser&apos;s local storage, such as a subscription list or seating plan. The trip expense tool can encode trip details in a shareable link; anyone who receives that link can read the encoded information. Tool pages describe these behaviors before use.
        </p>

        <h2>Browser storage, cookies, and analytics</h2>
        <p>
          Some tools use browser local storage to keep drafts on the same device; this data is not synced to an account. Browser settings can be used to clear it. This site may also use cookies or similar technologies for analytics or advertising. Third-party advertising providers, including Google AdSense if enabled, may use cookies or similar technologies to personalize or measure ads under their own privacy policies.
        </p>

        <h2>Third-party services</h2>
        <p>
          We may use external services for hosting, page resources such as web fonts, analytics, and advertising. Those providers may receive technical information such as a browser&apos;s network request and may collect usage information under their own policies. Review their privacy information if you have questions about ad personalization or analytics.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our tools or legal requirements. The most recent version will appear on this page.
        </p>
      </div>
    </article>
  );
}
