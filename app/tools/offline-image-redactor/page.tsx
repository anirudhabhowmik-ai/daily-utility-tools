import type { Metadata } from "next";
import ToolLandingPage from "../ToolLandingPage";
import OfflineRedactorTool from "./OfflineRedactorTool";

export const metadata: Metadata = {
  title: "Offline Image Redactor | ToolsAB",
  description: "Blur or redact sensitive details in images in your browser without uploading them to a server.",
  alternates: { canonical: "/tools/offline-image-redactor" },
};

export default function Page() {
  return (
    <ToolLandingPage
      toolContent={<OfflineRedactorTool />}
      title="Offline Image Redactor"
      summary="Blur or mask sensitive details in screenshots, photos, and documents without uploading them to a server."
      highlights={[
        "Keep private information on your device instead of sending it to a third-party service.",
        "Useful for covering faces, signatures, addresses, license plates, and account details.",
        "Quick, browser-based workflow for screenshots, scanned forms, and social posts.",
      ]}
      steps={[
        "Open the image you want to protect in the browser tool.",
        "Draw or brush over the sensitive area you want to hide.",
        "Review the result to make sure the content is fully covered.",
        "Download the edited file as a final PNG or JPG export.",
      ]}
      faqs={[
        {
          question: "Does this tool upload my image?",
          answer: "No. The redaction workflow is designed to run locally in the browser, which helps keep personal or sensitive content off remote servers.",
        },
        {
          question: "What kinds of details can I hide?",
          answer: "This is helpful for faces, text, signatures, license plates, addresses, or other personal information that you do not want visible in a shared screenshot or document.",
        },
        {
          question: "What file types are supported?",
          answer: "Most browser-based editors support common image formats such as PNG, JPG, and WebP. The exact options depend on your browser and the final exporting step.",
        },
      ]}
      note="For best results, review the final export at full size before sharing it. Redaction is most effective when the sensitive area is fully covered and no readable detail remains."
    />
  );
}
