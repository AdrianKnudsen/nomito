import Image from "next/image";
import Link from "next/link";
import Notice from "./Notice";
import ScrollShimmer from "./ScrollShimmer";
import styles from "../../styles/result.module.css";
import {
  findRecipesByIngredients,
  SpoonacularError,
} from "@/lib/spoonacular";
import type { RecipeSearchResult } from "@/types/spoonacular";

function missingText(recipe: RecipeSearchResult): string {
  if (recipe.missedIngredientCount === 0) return "Nothing missing";
  return `Missing: ${recipe.missedIngredients.map((i) => i.name).join(", ")}`;
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
                  href={`/recipe/${recipe.id}?${new URLSearchParams({ ingredients })}`}
                  prefetch={false}
                  className={styles.recipeLink}
                >
                  {recipe.image && (
                    <Image
                      className={styles.recipeImage}
                      src={recipe.image}
                      alt=""
                      width={80}
                      height={80}
                    />
                  )}
                  <div className={styles.recipeText}>
                    <span className={styles.recipeTitle}>{recipe.title}</span>
                    <span className={styles.recipeMatch}>
                      Uses {recipe.usedIngredientCount} of your ingredients
                    </span>
                    <span className={styles.recipeMatch}>
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
