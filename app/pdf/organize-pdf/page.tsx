import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("organize-pdf");

export default function OrganizePdfPage() {
  return <PdfToolLandingPage slug="organize-pdf" />;
}
