"use client";

import { isApiError, SpoonacularError } from "@/lib/api-error";
import type { RecipeDetail, RecipeSearchResult } from "@/types/spoonacular";

/**
 * Henter fra våre egne ruter og kaster `SpoonacularError` ved feil, så UI-et kan skille
 * oppbrukt kvote fra «ingen treff» i stedet for å vise en feilrespons som tom liste.
 */
async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new SpoonacularError(
      { kind: "network", message: "Could not reach Nomito. Check your connection." },
      { cause }
    );
  }

  const body: unknown = await response.json();
  if (!response.ok) {
    throw new SpoonacularError(
      isApiError(body)
        ? body
        : {
            kind: "unknown",
            status: response.status,
            message: "Something went wrong. Please try again.",
          }
    );
  }
  return body as T;
}

export function fetchRecipes(ingredients = "chicken") {
  return getJson<RecipeSearchResult[]>(
    `/api/recipes?ingredients=${encodeURIComponent(ingredients)}`
  );
}

export function fetchRecipe(id: number) {
  return getJson<RecipeDetail>(`/api/recipe/${id}`);
}
