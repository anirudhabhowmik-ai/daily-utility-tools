import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <div className="footer-main">
          <div className="footer-brand-block">
            <Link href="/" className="footer-brand">Tools<span>AB</span></Link>
            <p>Little utilities for a more focused day.</p>
          </div>
          <div className="footer-links">
            <Link href="/#tools">Explore tools</Link>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} ToolsAB. All rights reserved.</p>
          <p>Built for speed, clarity, and privacy. Each tool explains how it handles your data.</p>
        </div>
      </div>
    </footer>
  );
}