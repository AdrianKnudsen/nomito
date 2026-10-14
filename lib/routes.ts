/**
 * Every route's title and whether it is in the menu, in menu order, plus the `via` origins a
 * recipe can be opened from. Pure data with type-only imports, so the client (NavBar) and the
 * server (pages, parsers) read the same table.
 *
 * A row goes in with the commit that builds its route, never before.
 */

import type { Via } from "../types/filters";

interface RouteEntry {
  prefix: string;
  title: string;
  inMenu: boolean;
}

export const ROUTES: readonly RouteEntry[] = [
  { prefix: "/", title: "Home", inMenu: false },
  { prefix: "/search", title: "Use up leftovers", inMenu: true },
];

/** Whole segments: /collections matches /collections/quick-easy, not /collectionsx. */
function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function titleFor(pathname: string): string {
  return ROUTES.find((route) => matches(pathname, route.prefix))?.title ?? "Home";
}

export interface ViaEntry {
  backPath: string;
  title: string;
}

/**
 * Where a recipe opened from a menu entry goes Back to, and the nav title it shows. The only
 * list of valid `via` values. A Map, not an object: `via` comes from the URL, and `__proto__`
 * and `constructor` exist on every object.
 */
export const VIA: ReadonlyMap<Via, ViaEntry> = new Map<Via, ViaEntry>([]);

export function isVia(value: string): value is Via {
  return (VIA as ReadonlyMap<string, ViaEntry>).has(value);
}

export function lookupVia(via: Via): ViaEntry {
  const entry = VIA.get(via);
  // isVia and parseVia only hand out values that are in the map.
  if (!entry) throw new Error(`No VIA entry for ${via}`);
  return entry;
}

/**
 * The nav title. On a recipe it follows the first known `via`, the same rule as parseVia, but
 * without checking that the origin's parameters are complete: the title navigates nowhere, so a
 * mismatch there is accepted.
 */
export function navTitle(pathname: string, via: readonly string[]): string {
  if (!pathname.startsWith("/recipe/")) return titleFor(pathname);
  const known = via.find(isVia);
  return known ? lookupVia(known).title : titleFor("/search");
}
