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
      {/* Feltet er ukontrollert og må monteres på nytt når URL-en endres, ellers står
          forrige søk igjen etter tilbake-knappen. Nøkkelen må skille seg fra Suspense-
          søskenets: like nøkler blant søsken etterlot gamle <main>-noder i DOM-en. */}
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
