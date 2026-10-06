"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchRecipe, fetchRecipes } from "./api";
import RecipeDetails from "./RecipeDetails";
import styles from "../../styles/result.module.css";
import { SpoonacularError } from "@/lib/api-error";
import type {
  ApiError,
  RecipeDetail,
  RecipeSearchResult,
} from "@/types/spoonacular";

interface ResultProps {
  ingredients: string;
  resetTrigger: boolean;
}

/**
 * Alt som ikke er en `SpoonacularError` er en bug hos oss, ikke en upstream-feil. Den
 * logges med full stack i stedet for å forsvinne, og brukeren får en generisk melding.
 */
function toApiError(error: unknown): ApiError {
  if (error instanceof SpoonacularError) return error.apiError;
  console.error(error);
  return { kind: "unknown", message: "Something went wrong. Please try again." };
}

function missingText(recipe: RecipeSearchResult): string {
  if (recipe.missedIngredientCount === 0) return "Nothing missing";
  return `Missing: ${recipe.missedIngredients.map((i) => i.name).join(", ")}`;
}

export default function Result({ ingredients, resetTrigger }: ResultProps) {
  const [recipes, setRecipes] = useState<RecipeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<ApiError | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(
    null
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<ApiError | null>(null);

  useEffect(() => {
    const wrapper = document.querySelector<HTMLElement>(
      `.${styles.scrollContainer}`
    );
    if (!wrapper) return;

    const handleScroll = () => {
      const scrollTop = wrapper.scrollTop;
      const scrollHeight = wrapper.scrollHeight - wrapper.clientHeight;
      const scrollRatio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      const shimmerShift = scrollRatio * 100;
      if (wrapper.parentElement)
        wrapper.parentElement.style.setProperty(
          "--shimmer-shift",
          `${shimmerShift}%`
        );
    };

    handleScroll();
    wrapper.addEventListener("scroll", handleScroll);
    return () => wrapper.removeEventListener("scroll", handleScroll);
  }, [recipes]);

  useEffect(() => {
    async function loadData() {
      if (!ingredients || ingredients.trim() === "") return;

      setLoading(true);
      setSelectedRecipe(null);
      setSearchError(null);
      setDetailsError(null);
      try {
        const data = await fetchRecipes(ingredients);
        setRecipes(data);
      } catch (error) {
        setRecipes([]);
        setSearchError(toApiError(error));
      } finally {
        setHasSearched(true);
        setLoading(false);
      }
    }

    loadData();
  }, [ingredients]);

  useEffect(() => {
    setRecipes([]);
    setHasSearched(false);
    setSearchError(null);
    setSelectedRecipe(null);
    setDetailsError(null);
  }, [resetTrigger]);

  const handleRecipeClick = async (id: number) => {
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      setSelectedRecipe(await fetchRecipe(id));
    } catch (error) {
      setDetailsError(toApiError(error));
    } finally {
      setDetailsLoading(false);
    }
  };

  if (loading) {
    return (
      <p className={styles.loading} role="status">
        Loading recipes...
      </p>
    );
  }

  if (searchError) {
    return (
      <p className={styles.loading} role="alert">
        {searchError.message}
      </p>
    );
  }

  if (recipes.length === 0 && hasSearched) {
    return <p className={styles.loading}>No recipes found.</p>;
  }

  if (detailsLoading) {
    return (
      <p className={styles.loading} role="status">
        Loading recipe...
      </p>
    );
  }

  if (selectedRecipe) {
    return (
      <RecipeDetails
        recipe={selectedRecipe}
        onBack={() => setSelectedRecipe(null)}
      />
    );
  }

  // Show recipe list
  if (hasSearched && recipes.length > 0) {
    return (
      <div className={styles.resultWrapper}>
        <div className={styles.resultBox}>
          <div className={styles.scrollContainer}>
            <h2 className={styles.heading}>Recipes:</h2>
            {detailsError && (
              <p className={styles.recipeMatch} role="alert">
                {detailsError.message}
              </p>
            )}
            <ul className={styles.recipeList}>
              {recipes.map((recipe) => (
                <li
                  key={recipe.id}
                  className={styles.recipeItem}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleRecipeClick(recipe.id)}
                >
                  {recipe.image && (
                    <Image
                      className={styles.recipeImage}
                      src={recipe.image}
                      alt={recipe.title}
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
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
