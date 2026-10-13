import Notice from "./Notice";
import RecipeCards from "./RecipeCards";
import ResultPanel from "./ResultPanel";
import styles from "../../styles/result.module.css";
import { leftoversRecipeHref } from "@/lib/links";
import {
  findRecipesByIngredients,
  SpoonacularError,
} from "@/lib/spoonacular";
import type { RecipeSearchResult } from "@/types/spoonacular";

// The count comes first because the list is cut to two lines on the card, and how much
// is missing is what decides whether the recipe uses up what you have.
function missingText(recipe: RecipeSearchResult): string {
  if (recipe.missedIngredientCount === 0) return "Nothing missing";
  const names = recipe.missedIngredients.map((i) => i.name).join(", ");
  return `Missing ${recipe.missedIngredientCount}: ${names}`;
}

export default async function RecipeList({ ingredients }: { ingredients: string }) {
  let recipes: RecipeSearchResult[];
  try {
    recipes = await findRecipesByIngredients(ingredients);
  } catch (error) {
    // Only upstream errors become a message; anything else is a bug and goes to Next.
    if (!(error instanceof SpoonacularError)) throw error;
    return <Notice role="alert">{error.apiError.message}</Notice>;
  }

  if (recipes.length === 0) {
    return <Notice>No recipes found.</Notice>;
  }

  return (
    <ResultPanel heading="Recipes:">
      <RecipeCards
        recipes={recipes.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          image: recipe.image,
          href: leftoversRecipeHref(
            recipe.id,
            ingredients,
            recipe.missedIngredients.map((i) => i.id)
          ),
          details: (
            <>
              <span className={styles.recipeMatch}>
                Uses {recipe.usedIngredientCount} of your ingredients
              </span>
              <span className={styles.recipeMissing}>{missingText(recipe)}</span>
            </>
          ),
        }))}
      />
    </ResultPanel>
  );
}
