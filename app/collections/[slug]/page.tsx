import type { Metadata } from "next";
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
import result from "../../../styles/result.module.css";
import { COLLECTIONS, findCollection, type Collection } from "@/lib/collections";
import {
  collectionFilters,
  collectionPairs,
  isAdjusted,
  parseCollectionAdjustment,
  receivedQuery,
  toQuery,
  withQuery,
  type SearchParams,
} from "@/lib/filters";
import { recipeHrefVia } from "@/lib/links";
import { collectionFormPath } from "@/lib/routes";
import type { ViaOrigin } from "@/types/filters";

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
        {/* None of these links costs quota: the form and the unadjusted list make no call. */}
        <div className={result.resultFooter}>
          <div className={result.footerActions}>
            <Link href={withQuery(collectionFormPath(collection.slug), pairs)} className={controls.buttonBack}>
              Change choices
            </Link>
            {isAdjusted(adjustment) && (
              <Link href={`/collections/${collection.slug}`} className={controls.buttonBack}>
                Reset
              </Link>
            )}
            <Link href="/collections" className={controls.buttonBack}>
              All collections
            </Link>
          </div>
          <Disclaimer />
        </div>
      </ResultPanel>
    </>
  );
}
