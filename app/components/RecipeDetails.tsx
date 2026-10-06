import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../../styles/recipeDetails.module.css";
import type { InstructionStep, RecipeDetail } from "@/types/spoonacular";

interface RecipeDetailsProps {
  recipe: RecipeDetail | null;
  onBack: () => void;
}

/** Første gruppes steg fra /instructions-ruta, eller tom liste om formen er en annen. */
function firstGroupSteps(data: unknown): InstructionStep[] {
  if (!Array.isArray(data)) return [];
  const first: unknown = data[0];
  if (typeof first !== "object" || first === null || !("steps" in first)) {
    return [];
  }
  return Array.isArray(first.steps) ? (first.steps as InstructionStep[]) : [];
}

export default function RecipeDetails({ recipe, onBack }: RecipeDetailsProps) {
  const [analyzedSteps, setAnalyzedSteps] = useState<InstructionStep[]>([]);
  const [readableMode, setReadableMode] = useState(false);
  const [parsedIngredients, setParsedIngredients] = useState<string[]>([]);
  const [parsedInstructions, setParsedInstructions] = useState<string[]>([]);

  useEffect(() => {
    async function fetchAnalyzedInstructions() {
      if (!recipe?.id) return;
      try {
        const res = await fetch(`/api/recipe/${recipe.id}/instructions`);
        if (!res.ok) return;
        const text = await res.text();
        let data: unknown = [];
        try {
          data = text ? JSON.parse(text) : [];
        } catch {
          data = [];
        }
        setAnalyzedSteps(firstGroupSteps(data));
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
