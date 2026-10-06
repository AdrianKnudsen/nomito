"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { previousUrlMatches } from "./navigationHistory";
import styles from "../../styles/recipeDetails.module.css";

interface RecipeViewProps {
  /** Søkesiden oppskriften hører til. Historikken er nettleserens tilbake-knapp sin jobb. */
  backHref: string;
  /** Tittel, fakta og bilde — rendret på serveren, plassert over innholdet. */
  header: ReactNode;
  /** Ingredienser og steg — det lesemodusen gjelder. */
  children: ReactNode;
}

/**
 * Den eneste delen av oppskriftsvisningen som trenger klient-state. Innholdet kommer inn
 * ferdig rendret, så oppskriftsdataene ikke serialiseres til klienten.
 */
export default function RecipeView({
  backHref,
  header,
  children,
}: RecipeViewProps) {
  const router = useRouter();
  const [readableMode, setReadableMode] = useState(false);

  // Samme destinasjon som lenka, men fra router-cachen: et nytt søk koster kvote, et steg
  // tilbake gjør ikke. Bare når forrige side *er* det søket, så Back aldri sender noen
  // et annet sted enn lenka viser. Cmd/Ctrl-klikk o.l. får lenkas vanlige oppførsel.
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
        {/* Ingen prefetch: lenka peker på søkeresultatet, og å forhåndshente det er et
            nytt Spoonacular-søk ved hver visning av oppskriften. */}
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
