import BackLink from "./BackLink";
import RecipeImage from "./RecipeImage";
import { largestRecipeImage } from "@/lib/spoonacular";
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

  return (
    <main className={styles.resultDetailsWrapper}>
      <article className={styles.sheet}>
        <div className={styles.buttonRow}>
          <BackLink href={backHref} className={styles.actionButton} />
        </div>

        <h1 className={styles.heading}>{recipe.title}</h1>

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

        {/* The figure keeps its aspect ratio and placeholder surface even when the image
            fails, so the sheet's layout never depends on Spoonacular's CDN. */}
        <figure className={styles.hero}>
          {recipe.image && (
            <RecipeImage
              className={styles.heroImage}
              src={largestRecipeImage(recipe.image)}
              alt={recipe.title}
              width={636}
              height={393}
              sizes="(min-width: 80rem) 100rem, 100vw"
            />
          )}
        </figure>

        <div className={styles.spread}>
          <section
            className={styles.ingredients}
            aria-labelledby="ingredients-heading"
          >
            <h2 id="ingredients-heading" className={styles.subheading}>
              Ingredients
            </h2>
            {ingredients.length > 0 ? (
              <ul className={styles.ingredientList}>
                {ingredients.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            ) : (
              <p>No ingredient list available.</p>
            )}
          </section>

          <section
            className={styles.instructions}
            aria-labelledby="instructions-heading"
          >
            <h2 id="instructions-heading" className={styles.subheading}>
              Instructions
            </h2>
            {instructionGroups.length > 0 ? (
              <>
                {instructionGroups.map((group, i) => (
                  <div key={`${i}-${group.name}`} className={styles.stepGroup}>
                    {group.name && (
                      <h3 className={styles.groupHeading}>{group.name}</h3>
                    )}
                    <ol className={styles.steps}>
                      {group.steps.map((step) => (
                        <li key={step.number}>{step.step}</li>
                      ))}
                    </ol>
                  </div>
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
          </section>
        </div>
      </article>
    </main>
  );
}
