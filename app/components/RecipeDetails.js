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

    const ingredientsFromExtended =
      Array.isArray(recipe.extendedIngredients) &&
      recipe.extendedIngredients.length > 0
        ? recipe.extendedIngredients.map(
            (ing) => ing.original || ing.name || ""
          )
        : [];

    if (ingredientsFromExtended.length > 0) {
      setParsedIngredients(ingredientsFromExtended);
    }

    if (Array.isArray(analyzedSteps) && analyzedSteps.length > 0) {
      setParsedInstructions(analyzedSteps.map((s) => s.step || ""));
      if (ingredientsFromExtended.length > 0) return;
    }

    const rawHtml = recipe.instructions || "";
    if (rawHtml) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");

        const lists = Array.from(doc.querySelectorAll("ul, ol"));
        let foundIngredients = [];
        let foundInstructions = [];

        for (const list of lists) {
          const items = Array.from(list.querySelectorAll("li")).map(
            (li) => li.textContent?.trim() || ""
          );
          const avgLen =
            items.reduce((a, b) => a + (b.length || 0), 0) /
            Math.max(1, items.length);
          if (
            items.length >= 3 &&
            avgLen < 100 &&
            foundIngredients.length === 0
          ) {
            foundIngredients = items;
            list.remove();
          } else {
            foundInstructions = foundInstructions.concat(items);
            list.remove();
          }
        }

        const paragraphs = Array.from(doc.querySelectorAll("p")).map(
          (p) => p.textContent?.trim() || ""
        );
        const remainingText = doc.body.textContent
          ? doc.body.textContent.trim()
          : "";

        if (
          foundIngredients.length === 0 &&
          ingredientsFromExtended.length === 0
        ) {
          const possibleIngredients = paragraphs.filter(
            (t) =>
              t.length > 0 &&
              t.split(",").length <= 6 &&
              t.split(" ").length < 10
          );
          if (possibleIngredients.length > 0) {
            foundIngredients = possibleIngredients[0]
              .split(/[\r\n,••]/)
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }

        if (foundInstructions.length === 0) {
          const instrCandidates = paragraphs.filter((p) => p.length > 30);
          if (instrCandidates.length > 0) {
            foundInstructions = instrCandidates;
          } else if (remainingText && remainingText.length > 30) {
            foundInstructions = remainingText
              .split(/\n{1,}|\.\s+/)
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }

        if (
          ingredientsFromExtended.length === 0 &&
          foundIngredients.length > 0
        ) {
          setParsedIngredients(foundIngredients);
        } else if (ingredientsFromExtended.length === 0) {
          setParsedIngredients([]);
        }

        if (Array.isArray(analyzedSteps) && analyzedSteps.length > 0) {
          // already set above
        } else if (foundInstructions.length > 0) {
          setParsedInstructions(foundInstructions);
        } else {
          setParsedInstructions([]);
        }
      } catch (err) {
        setParsedIngredients(ingredientsFromExtended);
        setParsedInstructions(
          analyzedSteps.length > 0 ? analyzedSteps.map((s) => s.step || "") : []
        );
      }
    } else {
      setParsedIngredients(ingredientsFromExtended);
      setParsedInstructions(
        analyzedSteps.length > 0
          ? analyzedSteps.map((s) => s.step || "")
          : recipe.instructions
            ? [recipe.instructions]
            : []
      );
    }
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

        <div
          className={`${styles.instructions} ${readableMode ? styles.readable : ""}`}
        >
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
    </main>
  );
}
