import type { CSSProperties } from "react";
import styles from "../../styles/recipeDetails.module.css";
import type { Nutrient, Nutrition } from "@/types/spoonacular";

/**
 * The figures that say something about balance. Spoonacular sends 30-odd nutrients;
 * these names are the ones observed in a real response.
 */
const KEY_NUTRIENTS = [
  { name: "Calories", label: "Calories" },
  { name: "Protein", label: "Protein" },
  { name: "Carbohydrates", label: "Carbohydrates" },
  { name: "Fat", label: "Fat" },
  { name: "Saturated Fat", label: "of which saturated", sub: true },
  { name: "Fiber", label: "Fiber" },
  { name: "Sugar", label: "Sugar" },
  { name: "Sodium", label: "Sodium" },
];

interface Row {
  label: string;
  sub: boolean;
  nutrient: Nutrient;
}

function keyRows(nutrients: Nutrient[]): Row[] {
  const rows: Row[] = [];
  for (const key of KEY_NUTRIENTS) {
    const nutrient = nutrients.find((n) => n.name === key.name);
    if (nutrient) rows.push({ label: key.label, sub: key.sub ?? false, nutrient });
  }
  return rows;
}

function formatAmount({ amount, unit }: Nutrient): string {
  return `${Math.round(amount)} ${unit}`;
}

/** The share as a unitless custom property (a flex-grow factor), so the look stays in CSS. */
function share(percent: number): CSSProperties {
  return { "--share": String(percent) } as CSSProperties;
}

export default function NutritionPanel({ nutrition }: { nutrition: Nutrition }) {
  const rows = keyRows(nutrition.nutrients);
  const breakdown = nutrition.caloricBreakdown;
  // An empty panel is worse than none.
  if (rows.length === 0 && !breakdown) return null;

  const macros = breakdown
    ? [
        { label: "Protein", percent: breakdown.percentProtein, className: styles.macroProtein },
        { label: "Fat", percent: breakdown.percentFat, className: styles.macroFat },
        { label: "Carbs", percent: breakdown.percentCarbs, className: styles.macroCarbs },
      ]
    : [];

  return (
    <section className={styles.nutrition} aria-labelledby="nutrition-heading">
      <h2 id="nutrition-heading" className={styles.subheading}>
        Nutrition per serving
      </h2>

      {breakdown && (
        <figure className={styles.macroFigure}>
          {/* The legend carries the same numbers as text, so the bar itself is hidden
              from screen readers. */}
          <div className={styles.macroBar} aria-hidden="true">
            {macros.map((m) => (
              <span key={m.label} className={m.className} style={share(m.percent)} />
            ))}
          </div>
          <figcaption className={styles.macroLegend}>
            <span className={styles.macroLegendTitle}>Calories from</span>
            {macros.map((m) => (
              <span key={m.label} className={`${styles.macroKey} ${m.className}`}>
                {m.label} {Math.round(m.percent)}%
              </span>
            ))}
          </figcaption>
        </figure>
      )}

      {rows.length > 0 && (
        <table className={styles.nutrientTable}>
          <thead>
            <tr>
              <th scope="col">Nutrient</th>
              <th scope="col">Amount</th>
              <th scope="col">Daily value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, sub, nutrient }) => (
              <tr key={nutrient.name} className={sub ? styles.subRow : undefined}>
                <th scope="row">{label}</th>
                <td>{formatAmount(nutrient)}</td>
                <td>
                  {nutrient.percentOfDailyNeeds !== undefined
                    ? `${Math.round(nutrient.percentOfDailyNeeds)}%`
                    : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
