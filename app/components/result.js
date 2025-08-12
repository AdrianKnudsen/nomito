"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchRecipes } from "./api";
import styles from "..//../styles/result.module.css";

export default function Result({ ingredients }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!ingredients || ingredients.trim() === "") return;

      setLoading(true);
      try {
        const data = await fetchRecipes(ingredients);
        setRecipes(data);
        setHasSearched(true);
      } catch (error) {
        console.error("Error fetching recipes:", error);
        setRecipes([]);
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [ingredients]);

  if (loading) {
    return <p className={styles.loading}>Loading recipes...</p>;
  }

  if (recipes.length === 0 && hasSearched) {
    return <p className={styles.loading}>No recipes found.</p>;
  }

  if (hasSearched === true && recipes.length > 0) {
    return (
      <div className={styles.background}>
        <h2 className={styles.heading}>Recipes:</h2>
        <ul className={styles.recipeList}>
          {recipes.map((recipe) => (
            <li key={recipe.id} className={styles.recipeItem}>
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
    );
  }

  return null;
}
