import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("page-number");

export default function PageNumberPage() {
  return <PdfToolLandingPage slug="page-number" />;
}
