import Link from "next/link";
import styles from "../../styles/footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      {/* WebKit is known to drop the list role when list-style is none outside a <nav> (reasoned,
          not measured in Safari here), so it is set explicitly. */}
      <ul className={styles.links} role="list">
        {/* No prefetch={false} on the internal links: /about is static and fetches nothing, so
            prefetching costs no quota. If /about ever gets a Spoonacular call, both links need it. */}
        <li>
          <Link href="/about" className={styles.link}>
            About
          </Link>
        </li>
        <li>
          <Link href="/about#privacy" className={styles.link}>
            Privacy
          </Link>
        </li>
        <li>
          {/* New tab with noopener noreferrer, like the source link in RecipeDetails, so nobody
              loses a recipe mid-read. Plain text, no logo or wording that suggests Spoonacular is
              behind the app. */}
          <a
            href="https://spoonacular.com/food-api"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            Recipe data: spoonacular API
          </a>
        </li>
      </ul>
    </footer>
  );
}
