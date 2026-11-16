import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-links">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <p>© {new Date().getFullYear()} DailyTools. All rights reserved.</p>
        <p>Built for speed and privacy. Your data never leaves your browser.</p>
      </div>
    </footer>
  );
}