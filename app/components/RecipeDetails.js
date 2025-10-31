import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../../styles/recipeDetails.module.css";

export default function RecipeDetails({ recipe, onBack }) {
  const [analyzedSteps, setAnalyzedSteps] = useState([]);
  const [readableMode, setReadableMode] = useState(false);

  useEffect(() => {
    async function fetchAnalyzedInstructions() {
      if (!recipe?.id) return;
      try {
        const res = await fetch(`/api/recipe/${recipe.id}/instructions`);

        if (!res.ok) {
          console.warn("Failed to fetch analyzed instructions:", res.status);
          return;
        }

        let data = [];
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : [];
        } catch (err) {
          console.warn("Invalid JSON from instructions endpoint:", err);
          data = [];
        }

        if (Array.isArray(data) && data.length > 0) {
          setAnalyzedSteps(data[0].steps);
        }
      } catch (err) {
        console.error("Error fetching analyzed instructions:", err);
      }
    }
    fetchAnalyzedInstructions();
  }, [recipe]);

  if (!recipe) return null;

  return (
    <main className={styles.resultDetailsWrapper}>
      <div className={styles.detailsBox}>
        <div className={styles.buttonRow}>
          <button className={styles.actionButton} onClick={onBack}>
            Back
          </button>

          <button
            className={styles.actionButton}
            onClick={() => setReadableMode(!readableMode)}
          >
            {readableMode ? "Normal" : "Read"}
          </button>
        </div>
        <h2 className={styles.heading}>{recipe.title}</h2>
        {recipe.image && (
          <Image
            className={styles.recipeImage}
            src={recipe.image}
            alt={recipe.title}
            width={200}
            height={200}
          />
        )}

        <div
          className={`${styles.instructions} ${readableMode ? styles.readable : ""}`}
        >
          <h3 className={styles.subheading}>Ingredients:</h3>
          <ul className={styles.ingredientList}>
            {recipe.extendedIngredients?.map((ing, idx) => (
              <li key={`${ing.id}-${idx}`} className={styles.ingredientItem}>
                {ing.original}
              </li>
            ))}
          </ul>

          <h3 className={styles.subheading}>Instructions:</h3>
          {analyzedSteps.length > 0 ? (
            <ol>
              {analyzedSteps.map((step, idx) => (
                <li key={idx}>{step.step}</li>
              ))}
            </ol>
          ) : recipe.instructions ? (
            <div dangerouslySetInnerHTML={{ __html: recipe.instructions }} />
          ) : (
            <p>No instructions available.</p>
          )}
        </div>
      </div>
    </main>
  );
}
