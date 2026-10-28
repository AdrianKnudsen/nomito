import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Notice from "../../components/Notice";
import RecipeDetails from "../../components/RecipeDetails";
import BackLink from "../../components/BackLink";
import SearchBar from "../../components/SearchBar";
import { parseVia, type SearchParams } from "@/lib/filters";
import { originBackTargets, type BackTargets } from "@/lib/links";
import { getRecipeDetail, SpoonacularError } from "@/lib/spoonacular";
import styles from "../../../styles/recipeDetails.module.css";
import type { RecipeDetail } from "@/types/spoonacular";

interface RecipePageProps {
  params: Promise<{ id: string }>;
  /**
   * The search the recipe was opened from, passed on by the results: `ingredients`, and
   * `missing` (ingredient ids the search reported missing, comma-separated, empty: nothing
   * missing). Or `via` with the origin's own parameters. Absent on a direct link.
   */
  searchParams: Promise<SearchParams>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** null when the page was not opened from a search, so there is nothing to compare with. */
function parseMissing(value: string | undefined): Set<number> | null {
  if (value === undefined) return null;
  const ids = value
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  return new Set(ids);
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

export default async function RecipePage({ params, searchParams }: RecipePageProps) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  // A valid origin replaces the leftovers search: no search field, no missing marks, and Back
  // goes to the origin (originBackTargets has the rule).
  const origin = parseVia(search);
  const ingredients = origin ? "" : (first(search.ingredients)?.trim() ?? "");
  const missingIds = origin ? null : parseMissing(first(search.missing));
  // Without an origin, Back goes to the search page, not wherever the user came from: without a
  // search, /search is the start. The search is not random, so history and link are one URL.
  const searchHref = ingredients
    ? `/search?${new URLSearchParams({ ingredients })}`
    : "/search";
  const back: BackTargets = origin
    ? originBackTargets(origin)
    : { href: searchHref, historyHref: searchHref };
  const searchBar = origin ? null : (
    <SearchBar key={`search-${ingredients}`} defaultValue={ingredients} />
  );

  let recipe: RecipeDetail;
  try {
    recipe = await getRecipeDetail(id);
  } catch (error) {
    if (!(error instanceof SpoonacularError)) throw error;
    if (error.apiError.status === 404) notFound();
    return (
      <>
        {searchBar}
        <div className={styles.errorBack}>
          <BackLink href={back.href} historyHref={back.historyHref} className={styles.errorBackButton} />
        </div>
        <Notice role="alert">{error.apiError.message}</Notice>
      </>
    );
  }

  return (
    <>
      {searchBar}
      <RecipeDetails recipe={recipe} back={back} missingIds={missingIds} />
    </>
  );
}
