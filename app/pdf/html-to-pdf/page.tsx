import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("html-to-pdf");

export default function HtmlToPdfPage() {
  return <PdfToolLandingPage slug="html-to-pdf" />;
}
