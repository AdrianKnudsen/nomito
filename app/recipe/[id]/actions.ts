"use server";

import { getIngredientSubstitutes, SpoonacularError } from "@/lib/spoonacular";
import type { SubstitutesState } from "@/types/filters";

/** Spoonacular's ids are 32-bit; anything outside is not an ingredient. */
const MAX_ID = 2_147_483_647;

/**
 * The app's only Server Action. A URL change would re-render the recipe and fetch it again,
 * and nothing may be cached, so every click would cost quota.
 *
 * It must not revalidate, set cookies, notFound() or redirect(): each re-renders the page with
 * another /information call and empties the router cache, so Back stops being free.
 *
 * A public POST endpoint, so the id is checked at runtime: the TypeScript type is not enforced at
 * this boundary, and a string id arrives as a string. Number.isInteger alone lets 1e21 through.
 */
export async function getSubstitutes(
  // useActionState passes the previous state first. It comes from the client and is not used.
  _previous: SubstitutesState,
  id: unknown
): Promise<SubstitutesState> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0 || id > MAX_ID) {
    return { status: "error", kind: "invalid", message: "Couldn't look that up." };
  }
  try {
    return { status: "ok", substitutes: await getIngredientSubstitutes(id) };
  } catch (error) {
    // A plain object, not the error: a thrown or returned SpoonacularError is redacted in prod.
    // Anything else is a bug, and "Application error" is the right answer to a bug.
    if (!(error instanceof SpoonacularError)) throw error;
    return { status: "error", kind: error.apiError.kind, message: error.apiError.message };
  }
}
