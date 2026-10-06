import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Notice from "../../components/Notice";
import RecipeDetails from "../../components/RecipeDetails";
import SearchBar from "../../components/SearchBar";
import { getRecipeDetail, SpoonacularError } from "@/lib/spoonacular";
import type { RecipeDetail } from "@/types/spoonacular";

interface RecipePageProps {
  params: Promise<{ id: string }>;
  /** The search the recipe was opened from, passed on by the results. Absent on a direct link. */
  searchParams: Promise<{ ingredients?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const recipe = await getRecipeDetail(id);
    return { title: recipe.title };
  } catch (error) {
    // The page below shows the error; the title just falls back to the default.
    if (error instanceof SpoonacularError) return {};
    throw error;
  }
}

export default async function RecipePage({
  params,
  searchParams,
}: RecipePageProps) {
  const [{ id }, { ingredients }] = await Promise.all([params, searchParams]);
  const query = (Array.isArray(ingredients) ? ingredients[0] : ingredients)?.trim() ?? "";
  // Back goes to the search page, not wherever the user came from: without a search,
  // /search is the start.
  const backHref = query ? `/search?${new URLSearchParams({ ingredients: query })}` : "/search";

  let recipe: RecipeDetail;
  try {
    recipe = await getRecipeDetail(id);
  } catch (error) {
    if (!(error instanceof SpoonacularError)) throw error;
    if (error.apiError.status === 404) notFound();
    return (
      <>
        <SearchBar key={`search-${query}`} defaultValue={query} />
        <Notice role="alert">{error.apiError.message}</Notice>
      </>
    );
  }

  return (
    <>
      <SearchBar key={`search-${query}`} defaultValue={query} />
      <RecipeDetails recipe={recipe} backHref={backHref} />
    </>
  );
}
