
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ToolsAB",
  description:
    "Read the ToolsAB Privacy Policy to understand how browser-based tools, files, cookies, analytics, and advertising services handle information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <article className="animate-fade-in">
      <header className="tool-page-header">
        <p className="tool-page-category">Your information</p>
        <h1>Privacy Policy</h1>
        <p>
          At ToolsAB, we aim to keep your information private and make our
          browser-based tools easy to use. This policy explains what
          information may be processed when you visit our website and use
          our tools.
        </p>
      </header>

      <div className="article-content">
        <h2>Information We Collect</h2>
        <p>
          You can use most ToolsAB utilities without creating an account or
          providing personal profile information. We do not require you to
          register or submit your email address to use our general tools.
        </p>
        <p>
          When you visit our website, certain technical information may be
          processed by our hosting provider and other service providers.
          This may include your IP address, browser type, device information,
          pages visited, and basic usage information, depending on the
          services enabled on the website.
        </p>

        <h2>How Our Tools Process Your Information</h2>
        <p>
          Most tools on ToolsAB run directly in your browser. Information
          you enter into these tools is generally processed on your device
          rather than uploaded to our servers.
        </p>
        <p>
          Some tools may store information in your browser's local storage
          so that your work remains available when you return to the same
          browser. This information is stored on your device and is not
          automatically synchronized across devices or accounts. You can
          clear locally stored information through your browser settings.
        </p>
        <p>
          Certain tools have different processing requirements. For example,
          PDF tools may send selected files and processing options to the
          PDF processing service configured for this website. Please review
          the information shown on the relevant tool before uploading files.
          Do not upload sensitive or confidential documents unless you are
          comfortable with the service's handling of those files.
        </p>
        <p>
          Some tools may create shareable links containing information
          entered into the tool. Anyone who receives such a link may be able
          to view the information encoded in it. Please avoid including
          confidential information in shareable links.
        </p>

        <h2>Cookies and Similar Technologies</h2>
        <p>
          ToolsAB and its service providers may use cookies, local storage,
          and similar technologies for website functionality, remembering
          preferences, understanding website usage, security, and
          advertising where applicable.
        </p>
        <p>
          Cookies are small files stored in your browser. You can manage or
          delete cookies through your browser settings. Blocking certain
          cookies may affect some website features.
        </p>

        <h2>Advertising and Google AdSense</h2>
        <p>
          ToolsAB may display advertisements provided by Google AdSense
          and other advertising partners. When advertising services are
          enabled, Google and third-party vendors may use cookies to serve
          advertisements based on a user's previous visits to this website
          or other websites.
        </p>
        <p>
          Google's use of advertising cookies enables Google and its
          partners to display advertisements based on users' visits to
          this website and other websites on the internet. Advertising
          providers may use cookies, web beacons, IP addresses, or other
          identifiers to collect information related to ad delivery,
          measurement, and personalization.
        </p>
        <p>
          Users can manage or opt out of personalized advertising through
          Google's Ads Settings:
          {" "}
          <a
            href="https://adssettings.google.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Ads Settings
          </a>.
        </p>
        <p>
          You can also learn more about how Google uses information when
          you visit websites or apps that use its services:
          {" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
          >
            How Google uses data when you use our partners' sites or apps
          </a>.
        </p>
        <p>
          You can learn about additional choices for certain third-party
          advertising cookies at:
          {" "}
          <a
            href="https://www.aboutads.info/choices/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Digital Advertising Alliance
          </a>.
        </p>

        <h2>Analytics and Third-Party Services</h2>
        <p>
          We may use third-party services for website hosting, analytics,
          advertising, file processing, security, and website resources.
          These providers may process technical information or other data
          needed to provide their services.
        </p>
        <p>
          Third-party services operate under their own privacy policies
          and terms. Where applicable, we encourage users to review those
          policies to understand how their information is handled.
        </p>

        <h2>International Visitors and Privacy Choices</h2>
        <p>
          ToolsAB may be accessed by visitors from different countries.
          Privacy and data protection requirements can vary depending on
          where you live. Where applicable, we will provide the required
          privacy notices and choices regarding cookies, advertising, and
          personal information.
        </p>
        <p>
          For visitors in the European Economic Area, the United Kingdom,
          and Switzerland, applicable consent requirements may apply to
          advertising cookies and personalized advertising. We use
          appropriate consent mechanisms where required.
        </p>

        <h2>Children's Privacy</h2>
        <p>
          ToolsAB is a general-purpose website and is not designed to
          knowingly collect personal information from children. If you
          believe a child has provided personal information through our
          website, please contact us so that we can review the matter.
        </p>

        <h2>Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy when our tools, services,
          advertising arrangements, or legal requirements change. Any
          updated version will be published on this page.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or how ToolsAB
          handles information, please visit our{" "}
          <a href="/contact">Contact Us</a> page.
        </p>
      </div>
    </article>
  );
}
