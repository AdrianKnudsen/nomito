import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../../styles/recipeDetails.module.css";

export default function RecipeDetails({ recipe, onBack }) {
  const [analyzedSteps, setAnalyzedSteps] = useState([]);

  useEffect(() => {
    async function fetchAnalyzedInstructions() {
      if (!recipe?.id) return;
      try {
        const res = await fetch(`/api/recipe/${recipe.id}/instructions`);
        const data = await res.json();

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
        <button className={styles.backButton} onClick={onBack}>
          Back to list
        </button>

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

        <h3 className={styles.subheading}>Ingredients:</h3>
        <ul className={styles.ingredientList}>
          {recipe.extendedIngredients?.map((ing, idx) => (
            <li key={`${ing.id}-${idx}`} className={styles.ingredientItem}>
              {ing.original}
            </li>
          ))}
        </ul>

        <h3 className={styles.subheading}>Instructions:</h3>
        <div className={styles.instructions}>
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
