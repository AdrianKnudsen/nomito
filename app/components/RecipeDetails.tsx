import { useState } from "react";
import Image from "next/image";
import styles from "../../styles/recipeDetails.module.css";
import type { RecipeDetail } from "@/types/spoonacular";

interface RecipeDetailsProps {
  recipe: RecipeDetail | null;
  onBack: () => void;
}

interface Fact {
  label: string;
  value: string;
}

/** Bare feltene Spoonacular faktisk sendte; panelet faller bort om ingen finnes. */
function recipeFacts(recipe: RecipeDetail): Fact[] {
  const facts: Fact[] = [];
  if (recipe.readyInMinutes !== undefined) {
    facts.push({ label: "Ready in", value: `${recipe.readyInMinutes} min` });
  }
  if (recipe.servings !== undefined) {
    facts.push({ label: "Servings", value: String(recipe.servings) });
  }
  if (recipe.healthScore !== undefined) {
    facts.push({ label: "Health score", value: `${recipe.healthScore} / 100` });
  }
  if (recipe.diets && recipe.diets.length > 0) {
    facts.push({ label: "Diets", value: recipe.diets.join(", ") });
  }
  return facts;
}

export default function RecipeDetails({ recipe, onBack }: RecipeDetailsProps) {
  const [readableMode, setReadableMode] = useState(false);

  if (!recipe) return null;

  const ingredients =
    recipe.extendedIngredients?.map((ing) => ing.original || ing.name || "") ??
    [];
  const instructionGroups = (recipe.analyzedInstructions ?? []).filter(
    (group) => group.steps.length > 0
  );
  const facts = recipeFacts(recipe);

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

        {facts.length > 0 && (
          <dl className={styles.facts}>
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

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
            {ingredients.length > 0 ? (
              ingredients.map((ing, i) => (
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
            {instructionGroups.length > 0 ? (
              instructionGroups.map((group, i) => (
                <section key={`${i}-${group.name}`}>
                  {group.name && <h4>{group.name}</h4>}
                  <ol>
                    {group.steps.map((step) => (
                      <li key={step.number}>{step.step}</li>
                    ))}
                  </ol>
                </section>
              ))
            ) : recipe.sourceUrl ? (
              <p>
                Full instructions at{" "}
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {recipe.sourceName || "the original recipe"}
                </a>
                .
              </p>
            ) : (
              <p>No instructions available.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
