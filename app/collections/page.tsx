import type { Metadata } from "next";
import CollectionCards from "../components/CollectionCards";
import Disclaimer from "../components/Disclaimer";
import ResultPanel from "../components/ResultPanel";
import page from "../../styles/page.module.css";
import { COLLECTIONS } from "@/lib/collections";
import { titleFor } from "@/lib/routes";

export const metadata: Metadata = { title: titleFor("/collections") };

/** Static and free: the cards come from the stored lists. */
export default function CollectionsPage() {
  return (
    <>
      <h1 tabIndex={-1} className={page.title}>
        Collections
      </h1>
      <ResultPanel>
        {/* The collections claim protein, calories, price and diet. */}
        <Disclaimer />
        <CollectionCards
          collections={COLLECTIONS.map((collection) => ({
            slug: collection.slug,
            title: collection.title,
            description: collection.description,
            image: collection.recipes[0]?.image,
          }))}
        />
      </ResultPanel>
    </>
  );
}
