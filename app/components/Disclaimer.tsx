import Link from "next/link";
import styles from "../../styles/disclaimer.module.css";

/**
 * The short disclaimer Spoonacular's terms require next to recipes, nutrition and prices. The
 * full text is on About, under #disclaimer. A Link, not an <a>: next build's lint rejects a
 * plain <a> to an app page.
 */
export default function Disclaimer() {
  return (
    <p className={styles.disclaimer}>
      Recipes, nutrition, allergens and prices are estimates from Spoonacular. Always read the
      ingredients yourself, especially if you have an allergy.{" "}
      <Link href="/#disclaimer">Read more</Link>
    </p>
  );
}
