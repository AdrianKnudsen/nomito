/**
 * Parsers and canonical builders for every page that reads its query, and parseVia.
 *
 * Server only: nothing with "use client" imports this file. Imports are relative so the unit
 * tests can run the compiled output with plain Node.
 */

import type { AvoidValue, CollectionAdjustment, CollectionTime, ViaOrigin } from "../types/filters";
import type { Diet, Intolerance, RecipeFilters } from "../types/spoonacular";
import { findCollection, type Collection } from "./collections";
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

export interface Option<T extends string> {
  value: T;
  label: string;
}

/** The first given value that is allowed. A single-value parameter ignores the rest. */
function firstOf<T extends string>(param: Param, allowed: readonly T[]): T | undefined {
  for (const value of values(param)) {
    const match = allowed.find((a) => a === value);
    if (match !== undefined) return match;
  }
  return undefined;
}

/**
 * Every allowed value given, deduplicated, in the order of `allowed`. That is the form's order,
 * so a submitted form lands on the canonical URL without a redirect.
 */
function allOf<T extends string>(param: Param, allowed: readonly T[]): T[] {
  const given = new Set(values(param));
  return allowed.filter((a) => given.has(a));
}

function valuesOf<T extends string>(options: readonly Option<T>[]): T[] {
  return options.map((option) => option.value);
}

export function labelOf<T extends string>(options: readonly Option<T>[], value: T): string {
  const option = options.find((o) => o.value === value);
  // Values are parsed against the same lists, so a miss is a bug.
  if (!option) throw new Error(`No label for ${value}`);
  return option.label;
}

/** The labels say what is avoided; the values describe the filter. Same labels in every form. */
export const AVOID_OPTIONS: readonly Option<AvoidValue>[] = [
  { value: "vegetarian", label: "Meat" },
  { value: "vegan", label: "All animal products" },
  { value: "gluten-free", label: "Gluten" },
  { value: "dairy-free", label: "Dairy" },
];

const AVOID_SUMMARY: readonly Option<AvoidValue>[] = [
  { value: "vegetarian", label: "No meat" },
  { value: "vegan", label: "No animal products" },
  { value: "gluten-free", label: "No gluten" },
  { value: "dairy-free", label: "No dairy" },
];

export function avoidSummary(avoid: readonly AvoidValue[]): string[] {
  return avoid.map((value) => labelOf(AVOID_SUMMARY, value));
}

/** Vegan already rules out meat, so vegetarian is dropped next to it, everywhere. */
function parseAvoid(
  param: Param,
  allowed: readonly AvoidValue[] = valuesOf(AVOID_OPTIONS)
): AvoidValue[] {
  const avoid = allOf(param, allowed);
  return avoid.includes("vegan") ? avoid.filter((v) => v !== "vegetarian") : avoid;
}

function avoidPairs(avoid: readonly AvoidValue[]): QueryPairs {
  return avoid.map((value): [string, string] => ["avoid", value]);
}

const DIET_ORDER: readonly Diet[] = ["vegetarian", "vegan"];
const INTOLERANCE_ORDER: readonly Intolerance[] = ["gluten", "dairy"];

/**
 * What the avoid answers add to a search, merged with what it already has. Gluten and dairy go
 * through `intolerances`, so "avoid" has one mechanism; there is no dairy diet.
 */
function applyAvoid(filters: RecipeFilters, avoid: readonly AvoidValue[]): RecipeFilters {
  const diet = new Set<Diet>(filters.diet);
  const intolerances = new Set<Intolerance>(filters.intolerances);
  for (const value of avoid) {
    if (value === "vegetarian" || value === "vegan") diet.add(value);
    if (value === "gluten-free") intolerances.add("gluten");
    if (value === "dairy-free") intolerances.add("dairy");
  }
  const result: RecipeFilters = { ...filters };
  if (diet.size > 0) result.diet = DIET_ORDER.filter((d) => diet.has(d));
  if (intolerances.size > 0) {
    result.intolerances = INTOLERANCE_ORDER.filter((i) => intolerances.has(i));
  }
  return result;
}

export const TIME_OPTIONS: readonly Option<CollectionTime>[] = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
];

/**
 * Only the times that tighten the collection. A looser one would be dropped by the canonical
 * URL, so it is never offered and can never vanish silently.
 */
export function collectionTimeOptions(collection: Collection): readonly Option<CollectionTime>[] {
  const max = collection.filters.maxReadyTime;
  return max === undefined ? TIME_OPTIONS : TIME_OPTIONS.filter((o) => Number(o.value) < max);
}

/** Likewise, only what the collection does not already rule out. */
export function collectionAvoidOptions(collection: Collection): readonly Option<AvoidValue>[] {
  const diet = collection.filters.diet ?? [];
  const intolerances = collection.filters.intolerances ?? [];
  const covered = (value: AvoidValue): boolean => {
    switch (value) {
      case "vegetarian":
        return diet.includes("vegetarian") || diet.includes("vegan");
      case "vegan":
        return diet.includes("vegan");
      case "gluten-free":
        return intolerances.includes("gluten");
      case "dairy-free":
        return intolerances.includes("dairy");
    }
  };
  return AVOID_OPTIONS.filter((option) => !covered(option.value));
}

export function parseCollectionAdjustment(
  collection: Collection,
  params: SearchParams
): CollectionAdjustment {
  const time = firstOf(params.time, valuesOf(collectionTimeOptions(collection)));
  const avoid = parseAvoid(params.avoid, valuesOf(collectionAvoidOptions(collection)));
  return time === undefined ? { avoid } : { time, avoid };
}

export function isAdjusted(adjustment: CollectionAdjustment): boolean {
  return adjustment.time !== undefined || adjustment.avoid.length > 0;
}

/** In the form's order: time, then avoid. */
export function collectionPairs(adjustment: CollectionAdjustment): QueryPairs {
  const pairs: QueryPairs = [];
  if (adjustment.time !== undefined) pairs.push(["time", adjustment.time]);
  return [...pairs, ...avoidPairs(adjustment.avoid)];
}

/** The collection's own type and sort stay; time is the lower of the two, diets are ANDed. */
export function collectionFilters(
  collection: Collection,
  adjustment: CollectionAdjustment
): RecipeFilters {
  const filters: RecipeFilters = { ...collection.filters };
  if (adjustment.time !== undefined) {
    const time = Number(adjustment.time);
    const own = collection.filters.maxReadyTime;
    filters.maxReadyTime = own === undefined ? time : Math.min(time, own);
  }
  return applyAvoid(filters, adjustment.avoid);
}

/** The first given slug that names a collection. */
function firstCollection(param: Param): Collection | undefined {
  for (const value of values(param)) {
    const collection = findCollection(value);
    if (collection) return collection;
  }
  return undefined;
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
  // An incomplete origin makes `via` invalid, and the next value is not tried.
  switch (via) {
    case "collection": {
      const collection = firstCollection(params.slug);
      if (!collection) return null;
      return { via, slug: collection.slug, ...parseCollectionAdjustment(collection, params) };
    }
    default:
      // Each origin gets its case in the commit that builds its route, together with its VIA row.
      throw new Error(`via=${via} is in VIA but parseVia has no case for it`);
  }
}
