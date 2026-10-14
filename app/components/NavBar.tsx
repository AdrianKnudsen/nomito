"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navTitle, ROUTES } from "@/lib/routes";
import NavTitle from "./NavTitle";
import styles from "../../styles/nav.module.css";

export default function NavBar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <nav className={styles.navContainer}>
      <div className={`${styles.nav} ${expanded ? styles.navExpanded : ""}`}>
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
        <div className={styles.title}>
          {/* The fallback is the title from the pathname alone. On static pages it is what the
              HTML carries, and it equals the finished title there. */}
          <Suspense fallback={navTitle(pathname, [])}>
            <NavTitle />
          </Suspense>
        </div>
        <button
          className={styles.menuButton}
          aria-label="Open menu"
          aria-expanded={expanded}
          aria-controls="site-menu"
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
        {/* Always in the DOM so the row can animate from 0fr; inert while collapsed so
            its links are neither focusable nor announced. */}
        <div id="site-menu" className={styles.menuContent} inert={!expanded}>
          <ul>
            {ROUTES.filter((route) => route.inMenu).map((route) => (
              <li key={`menu-${route.prefix}`}>
                <Link href={route.prefix} onClick={() => setExpanded(false)}>
                  {route.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
