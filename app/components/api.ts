"use client";

import type { RecipeSearchResult } from "@/types/spoonacular";

export async function fetchRecipes(
  ingredients = "chicken"
): Promise<RecipeSearchResult[]> {
  const response = await fetch(
    `/api/recipes?ingredients=${encodeURIComponent(ingredients)}`
  );
  const data = (await response.json()) as RecipeSearchResult[];
  return data;
}
