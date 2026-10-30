import type { ReactNode } from "react";
import ScrollShimmer from "./ScrollShimmer";
import styles from "../../styles/result.module.css";

interface ResultPanelProps {
  /** Optional: the day plan heads each meal with its own h2 instead. */
  heading?: ReactNode;
  children: ReactNode;
}

/**
 * The glass panel with the scrolling result list, one per page, so a page has
 * one scrolling result list and not several competing ones. A Suspense around a call goes
 * inside it, as children, never next to it: the panel has no key, so it stays mounted while
 * its contents change.
 */
export default function ResultPanel({ heading, children }: ResultPanelProps) {
  return (
    <div className={styles.resultWrapper}>
      <div className={styles.resultBox}>
        <ScrollShimmer className={styles.scrollContainer}>
          {heading !== undefined && <h2 className={styles.heading}>{heading}</h2>}
          {children}
        </ScrollShimmer>
      </div>
    </div>
  );
}
