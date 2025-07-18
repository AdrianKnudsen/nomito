"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchRecipes } from "./api";

export default function Result({ ingredients }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchRecipes(ingredients);
        setRecipes(data);
      } catch (error) {
        console.error("Error fetching recipes:", error);
      } finally {
        setLoading(false);
      }
    }

    if (ingredients && ingredients.trim() !== "") {
      loadData();
    }
  }, [ingredients]);

  if (!ingredients || ingredients.trim() === "") {
    return <p>I think you forgot something...</p>;
  }

  if (loading) return <p>Loading recipes...</p>;

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
