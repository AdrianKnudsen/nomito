import Image from "next/image";
import RecipeView from "./RecipeView";
import styles from "../../styles/recipeDetails.module.css";
import type { RecipeDetail } from "@/types/spoonacular";

interface Fact {
  label: string;
  value: string;
}

/** Only the fields Spoonacular actually sent; the panel drops out if there are none. */
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

interface RecipeDetailsProps {
  recipe: RecipeDetail;
  backHref: string;
}

export default function RecipeDetails({ recipe, backHref }: RecipeDetailsProps) {
  const ingredients =
    recipe.extendedIngredients?.map((ing) => ing.original || ing.name || "") ??
    [];
  const instructionGroups = (recipe.analyzedInstructions ?? []).filter(
    (group) => group.steps.length > 0
  );
  const facts = recipeFacts(recipe);

  const header = (
    <>
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
    </>
  );

  return (
    <main className={styles.resultDetailsWrapper}>
      <div className={styles.detailsBox}>
        <RecipeView backHref={backHref} header={header}>
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
              <>
                {instructionGroups.map((group, i) => (
                  <section key={`${i}-${group.name}`}>
                    {group.name && <h4>{group.name}</h4>}
                    <ol>
                      {group.steps.map((step) => (
                        <li key={step.number}>{step.step}</li>
                      ))}
                    </ol>
                  </section>
                ))}
                {/* Spoonacular's terms require crediting the source by name and link.
                    Without steps the fallback below does that, so this only shows here. */}
                {recipe.sourceUrl && (
                  <p className={styles.sourceCredit}>
                    Recipe from{" "}
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {recipe.sourceName || "the original source"}
                    </a>
                  </p>
                )}
              </>
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
        </RecipeView>
      </div>
    </main>
  );
}
