"use client";

const API_KEY = process.env.NEXT_PUBLIC_SPOONACULAR_KEY;

export async function fetchRecipes(ingredients = "chicken") {
  const response = await fetch(
    `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=99999&apiKey=${API_KEY}`
  );
  const data = await response.json();
  return data;
}
