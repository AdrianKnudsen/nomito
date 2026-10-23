/**
 * The previous URL *within the app*, updated by `UrlTracker` on every navigation.
 *
 * Exists so Back can use `router.back()` — which serves the page from the router cache
 * and costs no Spoonacular call — but only when the previous page is exactly the list the
 * recipe was opened from (BackLink's `historyHref`). Browser history cannot be asked for the
 * previous URL, hence this log. Module level rather than context: nothing should re-render
 * when it changes; it is only read on click.
 */

let current: string | null = null;
let previous: string | null = null;

export function recordUrl(url: string): void {
  if (url === current) return;
  previous = current;
  current = url;
}

/** Same destination as `href`, however its query happens to be encoded or ordered. */
export function urlsMatch(previousUrl: URL, href: URL): boolean {
  if (previousUrl.pathname !== href.pathname) return false;
  // /search is not canonical, and comparing every parameter would make Back from a link with
  // ?fbclid= pay for a new search.
  if (href.pathname === "/search") {
    return (
      (previousUrl.searchParams.get("ingredients") ?? "") ===
      (href.searchParams.get("ingredients") ?? "")
    );
  }
  // The origin pages redirect to their canonical URL, so the whole query can be compared.
  return sortedQuery(previousUrl) === sortedQuery(href);
}

function sortedQuery(url: URL): string {
  const pairs = [...url.searchParams].sort(([ak, av], [bk, bv]) =>
    ak === bk ? compare(av, bv) : compare(ak, bk)
  );
  return new URLSearchParams(pairs).toString();
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function previousUrlMatches(href: string): boolean {
  if (previous === null) return false;
  return urlsMatch(
    new URL(previous, window.location.origin),
    new URL(href, window.location.origin)
  );
}
