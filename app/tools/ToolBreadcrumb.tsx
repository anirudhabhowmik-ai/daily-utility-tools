import Link from "next/link";

export default function ToolBreadcrumb({
  title,
  parentHref = "/#tools",
  parentLabel = "All tools",
}: {
  title: string;
  parentHref?: string;
  parentLabel?: string;
}) {
  return (
    <nav className="tool-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      <span aria-hidden="true">/</span>
      <Link href={parentHref}>{parentLabel}</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{title}</span>
    </nav>
  );
}
