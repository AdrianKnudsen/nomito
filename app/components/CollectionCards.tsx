import Link from "next/link";
import RecipeImage from "./RecipeImage";
import styles from "../../styles/collections.module.css";

export interface CollectionCardData {
  slug: string;
  title: string;
  description: string;
  image?: string;
}

/**
 * The collection index. The title is the link, so each link's accessible name is the
 * collection's title only; the card around it is clickable through the link's ::after.
 */
export default function CollectionCards({ collections }: { collections: CollectionCardData[] }) {
  return (
    <ul className={styles.collectionList}>
      {collections.map((collection) => (
        <li key={collection.slug} className={styles.collectionItem}>
          <span className={styles.thumb}>
            {collection.image && (
              <RecipeImage
                className={styles.image}
                src={collection.image}
                alt=""
                width={312}
                height={231}
                sizes="6rem"
              />
            )}
          </span>
          <div className={styles.text}>
            <h2 className={styles.title}>
              <Link href={`/collections/${collection.slug}`} className={styles.link}>
                {collection.title}
              </Link>
            </h2>
            <p className={styles.description}>{collection.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
