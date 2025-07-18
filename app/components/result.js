"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchRecipes } from "./api";

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
    return <p>Loading recipes...</p>;
  }

  if (recipes.length === 0 && hasSearched) {
    return <p>No recipes found.</p>;
  }

  if (hasSearched === true && recipes.length > 0) {
    return (
      <div>
        <h2>Recipes:</h2>
        <ul>
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <strong>{recipe.title}</strong>
              {recipe.image && (
                <Image
                  src={recipe.image}
                  alt={recipe.title}
                  width={100}
                  height={100}
                  style={{ objectFit: "cover" }}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
