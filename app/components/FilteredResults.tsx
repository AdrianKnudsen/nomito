import Notice from "./Notice";
import RecipeCards, { type RecipeCardData } from "./RecipeCards";
import { recipeHrefVia } from "@/lib/links";
import { searchRecipes, SpoonacularError } from "@/lib/spoonacular";
import type { ViaOrigin } from "@/types/filters";
import type { RecipeFilters, RecipeSummary } from "@/types/spoonacular";

interface FilteredResultsProps {
  filters: RecipeFilters;
  /** Goes on every card, so the recipe can go Back to this page. */
  origin: ViaOrigin;
  /**
   * Shown under the error when the search fails: a collection's stored list, which is free.
   * That list ignores the user's choices (an allergy-relevant "avoid" among them), so the note
   * must say so; cards alone would pass as filtered results.
   */
  fallback?: { note: string; cards: RecipeCardData[] };
}

/** One filtered search as cards. Rendered inside a Suspense inside the page's ResultPanel. */
export default async function FilteredResults({
  filters,
  origin,
  fallback,
}: FilteredResultsProps) {
  let recipes: RecipeSummary[];
  try {
    recipes = await searchRecipes(filters);
  } catch (error) {
    // Only upstream errors become a message; anything else is a bug and goes to Next.
    if (!(error instanceof SpoonacularError)) throw error;
    return (
      <>
        <Notice role="alert">{error.apiError.message}</Notice>
        {fallback && (
          <>
            <Notice>{fallback.note}</Notice>
            <RecipeCards recipes={fallback.cards} />
          </>
        )}
      </>
    );
  }

  if (recipes.length === 0) {
    return <Notice>No recipes match these choices.</Notice>;
  }

  return (
    <RecipeCards
      recipes={recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        href: recipeHrefVia(recipe.id, origin),
      }))}
    />
  );
}
