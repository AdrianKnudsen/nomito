/**
 * Hrefs to the recipe page and Back's targets from it. Server only: nothing with "use client"
 * imports this file. Imports are relative so the unit tests can run the compiled output with
 * plain Node.
 */

import type { ViaOrigin } from "../types/filters";
import {
  collectionFilters,
  collectionPairs,
  guideFilters,
  guidePairs,
  planChoicesPairs,
  planRequestPairs,
  planTargets,
  withQuery,
  type QueryPairs,
} from "./filters";
import { findCollection } from "./collections";
import { GUIDE_FORM_PATH, lookupVia, PLAN_FORM_PATH } from "./routes";

/**
 * The search goes along for Back, and the missing ingredients by id so the recipe can mark
 * them: /information has no idea what the user has at home, and asking it again would cost
 * quota. The ids match the recipe's own ingredient ids (checked).
 */
export function leftoversRecipeHref(
  id: number,
  ingredients: string,
  missingIds: number[]
): string {
  const params = new URLSearchParams({ ingredients, missing: missingIds.join(",") });
  return `/recipe/${id}?${params}`;
}

/** The origin's canonical parameters, as its own page writes them. */
function originPairs(origin: ViaOrigin): QueryPairs {
  switch (origin.via) {
    case "collection":
      return [["slug", origin.slug], ...collectionPairs(origin)];
    case "guide":
      return guidePairs(origin);
    case "plan":
      return planRequestPairs(origin);
  }
}

/** A recipe link that carries its origin, so the recipe can go Back there. */
export function recipeHrefVia(id: number, origin: ViaOrigin): string {
  return withQuery(`/recipe/${id}`, [["via", origin.via], ...originPairs(origin)]);
}

/**
 * The origin's results, canonical by construction: built from the parsed origin with the origin
 * page's own builder, and the path comes from VIA, never from the URL. Back returns here through
 * history, and links here when the list is fixed (originBackTargets).
 */
export function originBackHref(origin: ViaOrigin): string {
  const { backPath } = lookupVia(origin.via);
  switch (origin.via) {
    case "collection":
      return withQuery(`${backPath}/${origin.slug}`, collectionPairs(origin));
    case "guide":
      return withQuery(backPath, guidePairs(origin));
    case "plan":
      return withQuery(backPath, planRequestPairs(origin));
  }
}

/** Whether the origin's search sorts at random, so loading it again gives a different list. */
export function isRandomOrigin(origin: ViaOrigin): boolean {
  switch (origin.via) {
    case "collection": {
      const collection = findCollection(origin.slug);
      return collection !== undefined && collectionFilters(collection, origin).sort === "random";
    }
    case "guide":
      return guideFilters(origin).sort === "random";
    case "plan":
      return planTargets(origin).some((target) => target.filters.sort === "random");
  }
}

/** The free form in front of a random origin's results, as "Change choices"/"Change answers". */
function originFormHref(origin: ViaOrigin): string {
  switch (origin.via) {
    case "collection":
      // A collection has no free form: its page is the paid list. No collection is random (a test
      // pins it), so this branch is never Back's link; a random collection needs a form first.
      return originBackHref(origin);
    case "guide":
      return withQuery(GUIDE_FORM_PATH, guidePairs(origin));
    case "plan":
      return withQuery(PLAN_FORM_PATH, planChoicesPairs(origin));
  }
}

export interface BackTargets {
  /** Where Back's link goes: a new tab, a reload and a shared link land here. */
  href: string;
  /** The previous URL that lets Back step back through history instead, at no cost. */
  historyHref: string;
}

/**
 * Back from a recipe opened from an origin. History is always the origin's results. A fixed list
 * is also the link; a random list links to its free form, because loading it again would pay for
 * a new list that seldom has this recipe.
 */
export function originBackTargets(origin: ViaOrigin): BackTargets {
  const historyHref = originBackHref(origin);
  return { href: isRandomOrigin(origin) ? originFormHref(origin) : historyHref, historyHref };
}
