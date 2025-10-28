"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchRecipes } from "./api";
import RecipeDetails from "./RecipeDetails";
import styles from "../../styles/result.module.css";

export default function Result({ ingredients, resetTrigger }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const wrapper = document.querySelector(`.${styles.scrollContainer}`);
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
      try {
        const data = await fetchRecipes(ingredients);
        setRecipes(data);
        setHasSearched(true);
      } catch (error) {
        setRecipes([]);
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [ingredients]);

  useEffect(() => {
    setRecipes([]);
    setHasSearched(false);
    setSelectedRecipe(null);
  }, [resetTrigger]);

  const handleRecipeClick = async (id) => {
    setDetailsLoading(true);
    const res = await fetch(`/api/recipe/${id}`);
    const data = await res.json();
    setSelectedRecipe(data);
    setDetailsLoading(false);
  };

  if (loading) {
    return <p className={styles.loading}>Loading recipes...</p>;
  }

  if (recipes.length === 0 && hasSearched) {
    return <p className={styles.loading}>No recipes found.</p>;
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
                  <span className={styles.recipeTitle}>{recipe.title}</span>
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
