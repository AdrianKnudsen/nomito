"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { previousUrlMatches } from "./navigationHistory";
import styles from "../../styles/recipeDetails.module.css";

interface RecipeViewProps {
  /** The search page the recipe belongs to. History is the browser back button's job. */
  backHref: string;
  /** Title, facts and image — rendered on the server, placed above the content. */
  header: ReactNode;
  /** Ingredients and steps — what reading mode applies to. */
  children: ReactNode;
}

/**
 * The only part of the recipe view that needs client state. The content arrives already
 * rendered, so the recipe data is not serialised to the client.
 */
export default function RecipeView({
  backHref,
  header,
  children,
}: RecipeViewProps) {
  const router = useRouter();
  const [readableMode, setReadableMode] = useState(false);

  // Same destination as the link, but from the router cache: a new search costs quota, a
  // step back does not. Only when the previous page *is* that search, so Back never sends
  // anyone somewhere other than the link shows. Cmd/Ctrl-click etc. keep the link's
  // normal behaviour.
  const handleBack = (event: MouseEvent<HTMLAnchorElement>) => {
    const modified =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (modified || event.button !== 0 || !previousUrlMatches(backHref)) return;
    event.preventDefault();
    router.back();
  };

  return (
    <>
      <div className={styles.buttonRow}>
        {/* No prefetch: the link points at the search results, and prefetching them is
            a new Spoonacular search on every view of the recipe. */}
        <Link
          href={backHref}
          prefetch={false}
          className={styles.actionButton}
          onClick={handleBack}
        >
          Back
        </Link>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setReadableMode(!readableMode)}
        >
          {readableMode ? "Normal" : "Read"}
        </button>
      </div>

      {header}

      <div
        className={`${styles.contentSection} ${readableMode ? styles.readable : ""}`}
      >
        {children}
      </div>
    </>
  );
}
