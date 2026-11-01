import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SubmitOnce from "../../../components/SubmitOnce";
import controls from "../../../../styles/controls.module.css";
import page from "../../../../styles/page.module.css";
import { COLLECTIONS, findCollection, type Collection } from "@/lib/collections";
import {
  collectionAvoidOptions,
  collectionPairs,
  collectionTimeOptions,
  isAdjusted,
  parseCollectionAdjustment,
  receivedQuery,
  toQuery,
  withQuery,
  type SearchParams,
} from "@/lib/filters";
import { collectionFormPath } from "@/lib/routes";
import type { CollectionAdjustment } from "@/types/filters";

interface AdjustCollectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

export function generateStaticParams() {
  return COLLECTIONS.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: AdjustCollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = findCollection(slug);
  if (!collection) return {};
  return { title: `Adjust · ${collection.title}` };
}

export default async function AdjustCollectionPage({
  params,
  searchParams,
}: AdjustCollectionPageProps) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const collection = findCollection(slug);
  if (!collection) notFound();

  const adjustment = parseCollectionAdjustment(collection, search);
  const pairs = collectionPairs(adjustment);
  const query = toQuery(pairs);
  // Reads the query only to preselect the form, and makes no call, so the redirect is free.
  if (query !== receivedQuery(search)) {
    redirect(withQuery(collectionFormPath(collection.slug), pairs));
  }

  return (
    <>
      <h1 tabIndex={-1} className={page.title}>
        {collection.title}
      </h1>
      <div className={page.panel}>
        {/* Keyed by the query so it remounts and shows the URL's state after a redirect;
            otherwise the old choices stay and the next Apply pays for them. */}
        <AdjustForm key={`form-${query}`} collection={collection} adjustment={adjustment} />
      </div>
    </>
  );
}

interface AdjustFormProps {
  collection: Collection;
  adjustment: CollectionAdjustment;
}

/** GET to the collection's list. Only choices that tighten the collection are rendered. */
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
      <div className={page.formActions}>
        <SubmitOnce className={controls.buttonAccent}>Apply</SubmitOnce>
        {isAdjusted(adjustment) && (
          <Link href={path} className={controls.buttonBack}>
            Reset
          </Link>
        )}
      </div>
    </Form>
  );
}
