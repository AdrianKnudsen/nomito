/**
 * Every Spoonacular call in one place, one per data type.
 *
 * Only called from server components, so the API key never reaches the client. The
 * reason for keeping it all here is the same as for GROQ queries: when a call has to
 * change, there should be one file to change it in.
 */

import { cache } from "react";
import type {
  ApiError,
  RecipeDetail,
  RecipeSearchResult,
} from "@/types/spoonacular";

const BASE = "https://api.spoonacular.com";

/**
 * The documented maximum is 100, and the cost is 1 point + 0.01 per recipe. 24 is
 * enough to browse without burning quota or pushing 100 cards into the DOM.
 */
const RESULT_COUNT = 24;

/**
 * Pages catch this and show `apiError.message`. They render the error themselves rather
 * than leaving it to `error.tsx`, because Next hides server component error messages in
 * production — and with it the difference between a spent quota and a rejected key.
 */
export class SpoonacularError extends Error {
  readonly apiError: ApiError;

  constructor(apiError: ApiError, options?: { cause?: unknown }) {
    super(apiError.message, options);
    this.name = "SpoonacularError";
    this.apiError = apiError;
  }
}

function apiKey(): string {
  const key = process.env.SPOONACULAR_KEY;
  if (!key) {
    throw new Error("SPOONACULAR_KEY is missing from the environment.");
  }
  return key;
}

/**
 * Turns a failed response into something the UI can tell apart.
 *
 * The point is 402: a spent quota used to show up as "No recipes found", an empty state
 * instead of an error. That is misinformation, not an empty list.
 */
function toApiError(status: number): ApiError {
  if (status === 402) {
    return {
      kind: "quota",
      status,
      message: "Today's recipe quota is used up. Try again tomorrow.",
    };
  }
  if (status === 401 || status === 403) {
    return {
      kind: "auth",
      status,
      message: "The recipe service rejected our API key.",
    };
  }
  return {
    kind: "unknown",
    status,
    message: `The recipe service responded with ${status}.`,
  };
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new SpoonacularError(
      { kind: "network", message: "Could not reach the recipe service." },
      { cause }
    );
  }

  if (!response.ok) {
    throw new SpoonacularError(toApiError(response.status));
  }

  return (await response.json()) as T;
}

/**
 * Search by the ingredients you have at home.
 *
 * `ranking: 2` minimises missing ingredients rather than maximising used ones, and
 * `ignorePantry` keeps water, salt and flour out of the count. Both go straight to the
 * food-waste purpose, and both were unused before.
 */
export async function findRecipesByIngredients(
  ingredients: string
): Promise<RecipeSearchResult[]> {
  const params = new URLSearchParams({
    ingredients,
    number: String(RESULT_COUNT),
    ranking: "2",
    ignorePantry: "true",
    apiKey: apiKey(),
  });
  return getJson<RecipeSearchResult[]>(
    `${BASE}/recipes/findByIngredients?${params}`
  );
}

/**
 * The full recipe, steps included.
 *
 * `includeNutrition=true` costs no extra call and is what makes the facts panel
 * possible. `analyzedInstructions` comes in the same response, so a separate call to
 * /analyzedInstructions would only burn another quota point per recipe.
 *
 * `cache` lets `generateMetadata` and the page share one call per request instead of
 * paying two quota points for the same recipe.
 */
export const getRecipeDetail = cache(
  async (id: string): Promise<RecipeDetail> => {
    const params = new URLSearchParams({
      includeNutrition: "true",
      metric: "true",
      apiKey: apiKey(),
    });
    return getJson<RecipeDetail>(
      `${BASE}/recipes/${encodeURIComponent(id)}/information?${params}`
    );
  }
);

/**
 * The image URL names its size, and /information returns 556x370. 636x393 is the largest
 * size Spoonacular serves and existed for every recipe checked on the CDN, so the hero
 * asks for it. Any other URL shape is returned unchanged.
 */
export function largestRecipeImage(url: string): string {
  return url.replace(/-556x370\.(\w+)$/, "-636x393.$1");
}
