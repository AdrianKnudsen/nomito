"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../../styles/nav.module.css";

const ANIMATION_DURATION = 1000;

/** Tittelen følger URL-en, så den stemmer også etter reload og tilbake-knappen. */
function titleFor(pathname: string): string {
  if (pathname.startsWith("/search") || pathname.startsWith("/recipe")) {
    return "Recipes by Ingredients";
  }
  return "Home";
}

export default function NavBar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [showMenuContent, setShowMenuContent] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (expanded) {
      setShowMenuContent(true);
    } else {
      timeout = setTimeout(() => setShowMenuContent(false), ANIMATION_DURATION);
    }
    return () => clearTimeout(timeout);
  }, [expanded]);

  return (
    <nav className={styles.navContainer}>
      <div
        className={`${styles.nav} ${expanded ? styles.navExpanded : ""}`}
        style={{
          height: expanded ? "22rem" : "6.2em",
          transition: "height 1s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        }}
      >
        <Link
          href="/"
          className={styles.logoLink}
          onClick={() => setExpanded(false)}
        >
          <Image
            className={styles.logo}
            src="/images/NomitoLogo.png"
            alt="Nomito home"
            width={100}
            height={100}
          />
        </Link>
        <div className={styles.title}>{titleFor(pathname)}</div>
        <button
          className={styles.menuButton}
          aria-label="Open menu"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 21 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1.44067 14.9583H19.524M1.44067 8.5H19.524M1.44067 2.04167H19.524"
              stroke="white"
              strokeWidth="2.58333"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {showMenuContent && (
          <div className={styles.menuContent}>
            <ul>
              <li>
                <Link href="/search" onClick={() => setExpanded(false)}>
                  Recipes by Ingredients
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
