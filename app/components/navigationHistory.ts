/**
 * The previous URL *within the app*, updated by `UrlTracker` on every navigation.
 *
 * Exists so Back can use `router.back()` — which serves the page from the router cache
 * and costs no Spoonacular call — but only when the previous page is exactly where the
 * link points anyway. Browser history cannot be asked for the previous URL, hence this
 * log. Module level rather than context: nothing should re-render when it changes; it is
 * only read on click.
 */

let current: string | null = null;
let previous: string | null = null;

export function recordUrl(url: string): void {
  if (url === current) return;
  previous = current;
  current = url;
}

/** Same page and same search, however the search happens to be URL-encoded. */
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
