"use client";

export async function fetchRecipes(ingredients = "chicken") {
  const response = await fetch(
    `/api/recipes?ingredients=${encodeURIComponent(ingredients)}`
  );
  const data = await response.json();
  return data;
}
