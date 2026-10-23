import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Disclaimer from "../../components/Disclaimer";
import NewPlanLink from "../../components/NewPlanLink";
import Notice from "../../components/Notice";
import PlanFraming from "../../components/PlanFraming";
import RecipeCards from "../../components/RecipeCards";
import ResultPanel from "../../components/ResultPanel";
import controls from "../../../styles/controls.module.css";
import page from "../../../styles/page.module.css";
import result from "../../../styles/result.module.css";
import {
  parsePlanRequest,
  planChoicesPairs,
  planHeading,
  planLabel,
  planRequestPairs,
  planTargets,
  receivedQuery,
  toQuery,
  withoutRepeats,
  withQuery,
  type SearchParams,
} from "@/lib/filters";
import { recipeHrefVia } from "@/lib/links";
import { titleFor } from "@/lib/routes";
import { searchRecipes, SpoonacularError } from "@/lib/spoonacular";
import type { PlanRequest, ViaOrigin } from "@/types/filters";
import type { ApiErrorKind, RecipeSummary } from "@/types/spoonacular";

interface PlanResultsPageProps {
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  searchParams,
}: PlanResultsPageProps): Promise<Metadata> {
  const request = parsePlanRequest(await searchParams);
  // Different from /plan's "Day plan", and per round, so every transition is announced.
  const title =
    request.meals.length === 0
      ? "Choose meals"
      : request.round > 1
        ? `Plan ${request.round}`
        : "Your plan";
  return { title: `${title} · ${titleFor("/plan")}` };
}

export default async function PlanResultsPage({ searchParams }: PlanResultsPageProps) {
  const search = await searchParams;
  const request = parsePlanRequest(search);
  const pairs = planRequestPairs(request);
  const query = toQuery(pairs);
  if (query !== receivedQuery(search)) redirect(withQuery("/plan/results", pairs));

  const changeHref = withQuery("/plan", planChoicesPairs(request));

  if (request.meals.length === 0) {
    return (
      <>
        <h1 tabIndex={-1} className={page.title}>
          Choose at least one meal
        </h1>
        <div className={page.panel}>
          <Link href={changeHref} className={controls.button}>
            Choose meals
          </Link>
        </div>
      </>
    );
  }

  // Started once: the results and the New plan slot await the same promise, so nothing else
  // searches. The flag returns the same calories per hit and costs less than the calorie filters
  // alone (measured), so it is always sent.
  const searches: Searches = Promise.allSettled(
    planTargets(request).map((target) =>
      searchRecipes(target.filters, { count: 3, addRecipeNutrition: true })
    )
  );

  const nextHref = withQuery(
    "/plan/results",
    planRequestPairs({ ...request, round: request.round + 1 })
  );

  return (
    <>
      <h1 tabIndex={-1} className={page.title}>
        {planHeading(request)}
      </h1>
      <div className={page.panel}>
        <PlanFraming />
        <Disclaimer />
        <div className={page.actions}>
          {/* The link only exists once the plan has arrived. The Suspense key gives each round a
              fresh link, because without it React keeps the old one through the transition. */}
          <Suspense
            key={`link-${query}`}
            fallback={<span className={controls.button}>New plan</span>}
          >
            <NewPlanSlot searches={searches} href={nextHref} className={controls.button} />
          </Suspense>
          <span className={page.note}>Each new plan uses quota</span>
          <Link href={changeHref} className={controls.button}>
            Change choices
          </Link>
        </div>
      </div>
      <ResultPanel>
        <Suspense
          key={`results-${query}`}
          fallback={<Notice role="status">Loading recipes...</Notice>}
        >
          <PlanResults request={request} searches={searches} />
        </Suspense>
      </ResultPanel>
    </>
  );
}

/** The first of these among the failures is the one shown. */
const ERROR_ORDER: readonly ApiErrorKind[] = ["quota", "auth", "rateLimit", "network", "unknown"];

/** The hit's own calories, when Spoonacular sent them. Approximate, like everything here. */
function PlanCalories({ recipe }: { recipe: RecipeSummary }) {
  const calories = recipe.nutrition?.nutrients.find((n) => n.name === "Calories");
  if (!calories) return null;
  return <span className={result.recipeMatch}>≈ {Math.round(calories.amount)} kcal</span>;
}

type Searches = Promise<PromiseSettledResult<RecipeSummary[]>[]>;

interface NewPlanSlotProps {
  searches: Searches;
  href: string;
  className: string;
}

/**
 * Holds back the link until the plan is in, so a press cannot start another plan while this one
 * loads.
 */
async function NewPlanSlot({ searches, href, className }: NewPlanSlotProps) {
  await searches;
  return <NewPlanLink href={href} className={className} />;
}

interface PlanResultsProps {
  request: PlanRequest;
  searches: Searches;
}

// Starts no searches of its own: it only awaits the ones the page started.
async function PlanResults({ request, searches }: PlanResultsProps) {
  const targets = planTargets(request);
  const settled = await searches;

  const found: RecipeSummary[][] = [];
  const errors: SpoonacularError[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      found.push(outcome.value);
      continue;
    }
    const reason: unknown = outcome.reason;
    // A rejection that is not upstream is a bug, as everywhere else.
    if (!(reason instanceof SpoonacularError)) throw reason;
    errors.push(reason);
  }

  if (errors.length > 0) {
    // One message for the page and no half plan. Every call is paid by now either way.
    const [shown] = ERROR_ORDER.flatMap((kind) =>
      errors.filter((error) => error.apiError.kind === kind)
    );
    return <Notice role="alert">{shown.apiError.message}</Notice>;
  }

  const origin: ViaOrigin = { via: "plan", ...request };
  const meals = withoutRepeats(found);
  return targets.map((target, i) => (
    <section key={`meal-${target.meal}`}>
      <h2 className={result.heading}>
        {planLabel(target.meal)} · ≈ {target.kcal} kcal
      </h2>
      {meals[i].length > 0 ? (
        <RecipeCards
          recipes={meals[i].map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            image: recipe.image,
            href: recipeHrefVia(recipe.id, origin),
            details: <PlanCalories recipe={recipe} />,
          }))}
        />
      ) : (
        <p>No recipe matched this meal</p>
      )}
    </section>
  ));
}
