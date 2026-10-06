/**
 * Forrige URL *inne i appen*, oppdatert av `UrlTracker` ved hver navigasjon.
 *
 * Finnes for at Back kan bruke `router.back()` — som henter siden fra router-cachen og
 * ikke koster et Spoonacular-kall — men bare når forrige side er nøyaktig der lenka
 * likevel peker. Nettleserhistorikken kan ikke spørres om forrige URL, derav egen logg.
 * Modulnivå framfor context: ingen komponent skal rendres på nytt når den endres, den
 * leses bare ved klikk.
 */

let current: string | null = null;
let previous: string | null = null;

export function recordUrl(url: string): void {
  if (url === current) return;
  previous = current;
  current = url;
}

/** Samme side og samme søk, uavhengig av hvordan søket er URL-kodet. */
export function previousUrlMatches(href: string): boolean {
  if (previous === null) return false;
  const a = new URL(previous, window.location.origin);
  const b = new URL(href, window.location.origin);
  return (
    a.pathname === b.pathname &&
    (a.searchParams.get("ingredients") ?? "") ===
      (b.searchParams.get("ingredients") ?? "")
  );
}
