import Link from "next/link";
import Notice from "./Notice";
import RecipeImage from "./RecipeImage";
import ScrollShimmer from "./ScrollShimmer";
import styles from "../../styles/result.module.css";
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

/**
 * The search goes along for Back, and the missing ingredients by id so the recipe can
 * mark them: /information has no idea what the user has at home, and asking it again
 * would cost quota. The ids match the recipe's own ingredient ids (checked).
 */
function recipeHref(recipe: RecipeSearchResult, ingredients: string): string {
  const params = new URLSearchParams({
    ingredients,
    missing: recipe.missedIngredients.map((i) => i.id).join(","),
  });
  return `/recipe/${recipe.id}?${params}`;
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
    <div className={styles.resultWrapper}>
      <div className={styles.resultBox}>
        <ScrollShimmer className={styles.scrollContainer}>
          <h2 className={styles.heading}>Recipes:</h2>
          <ul className={styles.recipeList}>
            {recipes.map((recipe) => (
              <li key={recipe.id} className={styles.recipeItem}>
                {/* No prefetch: in production Next prefetches visible links, and for
                    /recipe/[id] that runs generateMetadata — one quota point per visible
                    card. Measured: 19 extra upstream calls per view of the search page. */}
                <Link
                  href={recipeHref(recipe, ingredients)}
                  prefetch={false}
                  className={styles.recipeLink}
                >
                  {/* The box holds the thumbnail's place and colour if the image 404s. */}
                  <span className={styles.thumb}>
                    {recipe.image && (
                      <RecipeImage
                        className={styles.recipeImage}
                        src={recipe.image}
                        alt=""
                        width={312}
                        height={231}
                        sizes="6rem"
                      />
                    )}
                  </span>
                  <div className={styles.recipeText}>
                    <span className={styles.recipeTitle}>{recipe.title}</span>
                    <span className={styles.recipeMatch}>
                      Uses {recipe.usedIngredientCount} of your ingredients
                    </span>
                    <span className={styles.recipeMissing}>
                      {missingText(recipe)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </ScrollShimmer>
      </div>
    </div>
  );
}
