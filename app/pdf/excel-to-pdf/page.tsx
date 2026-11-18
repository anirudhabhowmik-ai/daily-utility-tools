import PdfToolLandingPage from "../PdfToolLandingPage";
import { getPdfPageMetadata } from "../content";

export const metadata = getPdfPageMetadata("excel-to-pdf");

export default function ExcelToPdfPage() {
  return <PdfToolLandingPage slug="excel-to-pdf" />;
}
