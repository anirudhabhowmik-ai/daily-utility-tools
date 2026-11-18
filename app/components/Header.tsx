// app/components/Header.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Listen for scroll to apply the solid background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`site-header ${isScrolled ? "scrolled" : ""}`}>
      <div className="container nav">
        <Link href="/" className="brand" onClick={() => setIsOpen(false)}>
          <img src="/logo.png" alt="ToolsAB Logo" className="logo" style={{ width: "90px", position: "relative", top: "5px"}}/>
        </Link>

        {/* Desktop Nav */}
        <nav className="nav-links desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/pdf">All PDF Tools</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        {/* Mobile Menu Button (Now Animated) */}
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`menu-icon ${isOpen ? "open" : ""}`}
          >
            <line x1="3" y1="6" x2="21" y2="6" className="line line-top" />
            <line x1="3" y1="12" x2="21" y2="12" className="line line-middle" />
            <line x1="3" y1="18" x2="21" y2="18" className="line line-bottom" />
          </svg>
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <nav id="mobile-navigation" className="mobile-menu animate-fade-in" aria-label="Mobile navigation">
          <Link href="/" onClick={() => setIsOpen(false)}>Home</Link>
          <Link href="/pdf" onClick={() => setIsOpen(false)}>All PDF Tools</Link>
          <Link href="/about" onClick={() => setIsOpen(false)}>About</Link>
          <Link href="/contact" onClick={() => setIsOpen(false)}>Contact</Link>
        </nav>
      )}
    </header>
  );
}