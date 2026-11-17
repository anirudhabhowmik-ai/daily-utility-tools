import Link from "next/link";

export default function ToolBreadcrumb({ title }: { title: string }) {
  return (
    <nav className="tool-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      <span aria-hidden="true">/</span>
      <Link href="/#tools">All tools</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{title}</span>
    </nav>
  );
}
