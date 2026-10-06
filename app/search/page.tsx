import type { Metadata } from "next";
import { Suspense } from "react";
import Notice from "../components/Notice";
import RecipeList from "../components/RecipeList";
import SearchBar from "../components/SearchBar";

export const metadata: Metadata = { title: "Recipes by Ingredients" };

interface SearchPageProps {
  searchParams: Promise<{ ingredients?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { ingredients } = await searchParams;
  const query = (Array.isArray(ingredients) ? ingredients[0] : ingredients)?.trim() ?? "";

  return (
    <>
      {/* The field is uncontrolled and must remount when the URL changes, or the previous
          search stays after the back button. The key must differ from the Suspense
          sibling's: equal keys among siblings left stale <main> nodes in the DOM. */}
      <SearchBar key={`search-${query}`} defaultValue={query} />
      {query && (
        <Suspense
          key={query}
          fallback={<Notice role="status">Loading recipes...</Notice>}
        >
          <RecipeList ingredients={query} />
        </Suspense>
      )}
    </>
  );
}
