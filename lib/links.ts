/**
 * Hrefs to the recipe page. Server only: nothing with "use client" imports this file.
 * Imports are relative so the unit tests can run the compiled output with plain Node.
 */

import type { ViaOrigin } from "../types/filters";
import { collectionPairs, withQuery, type QueryPairs } from "./filters";
import { lookupVia } from "./routes";

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
    default:
      throw new Error(`No parameters for via=${origin.via} yet`);
  }
}

/** A recipe link that carries its origin, so the recipe can go Back there. */
export function recipeHrefVia(id: number, origin: ViaOrigin): string {
  return withQuery(`/recipe/${id}`, [["via", origin.via], ...originPairs(origin)]);
}

/**
 * Back from a recipe: built from the parsed origin with the origin page's own builder, so it is
 * canonical by construction. The path comes from VIA, never from the URL.
 */
export function originBackHref(origin: ViaOrigin): string {
  const { backPath } = lookupVia(origin.via);
  switch (origin.via) {
    case "collection":
      return withQuery(`${backPath}/${origin.slug}`, collectionPairs(origin));
    default:
      throw new Error(`No Back target for via=${origin.via} yet`);
  }
}
