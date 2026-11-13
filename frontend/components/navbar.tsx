"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart } from "lucide-react";

/** Header from the team mockup: slate bar, links with a growing blue underline. */
const LINKS = [
  { href: "/", label: "Tổng quan" },
  { href: "/analysis", label: "Dữ liệu & Phân tích" },
  { href: "/eda", label: "Khám phá dữ liệu" },
  { href: "/forecast", label: "Dự báo" },
  { href: "/explainability", label: "Giải thích mô hình" },
  { href: "/pipeline", label: "Thu thập & Làm sạch" },
];

/**
 * On a phone the six links do not fit, so the link row scrolls sideways.
 * The active link is scrolled into view, and the right edge fades out while
 * more links are hidden there, so the viewer can tell the row scrolls.
 */
export default function Navbar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [moreOnRight, setMoreOnRight] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => setMoreOnRight(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
    nav.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
    update();
    nav.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      nav.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-panel">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 sm:gap-6 sm:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2 py-4 text-lg font-bold text-white" aria-label="Tổng quan">
          <LineChart className="h-6 w-6 text-accentSoft" aria-hidden />
          {/* Icon only on phones so the six links get the width. */}
          <span className="hidden sm:inline">Tiền số &amp; Cổ phiếu</span>
        </Link>
        <nav
          ref={navRef}
          className={`nav-scroll flex min-w-0 items-center gap-1 overflow-x-auto ${moreOnRight ? "nav-scroll-more" : ""}`}
          aria-label="Điều hướng chính"
        >
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link" data-active={pathname === link.href} aria-current={pathname === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
