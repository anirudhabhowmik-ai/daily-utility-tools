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
        <p>Built for speed and privacy. Most tools process data on your device; check each tool&apos;s note for storage or sharing details.</p>
      </div>
    </footer>
  );
}