"use client";

import { Suspense, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navTitle, ROUTES } from "@/lib/routes";
import NavTitle from "./NavTitle";
import styles from "../../styles/nav.module.css";

export default function NavBar() {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // The element owns its open state, so the menu opens, closes and navigates before hydration and
  // without JS. JS only closes it after a choice; a controlled `open` would hand the state to React
  // and lose that.
  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return (
    <nav className={styles.navContainer}>
      <div className={styles.nav}>
        <Link href="/" className={styles.logoLink} onClick={closeMenu}>
          <Image
            className={styles.logo}
            src="/images/NomitoLogo.png"
            alt="Nomito home"
            width={100}
            height={100}
          />
        </Link>
        <div className={styles.title}>
          {/* The fallback is the title from the pathname alone. On static pages it is what the
              HTML carries, and it equals the finished title there. */}
          <Suspense fallback={navTitle(pathname, [])}>
            <NavTitle />
          </Suspense>
        </div>
        <details ref={detailsRef} className={styles.menu}>
          <summary className={styles.menuButton} aria-label="Menu">
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
          </summary>
          {/* The browser hides this while the menu is closed: its links are neither focusable
              nor announced. */}
          <div className={styles.menuContent}>
            <ul>
              {ROUTES.filter((route) => route.inMenu).map((route) => (
                <li key={`menu-${route.prefix}`}>
                  <Link href={route.prefix} onClick={closeMenu}>
                    {route.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </nav>
  );
}
