import { notFound } from "next/navigation";
import type { Metadata } from "next";
import NewToolPage from "../new-tools/NewToolPage";
import { ADDITIONAL_TOOLS, getToolMetadata, isAdditionalToolKind } from "../new-tools/config";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ADDITIONAL_TOOLS).map((tool) => ({ tool }));
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  if (!isAdditionalToolKind(tool)) return {};
  return getToolMetadata(tool);
}

export default async function AdditionalToolRoute({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  if (!isAdditionalToolKind(tool)) notFound();
  return <NewToolPage kind={tool} />;
}
