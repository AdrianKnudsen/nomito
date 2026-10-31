"use client";

import { Suspense, useRef } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navTitle, ROUTES } from "@/lib/routes";
import NavTitle from "./NavTitle";
import styles from "../../styles/nav.module.css";

const MENU_ROUTES = ROUTES.filter((route) => route.inMenu);

function isClosing(details: HTMLDetailsElement): boolean {
  return details.hasAttribute("data-closing");
}

/** The item count as a unitless custom property, so the stagger is computed in CSS. */
function menuCount(count: number): CSSProperties {
  return { "--n": String(count) } as CSSProperties;
}

/** An item's place in the list, for its own delay. */
function itemIndex(index: number): CSSProperties {
  return { "--i": String(index) } as CSSProperties;
}

export default function NavBar() {
  const pathname = usePathname();
  // The element owns its open state, so the menu opens, closes and navigates before hydration and
  // without JS. JS adds the animated close (the button, Escape, a chosen link); a controlled `open`
  // would hand the state to React and lose that.
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  // The list's box is reached by ref because its class name is hashed. `inert` goes on it and not on
  // the details: the button has to stay clickable while the menu closes, so a closing can be undone.
  const contentRef = useRef<HTMLDivElement>(null);
  // Which closing is the current one. A closing that is still waiting on its animations checks this
  // before it touches the menu, so a reopening or an immediate close makes the old one stand down.
  const closingRun = useRef(0);

  const clearClosingState = (details: HTMLDetailsElement) => {
    details.removeAttribute("data-closing");
    details.removeAttribute("data-reopened");
    contentRef.current?.removeAttribute("inert");
  };

  const closeAnimated = () => {
    const details = detailsRef.current;
    if (!details || !details.open || isClosing(details)) return;
    closingRun.current += 1;
    const run = closingRun.current;
    // The fade-out starts from each item's opacity right now, so a closing during the opening, or
    // after an undone closing, does not flash the items to full first.
    contentRef.current?.querySelectorAll("li").forEach((item) => {
      item.style.setProperty("--item-from", getComputedStyle(item).opacity);
    });
    details.removeAttribute("data-reopened");
    details.setAttribute("data-closing", "");
    contentRef.current?.setAttribute("inert", "");
    // Read after the attributes are set: it forces the style update, so the items' fade-out and the
    // icon's delayed transitions are in the list. The drawer is not: Chromium does not expose the
    // transition on ::details-content, so the drawer and the icon share their closing delay and
    // duration in the CSS, and the icon is what this waits for.
    const animations = details.getAnimations({ subtree: true });
    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      // Overtaken by a reopening or by closeNow: the menu is no longer this closing's to close. A
      // cancelled animation settles too, so this check is what tells the two cases apart.
      if (run !== closingRun.current) return;
      clearClosingState(details);
      details.open = false;
    });
  };

  // A click on the button while the menu is closing. The items fade back in from where they are
  // (data-reopened), instead of the in-animation starting over from nothing.
  const reopen = (details: HTMLDetailsElement) => {
    closingRun.current += 1;
    details.removeAttribute("data-closing");
    details.setAttribute("data-reopened", "");
    contentRef.current?.removeAttribute("inert");
  };

  // The logo leads home and the page is swapped, so there is nothing to animate. Everything is reset
  // in the same step, so a closing that was under way can never leave `inert` on a later opening.
  const closeNow = () => {
    closingRun.current += 1;
    const details = detailsRef.current;
    if (!details) return;
    clearClosingState(details);
    details.open = false;
  };

  // The button's default is stopped only while the menu is open: its own toggle would close it at
  // once. A closed menu is left to the browser.
  const onSummaryClick = (event: MouseEvent<HTMLElement>) => {
    const details = detailsRef.current;
    if (!details) return;
    if (!details.open) {
      details.removeAttribute("data-reopened");
      return;
    }
    event.preventDefault();
    if (isClosing(details)) reopen(details);
    else closeAnimated();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    const details = detailsRef.current;
    if (event.key !== "Escape" || !details || !details.open || isClosing(details)) return;
    event.preventDefault();
    // Focus goes to the button first, so it does not depend on what the browser does with a focused
    // element that turns inert.
    summaryRef.current?.focus();
    closeAnimated();
  };

  return (
    <nav className={styles.navContainer}>
      <div className={styles.nav}>
        <Link href="/" className={styles.logoLink} onClick={closeNow}>
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
        <details
          ref={detailsRef}
          className={styles.menu}
          style={menuCount(MENU_ROUTES.length)}
          onKeyDown={onKeyDown}
        >
          <summary
            ref={summaryRef}
            className={styles.menuButton}
            aria-label="Menu"
            onClick={onSummaryClick}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 21 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <line
                className={styles.barTop}
                x1="1.44067"
                y1="2.04167"
                x2="19.524"
                y2="2.04167"
                stroke="white"
                strokeWidth="2.58333"
                strokeLinecap="round"
              />
              <line
                className={styles.barMiddle}
                x1="1.44067"
                y1="8.5"
                x2="19.524"
                y2="8.5"
                stroke="white"
                strokeWidth="2.58333"
                strokeLinecap="round"
              />
              <line
                className={styles.barBottom}
                x1="1.44067"
                y1="14.9583"
                x2="19.524"
                y2="14.9583"
                stroke="white"
                strokeWidth="2.58333"
                strokeLinecap="round"
              />
            </svg>
          </summary>
          {/* The browser hides this while the menu is closed: its links are neither focusable nor
              announced. While it closes, `open` stays on until the animation is done, so `inert`
              does the same. */}
          <div ref={contentRef} className={styles.menuContent}>
            <ul>
              {MENU_ROUTES.map((route, index) => (
                <li key={`menu-${route.prefix}`} style={itemIndex(index)}>
                  <Link href={route.prefix} onClick={closeAnimated}>
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
