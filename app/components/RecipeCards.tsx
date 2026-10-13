import type { ReactNode } from "react";
import Link from "next/link";
import RecipeImage from "./RecipeImage";
import styles from "../../styles/result.module.css";

export interface RecipeCardData {
  id: number;
  title: string;
  image?: string;
  href: string;
  /** Rendered under the title, where the leftovers search puts its match counts. */
  details?: ReactNode;
}

/** The card grid every entry point shares. Display only: each caller builds its own hrefs. */
export default function RecipeCards({ recipes }: { recipes: RecipeCardData[] }) {
  return (
    <ul className={styles.recipeList}>
      {recipes.map((recipe) => (
        <li key={recipe.id} className={styles.recipeItem}>
          {/* No prefetch: in production Next prefetches visible links, and for /recipe/[id]
              that runs generateMetadata — one quota point per visible card. Measured: 19 extra
              upstream calls per view of the search page. */}
          <Link href={recipe.href} prefetch={false} className={styles.recipeLink}>
            {/* The box holds the thumbnail's place and colour if the image 404s. */}
            <span className={styles.thumb}>
              {recipe.image && (
                <RecipeImage
                  className={styles.recipeImage}
                  src={recipe.image}
                  alt=""
                  width={312}
                  height={231}
                  sizes="6rem"
                />
              )}
            </span>
            <div className={styles.recipeText}>
              <span className={styles.recipeTitle}>{recipe.title}</span>
              {recipe.details}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
