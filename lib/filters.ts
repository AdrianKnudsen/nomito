/**
 * Parsers and canonical builders for every page that reads its query, and parseVia.
 *
 * Server only: nothing with "use client" imports this file. Imports are relative so the unit
 * tests can run the compiled output with plain Node.
 */

import type { ViaOrigin } from "../types/filters";
import { isVia } from "./routes";

export type SearchParams = Record<string, string | string[] | undefined>;
type Param = SearchParams[string];
export type QueryPairs = [string, string][];

function values(param: Param): string[] {
  if (param === undefined) return [];
  return Array.isArray(param) ? param : [param];
}

export function toQuery(pairs: QueryPairs): string {
  return new URLSearchParams(pairs).toString();
}

export function withQuery(path: string, pairs: QueryPairs): string {
  const query = toQuery(pairs);
  return query ? `${path}?${query}` : path;
}

/** The query as the page received it, to compare with the canonical one. */
export function receivedQuery(params: SearchParams): string {
  const pairs: QueryPairs = [];
  for (const [key, value] of Object.entries(params)) {
    for (const v of values(value)) pairs.push([key, v]);
  }
  return toQuery(pairs);
}

/**
 * The origin a recipe was opened from, or null to behave as the leftovers search.
 *
 * Only the first known `via` counts, and the next one is never tried: NavTitle uses the same
 * rule, so the page and the title agree on the origin.
 */
export function parseVia(params: SearchParams): ViaOrigin | null {
  const via = values(params.via).find(isVia);
  if (via === undefined) return null;
  // Each origin gets its case in the commit that builds its route, together with its VIA row.
  throw new Error(`via=${via} is in VIA but parseVia has no case for it`);
}
