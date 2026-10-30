import BackLink from "./BackLink";
import Disclaimer from "./Disclaimer";
import NutritionPanel from "./NutritionPanel";
import RecipeImage from "./RecipeImage";
import Substitutes from "./Substitutes";
import { creativeCommonsUrl, licenseAuthor } from "@/lib/credits";
import { largestRecipeImage } from "@/lib/spoonacular";
import type { BackTargets } from "@/lib/links";
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

/** The source's name, else its host, so the link prefers either over a bare "original source". */
function sourceLabel(sourceName: string | undefined, sourceUrl: string): string | undefined {
  const name = typeof sourceName === "string" ? sourceName.trim() : "";
  if (name) return name;
  if (!URL.canParse(sourceUrl)) return undefined;
  const host = new URL(sourceUrl).hostname;
  return host || undefined;
}

interface RecipeDetailsProps {
  recipe: RecipeDetail;
  /** Back's link and history targets, from the recipe page. */
  back: BackTargets;
  /** What the search reported missing. null on a direct link: nothing to compare with. */
  missingIds: Set<number> | null;
}

/** Ingredient count for the heading: only once we know what the user has. */
function missingSummary(count: number): string {
  return count === 0 ? "you have everything" : `missing ${count}`;
}

export default function RecipeDetails({
  recipe,
  back,
  missingIds,
}: RecipeDetailsProps) {
  // Distinct ids, as the card counts them: a recipe can list the same ingredient twice. The
  // first listing of each gets the Substitutes button, so one id is looked up once.
  const missingSeen = new Set<number>();
  const ingredients = (recipe.extendedIngredients ?? []).map((ing) => {
    const missing = missingIds?.has(ing.id) ?? false;
    const firstMissing = missing && !missingSeen.has(ing.id);
    if (firstMissing) missingSeen.add(ing.id);
    return {
      id: ing.id,
      text: ing.original || ing.name || "",
      name: ing.name || ing.original || "",
      missing,
      substitutes: firstMissing,
    };
  });
  const missingCount = missingSeen.size;
  const instructionGroups = (recipe.analyzedInstructions ?? []).filter(
    (group) => group.steps.length > 0
  );
  const facts = recipeFacts(recipe);
  const license = typeof recipe.license === "string" ? recipe.license.trim() : "";
  const licenseUrl = license ? creativeCommonsUrl(license) : undefined;
  const author = licenseAuthor(recipe.creditsText, recipe.sourceName, recipe.sourceUrl);

  return (
    <div className={styles.resultDetailsWrapper}>
      <article className={styles.sheet}>
        <div className={styles.buttonRow}>
          <BackLink href={back.href} historyHref={back.historyHref} className={styles.actionButton} />
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

        {/* Its own element after the facts, always: a <p> inside the <dl> could not be moved
            out with CSS, and the disclaimer applies whether or not there are facts. */}
        <Disclaimer />

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
              sizes="(min-width: 48rem) 54rem, 100vw"
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
              {missingIds && (
                <span className={styles.missingSummary}>
                  {" · "}
                  {missingSummary(missingCount)}
                </span>
              )}
            </h2>
            {ingredients.length > 0 ? (
              <ul className={styles.ingredientList}>
                {ingredients.map((ing, i) => (
                  <li key={i}>
                    {ing.text}
                    {/* Text, not just colour, so the mark survives without colour vision. */}
                    {ing.missing && (
                      <span className={styles.missingTag}>missing</span>
                    )}
                    {ing.substitutes && (
                      <Substitutes key={`subs-${ing.id}`} id={ing.id} name={ing.name} />
                    )}
                  </li>
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
                      {sourceLabel(recipe.sourceName, recipe.sourceUrl) ?? "the original source"}
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
                  {sourceLabel(recipe.sourceName, recipe.sourceUrl) ?? "the original recipe"}
                </a>
                .
              </p>
            ) : (
              <p>No instructions available.</p>
            )}
            {/* After the ternary, apart from the source credit: it shows in all three branches, and
                a license asks for its terms and the author, which the source credit does not give. */}
            {license && (
              <p className={styles.sourceCredit}>
                {author && <>By {author}. </>}
                Licensed under{" "}
                {licenseUrl ? (
                  <a href={licenseUrl} target="_blank" rel="noopener noreferrer">
                    {license}
                  </a>
                ) : (
                  license
                )}
                .
              </p>
            )}
          </section>
        </div>

        {/* Outside the spread: the sticky ingredients would otherwise slide down over it,
            since sticky follows the grid container, not the grid cell. */}
        {recipe.nutrition && <NutritionPanel nutrition={recipe.nutrition} />}
      </article>
    </div>
  );
}
