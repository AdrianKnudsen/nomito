import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../../styles/recipeDetails.module.css";

export default function RecipeDetails({ recipe, onBack }) {
  const [analyzedSteps, setAnalyzedSteps] = useState([]);
  const [readableMode, setReadableMode] = useState(false);
  const [parsedIngredients, setParsedIngredients] = useState([]);
  const [parsedInstructions, setParsedInstructions] = useState([]);

  useEffect(() => {
    async function fetchAnalyzedInstructions() {
      if (!recipe?.id) return;
      try {
        const res = await fetch(`/api/recipe/${recipe.id}/instructions`);
        if (!res.ok) return;
        const text = await res.text();
        let data = [];
        try {
          data = text ? JSON.parse(text) : [];
        } catch {
          data = [];
        }
        if (
          Array.isArray(data) &&
          data.length > 0 &&
          Array.isArray(data[0].steps)
        ) {
          setAnalyzedSteps(data[0].steps);
        } else {
          setAnalyzedSteps([]);
        }
      } catch (err) {
        console.error(err);
        setAnalyzedSteps([]);
      }
    }
    fetchAnalyzedInstructions();
  }, [recipe]);

  useEffect(() => {
    if (!recipe) {
      setParsedIngredients([]);
      setParsedInstructions([]);
      return;
    }

    const ingredients =
      recipe.extendedIngredients?.map(
        (ing) => ing.original || ing.name || ""
      ) || [];

    const instructions =
      analyzedSteps.length > 0
        ? analyzedSteps.map((s) => s.step || "")
        : recipe.instructions
          ? [recipe.instructions.replace(/<\/?[^>]+(>|$)/g, "")]
          : [];

    setParsedIngredients(ingredients);
    setParsedInstructions(instructions);
  }, [recipe, analyzedSteps]);

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
            width={320}
            height={480}
          />
        )}

        <div
          className={`${styles.contentSection} ${readableMode ? styles.readable : ""}`}
        >
          <ul className={styles.ingredientList}>
            <h3 className={styles.subheading}>Ingredients:</h3>
            {parsedIngredients.length > 0 ? (
              parsedIngredients.map((ing, i) => (
                <li key={i} className={styles.ingredientItem}>
                  {ing}
                </li>
              ))
            ) : (
              <li className={styles.ingredientItem}>
                No ingredient list available.
              </li>
            )}
          </ul>

          <div className={styles.instructions}>
            <h3 className={styles.subheading}>Instructions:</h3>
            {parsedInstructions.length > 0 ? (
              <ol>
                {parsedInstructions.map((instr, i) => (
                  <li key={i}>{instr}</li>
                ))}
              </ol>
            ) : recipe.instructions ? (
              <div dangerouslySetInnerHTML={{ __html: recipe.instructions }} />
            ) : (
              <p>No instructions available.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
