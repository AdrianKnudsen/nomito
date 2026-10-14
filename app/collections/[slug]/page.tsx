import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Disclaimer from "../../components/Disclaimer";
import FilteredResults from "../../components/FilteredResults";
import Notice from "../../components/Notice";
import RecipeCards, { type RecipeCardData } from "../../components/RecipeCards";
import ResultPanel from "../../components/ResultPanel";
import controls from "../../../styles/controls.module.css";
import page from "../../../styles/page.module.css";
import { COLLECTIONS, findCollection, type Collection } from "@/lib/collections";
import {
  collectionAvoidOptions,
  collectionFilters,
  collectionPairs,
  collectionTimeOptions,
  isAdjusted,
  parseCollectionAdjustment,
  receivedQuery,
  toQuery,
  withQuery,
  type SearchParams,
} from "@/lib/filters";
import { recipeHrefVia } from "@/lib/links";
import type { CollectionAdjustment, ViaOrigin } from "@/types/filters";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

export function generateStaticParams() {
  return COLLECTIONS.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: CollectionPageProps): Promise<Metadata> {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const collection = findCollection(slug);
  if (!collection) return {};
  // From the parsed values: on a redirect this title is announced before the switch, so it has
  // to be the canonical page's already.
  const adjusted = isAdjusted(parseCollectionAdjustment(collection, search));
  return { title: adjusted ? `${collection.title} (adjusted)` : collection.title };
}

function storedCards(collection: Collection, origin: ViaOrigin): RecipeCardData[] {
  return collection.recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    href: recipeHrefVia(recipe.id, origin),
  }));
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  // generateStaticParams only prerenders the collections' slugs. The page does not export
  // dynamicParams, so the default (true) applies and any other slug still renders. The page
  // 404s itself.
  const collection = findCollection(slug);
  if (!collection) notFound();

  const adjustment = parseCollectionAdjustment(collection, search);
  const pairs = collectionPairs(adjustment);
  const query = toQuery(pairs);
  // Canonical before any call, and outside any Suspense: under a boundary redirect() answers 200
  // with a meta refresh instead of 307.
  if (query !== receivedQuery(search)) {
    redirect(withQuery(`/collections/${collection.slug}`, pairs));
  }
  const origin: ViaOrigin = { via: "collection", slug: collection.slug, ...adjustment };
  // The fallback list ignores the choices, so its cards go Back to the collection itself,
  // which is free, not to the adjusted URL that just failed.
  const bareOrigin: ViaOrigin = { via: "collection", slug: collection.slug, avoid: [] };

  return (
    <>
      <h1 tabIndex={-1} className={page.title}>
        {collection.title}
      </h1>
      <div className={page.panel}>
        {/* Keyed by the query so it remounts and shows the URL's state after Reset and after a
            redirect; otherwise the old choices stay and the next Apply pays for them. */}
        <AdjustForm key={`form-${query}`} collection={collection} adjustment={adjustment} />
        <Disclaimer />
      </div>
      <ResultPanel>
        {isAdjusted(adjustment) ? (
          <Suspense
            key={`results-${query}`}
            fallback={<Notice role="status">Loading recipes...</Notice>}
          >
            <FilteredResults
              filters={collectionFilters(collection, adjustment)}
              origin={origin}
              fallback={{
                note: "Showing the whole collection, without your choices.",
                cards: storedCards(collection, bareOrigin),
              }}
            />
          </Suspense>
        ) : (
          <RecipeCards recipes={storedCards(collection, origin)} />
        )}
      </ResultPanel>
    </>
  );
}

interface AdjustFormProps {
  collection: Collection;
  adjustment: CollectionAdjustment;
}

/** GET to the same slug. Only choices that tighten the collection are rendered. */
function AdjustForm({ collection, adjustment }: AdjustFormProps) {
  const path = `/collections/${collection.slug}`;
  return (
    <Form action={path} className={page.form}>
      <fieldset className={page.fieldset}>
        <legend className={page.legend}>Time</legend>
        {/* Empty value: "Any" is the collection's own limit, which the canonical URL drops. */}
        <label className={page.choice}>
          <input type="radio" name="time" value="" defaultChecked={adjustment.time === undefined} />
          Any
        </label>
        {collectionTimeOptions(collection).map((option) => (
          <label key={`time-${option.value}`} className={page.choice}>
            <input
              type="radio"
              name="time"
              value={option.value}
              defaultChecked={adjustment.time === option.value}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <fieldset className={page.fieldset}>
        <legend className={page.legend}>Avoid</legend>
        {collectionAvoidOptions(collection).map((option) => (
          <label key={`avoid-${option.value}`} className={page.choice}>
            <input
              type="checkbox"
              name="avoid"
              value={option.value}
              defaultChecked={adjustment.avoid.includes(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <div className={page.actions}>
        <button type="submit" className={controls.button}>
          Apply
        </button>
        {isAdjusted(adjustment) && (
          <Link href={path} className={controls.button}>
            Reset
          </Link>
        )}
      </div>
    </Form>
  );
}
