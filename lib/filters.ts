/**
 * Parsers and canonical builders for every page that reads its query, and parseVia.
 *
 * Server only: nothing with "use client" imports this file. Imports are relative so the unit
 * tests can run the compiled output with plain Node.
 */

import type {
  AvoidValue,
  CalorieTarget,
  CollectionAdjustment,
  CollectionTime,
  CompleteGuideAnswers,
  GoalAnswer,
  GuideAnswers,
  MealAnswer,
  PlanChoices,
  PlanMeal,
  PlanRequest,
  TimeAnswer,
  ViaOrigin,
} from "../types/filters";
import type { Diet, Intolerance, MealType, RecipeFilters } from "../types/spoonacular";
import { findCollection, type Collection } from "./collections";
import { isVia } from "./routes";

export type SearchParams = Record<string, string | string[] | undefined>;
type Param = SearchParams[string];
export type QueryPairs = [string, string][];

function values(param: Param): string[] {
  if (param === undefined) return [];
  return Array.isArray(param) ? param : [param];
}

export function toQuery(pairs: QueryPairs): string {
  return new URLSearchParams(pairs).toString();
}

export function withQuery(path: string, pairs: QueryPairs): string {
  const query = toQuery(pairs);
  return query ? `${path}?${query}` : path;
}

/** The query as the page received it, to compare with the canonical one. */
export function receivedQuery(params: SearchParams): string {
  const pairs: QueryPairs = [];
  for (const [key, value] of Object.entries(params)) {
    for (const v of values(value)) pairs.push([key, v]);
  }
  return toQuery(pairs);
}

export interface Option<T extends string> {
  value: T;
  label: string;
}

/** The first given value that is allowed. A single-value parameter ignores the rest. */
function firstOf<T extends string>(param: Param, allowed: readonly T[]): T | undefined {
  for (const value of values(param)) {
    const match = allowed.find((a) => a === value);
    if (match !== undefined) return match;
  }
  return undefined;
}

/**
 * Every allowed value given, deduplicated, in the order of `allowed`. That is the form's order,
 * so a submitted form lands on the canonical URL without a redirect.
 */
function allOf<T extends string>(param: Param, allowed: readonly T[]): T[] {
  const given = new Set(values(param));
  return allowed.filter((a) => given.has(a));
}

function valuesOf<T extends string>(options: readonly Option<T>[]): T[] {
  return options.map((option) => option.value);
}

export function labelOf<T extends string>(options: readonly Option<T>[], value: T): string {
  const option = options.find((o) => o.value === value);
  // Values are parsed against the same lists, so a miss is a bug.
  if (!option) throw new Error(`No label for ${value}`);
  return option.label;
}

/** The labels say what is avoided; the values describe the filter. Same labels in every form. */
export const AVOID_OPTIONS: readonly Option<AvoidValue>[] = [
  { value: "vegetarian", label: "Meat" },
  { value: "vegan", label: "All animal products" },
  { value: "gluten-free", label: "Gluten" },
  { value: "dairy-free", label: "Dairy" },
];

const AVOID_SUMMARY: readonly Option<AvoidValue>[] = [
  { value: "vegetarian", label: "No meat" },
  { value: "vegan", label: "No animal products" },
  { value: "gluten-free", label: "No gluten" },
  { value: "dairy-free", label: "No dairy" },
];

export function avoidSummary(avoid: readonly AvoidValue[]): string[] {
  return avoid.map((value) => labelOf(AVOID_SUMMARY, value));
}

/** Vegan already rules out meat, so vegetarian is dropped next to it, everywhere. */
function parseAvoid(
  param: Param,
  allowed: readonly AvoidValue[] = valuesOf(AVOID_OPTIONS)
): AvoidValue[] {
  const avoid = allOf(param, allowed);
  return avoid.includes("vegan") ? avoid.filter((v) => v !== "vegetarian") : avoid;
}

function avoidPairs(avoid: readonly AvoidValue[]): QueryPairs {
  return avoid.map((value): [string, string] => ["avoid", value]);
}

const DIET_ORDER: readonly Diet[] = ["vegetarian", "vegan"];
const INTOLERANCE_ORDER: readonly Intolerance[] = ["gluten", "dairy"];

/**
 * What the avoid answers add to a search, merged with what it already has. Gluten and dairy go
 * through `intolerances`, so "avoid" has one mechanism; there is no dairy diet.
 */
function applyAvoid(filters: RecipeFilters, avoid: readonly AvoidValue[]): RecipeFilters {
  const diet = new Set<Diet>(filters.diet);
  const intolerances = new Set<Intolerance>(filters.intolerances);
  for (const value of avoid) {
    if (value === "vegetarian" || value === "vegan") diet.add(value);
    if (value === "gluten-free") intolerances.add("gluten");
    if (value === "dairy-free") intolerances.add("dairy");
  }
  const result: RecipeFilters = { ...filters };
  if (diet.size > 0) result.diet = DIET_ORDER.filter((d) => diet.has(d));
  if (intolerances.size > 0) {
    result.intolerances = INTOLERANCE_ORDER.filter((i) => intolerances.has(i));
  }
  return result;
}

export const TIME_OPTIONS: readonly Option<CollectionTime>[] = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
];

/**
 * Only the times that tighten the collection. A looser one would be dropped by the canonical
 * URL, so it is never offered and can never vanish silently.
 */
export function collectionTimeOptions(collection: Collection): readonly Option<CollectionTime>[] {
  const max = collection.filters.maxReadyTime;
  return max === undefined ? TIME_OPTIONS : TIME_OPTIONS.filter((o) => Number(o.value) < max);
}

/** Likewise, only what the collection does not already rule out. */
export function collectionAvoidOptions(collection: Collection): readonly Option<AvoidValue>[] {
  const diet = collection.filters.diet ?? [];
  const intolerances = collection.filters.intolerances ?? [];
  const covered = (value: AvoidValue): boolean => {
    switch (value) {
      case "vegetarian":
        return diet.includes("vegetarian") || diet.includes("vegan");
      case "vegan":
        return diet.includes("vegan");
      case "gluten-free":
        return intolerances.includes("gluten");
      case "dairy-free":
        return intolerances.includes("dairy");
    }
  };
  return AVOID_OPTIONS.filter((option) => !covered(option.value));
}

export function parseCollectionAdjustment(
  collection: Collection,
  params: SearchParams
): CollectionAdjustment {
  const time = firstOf(params.time, valuesOf(collectionTimeOptions(collection)));
  const avoid = parseAvoid(params.avoid, valuesOf(collectionAvoidOptions(collection)));
  return time === undefined ? { avoid } : { time, avoid };
}

export function isAdjusted(adjustment: CollectionAdjustment): boolean {
  return adjustment.time !== undefined || adjustment.avoid.length > 0;
}

/** In the form's order: time, then avoid. */
export function collectionPairs(adjustment: CollectionAdjustment): QueryPairs {
  const pairs: QueryPairs = [];
  if (adjustment.time !== undefined) pairs.push(["time", adjustment.time]);
  return [...pairs, ...avoidPairs(adjustment.avoid)];
}

/** The collection's own type and sort stay; time is the lower of the two, diets are ANDed. */
export function collectionFilters(
  collection: Collection,
  adjustment: CollectionAdjustment
): RecipeFilters {
  const filters: RecipeFilters = { ...collection.filters };
  if (adjustment.time !== undefined) {
    const time = Number(adjustment.time);
    const own = collection.filters.maxReadyTime;
    filters.maxReadyTime = own === undefined ? time : Math.min(time, own);
  }
  return applyAvoid(filters, adjustment.avoid);
}

/** The first given slug that names a collection. */
function firstCollection(param: Param): Collection | undefined {
  for (const value of values(param)) {
    const collection = findCollection(value);
    if (collection) return collection;
  }
  return undefined;
}

export const MEAL_OPTIONS: readonly Option<MealAnswer>[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

/** "any" is a real answer here and stays in the URL; collections do not offer it. */
export const GUIDE_TIME_OPTIONS: readonly Option<TimeAnswer>[] = [
  ...TIME_OPTIONS,
  { value: "any", label: "Doesn't matter" },
];

export const GOAL_OPTIONS: readonly Option<GoalAnswer>[] = [
  { value: "healthy", label: "Something healthy" },
  { value: "good", label: "Something good" },
  { value: "surprise", label: "Surprise me" },
];

export type GuideStep = 1 | 2 | 3 | 4;

const GUIDE_QUESTIONS = [
  "Which meal?",
  "How much time?",
  "What are you after?",
  "Anything to avoid?",
] as const;

export function guideQuestion(step: GuideStep): string {
  return GUIDE_QUESTIONS[step - 1];
}

export function parseGuideAnswers(params: SearchParams): GuideAnswers {
  const answers: GuideAnswers = { avoid: parseAvoid(params.avoid) };
  const meal = firstOf(params.meal, valuesOf(MEAL_OPTIONS));
  const time = firstOf(params.time, valuesOf(GUIDE_TIME_OPTIONS));
  const goal = firstOf(params.goal, valuesOf(GOAL_OPTIONS));
  if (meal) answers.meal = meal;
  if (time) answers.time = time;
  if (goal) answers.goal = goal;
  return answers;
}

/**
 * Every valid answer stays, including answers to later steps than the one shown. Dropping them
 * gave double redirects; keeping them means no valid state redirects again.
 */
export function guidePairs(answers: GuideAnswers): QueryPairs {
  const pairs: QueryPairs = [];
  if (answers.meal) pairs.push(["meal", answers.meal]);
  if (answers.time) pairs.push(["time", answers.time]);
  if (answers.goal) pairs.push(["goal", answers.goal]);
  return [...pairs, ...avoidPairs(answers.avoid)];
}

export function completeGuideAnswers(answers: GuideAnswers): CompleteGuideAnswers | null {
  const { meal, time, goal, avoid } = answers;
  return meal && time && goal ? { meal, time, goal, avoid } : null;
}

/** The first of questions 1-3 without an answer; 4 (avoid, optional) once all three have one. */
export function guideStep(answers: GuideAnswers): GuideStep {
  if (!answers.meal) return 1;
  if (!answers.time) return 2;
  if (!answers.goal) return 3;
  return 4;
}

/** Back one question: the answer to step k−1 goes, every other answer stays. */
export function withoutPreviousAnswer(answers: GuideAnswers, step: 2 | 3 | 4): GuideAnswers {
  const previous = { ...answers };
  if (step === 2) delete previous.meal;
  if (step === 3) delete previous.time;
  if (step === 4) delete previous.goal;
  return previous;
}

export function guideChoices(
  answers: GuideAnswers,
  step: 1 | 2 | 3
): { value: string; label: string; next: GuideAnswers }[] {
  switch (step) {
    case 1:
      return MEAL_OPTIONS.map((o) => ({ ...o, next: { ...answers, meal: o.value } }));
    case 2:
      return GUIDE_TIME_OPTIONS.map((o) => ({ ...o, next: { ...answers, time: o.value } }));
    case 3:
      return GOAL_OPTIONS.map((o) => ({ ...o, next: { ...answers, goal: o.value } }));
  }
}

function mealFilters(meal: MealAnswer): RecipeFilters {
  switch (meal) {
    case "breakfast":
      return { type: "breakfast" };
    case "lunch":
      // A light main course is our own definition: "lunch" is no type in the docs, only a
      // dishTypes value.
      return { type: "main course", maxCalories: 600 };
    case "dinner":
      return { type: "main course" };
    case "snack":
      return { type: "snack" };
  }
}

function goalSort(goal: GoalAnswer): RecipeFilters {
  switch (goal) {
    case "healthy":
      return { sort: "healthiness", sortDirection: "desc" };
    case "good":
      return { sort: "popularity", sortDirection: "desc" };
    case "surprise":
      return { sort: "random" };
  }
}

export function guideFilters(answers: CompleteGuideAnswers): RecipeFilters {
  const filters: RecipeFilters = { ...mealFilters(answers.meal), ...goalSort(answers.goal) };
  if (answers.time !== "any") filters.maxReadyTime = Number(answers.time);
  return applyAvoid(filters, answers.avoid);
}

export function guideSummary(answers: CompleteGuideAnswers): string {
  const time = answers.time === "any" ? "Any time" : labelOf(GUIDE_TIME_OPTIONS, answers.time);
  return [
    labelOf(MEAL_OPTIONS, answers.meal),
    time,
    labelOf(GOAL_OPTIONS, answers.goal),
    ...avoidSummary(answers.avoid),
  ].join(" · ");
}

interface PlanMealInfo {
  label: string;
  weight: number;
  type: MealType;
  snack: boolean;
}

/**
 * Per unit of weight, a main meal's calorie ceiling. Without it a lone main meal's share gets
 * so large that its window finds no recipes. Anchored on a dinner window measured to return
 * many hits; breakfast and lunch follow the weight, and their windows were measured too. All
 * were measured without avoid filters, which narrow them further.
 */
const MAIN_CAP_KCAL_PER_WEIGHT = 830 / 35;

/** Weights approved by Adrian. Snacks keep a fixed share; the main meals split the rest. */
const PLAN_MEALS: ReadonlyMap<PlanMeal, PlanMealInfo> = new Map<PlanMeal, PlanMealInfo>([
  ["breakfast", { label: "Breakfast", weight: 25, type: "breakfast", snack: false }],
  // The share keeps lunch light, so the guide's maxCalories for lunch is not used here.
  ["lunch", { label: "Lunch", weight: 30, type: "main course", snack: false }],
  ["dinner", { label: "Dinner", weight: 35, type: "main course", snack: false }],
  ["evening-snack", { label: "Evening snack", weight: 10, type: "snack", snack: true }],
  ["before-training", { label: "Before training", weight: 10, type: "snack", snack: true }],
]);

function mealInfo(meal: PlanMeal): PlanMealInfo {
  const info = PLAN_MEALS.get(meal);
  // Meals are parsed against this map, so a miss is a bug.
  if (!info) throw new Error(`No plan meal ${meal}`);
  return info;
}

/** In the map's order, which is the form's order and the canonical order. */
export const PLAN_MEAL_OPTIONS: readonly Option<PlanMeal>[] = [...PLAN_MEALS].map(
  ([value, info]) => ({ value, label: info.label })
);
export const DEFAULT_PLAN_MEALS: readonly PlanMeal[] = ["breakfast", "lunch", "dinner"];

export const CALORIE_OPTIONS: readonly Option<CalorieTarget>[] = [
  { value: "1600", label: "1600 kcal" },
  { value: "2000", label: "2000 kcal" },
  { value: "2500", label: "2500 kcal" },
  { value: "3000", label: "3000 kcal" },
];
export const DEFAULT_CALORIES: CalorieTarget = "2000";

export function planLabel(meal: PlanMeal): string {
  return mealInfo(meal).label;
}

/** /plan preselects its form from these. It fills in nothing, so the bare /plan is canonical. */
export function parsePlanChoices(params: SearchParams): PlanChoices {
  const choices: PlanChoices = {
    meals: allOf(params.meals, valuesOf(PLAN_MEAL_OPTIONS)),
    avoid: parseAvoid(params.avoid),
  };
  const calories = firstOf(params.calories, valuesOf(CALORIE_OPTIONS));
  if (calories) choices.calories = calories;
  return choices;
}

export function planChoicesPairs(choices: PlanChoices): QueryPairs {
  const pairs: QueryPairs = choices.meals.map((meal): [string, string] => ["meals", meal]);
  if (choices.calories) pairs.push(["calories", choices.calories]);
  return [...pairs, ...avoidPairs(choices.avoid)];
}

/**
 * Strict: Number and parseInt accept "+2", "2abc" and "0x10". 1 is not a valid value, so
 * repeated rounds take the first in 2-99, and the first plan never writes one.
 */
function parseRound(param: Param): number {
  for (const value of values(param)) {
    if (/^[1-9][0-9]?$/.test(value) && Number(value) >= 2) return Number(value);
  }
  return 1;
}

/** The default meals belong to the form only, never here: no meals is its own state. */
export function parsePlanRequest(params: SearchParams): PlanRequest {
  return {
    meals: allOf(params.meals, valuesOf(PLAN_MEAL_OPTIONS)),
    calories: firstOf(params.calories, valuesOf(CALORIE_OPTIONS)) ?? DEFAULT_CALORIES,
    avoid: parseAvoid(params.avoid),
    round: parseRound(params.round),
  };
}

/** The only builder that fills in a default: calories. */
export function planRequestPairs(request: PlanRequest): QueryPairs {
  const pairs: QueryPairs = [
    ...request.meals.map((meal): [string, string] => ["meals", meal]),
    ["calories", request.calories],
    ...avoidPairs(request.avoid),
  ];
  // A round only means something for a plan; the empty state has none.
  if (request.round > 1 && request.meals.length > 0) {
    pairs.push(["round", String(request.round)]);
  }
  return pairs;
}

export interface MealTarget {
  meal: PlanMeal;
  /** The meal's share of the target, rounded. Shown as approximate. */
  kcal: number;
  filters: RecipeFilters;
}

/**
 * One random search per meal, within ±25 % of its share. Bounds round to whole kcal and grams.
 * A main meal's share is capped by its weight, and what the cap cuts is not moved to other meals.
 */
export function planTargets(request: PlanRequest): MealTarget[] {
  const total = Number(request.calories);
  const snackShare = (meal: PlanMeal) => (total * mealInfo(meal).weight) / 100;
  const snacks = request.meals.filter((meal) => mealInfo(meal).snack);
  const mains = request.meals.filter((meal) => !mealInfo(meal).snack);
  const rest = total - snacks.reduce((sum, meal) => sum + snackShare(meal), 0);
  const mainWeight = mains.reduce((sum, meal) => sum + mealInfo(meal).weight, 0);

  return request.meals.map((meal) => {
    const info = mealInfo(meal);
    let share = info.snack ? snackShare(meal) : (rest * info.weight) / mainWeight;
    if (!info.snack) share = Math.min(share, Math.round(MAIN_CAP_KCAL_PER_WEIGHT * info.weight));
    const filters: RecipeFilters = {
      type: info.type,
      sort: "random",
      minCalories: Math.round(share * 0.75),
      maxCalories: Math.round(share * 1.25),
    };
    // Half the energy from carbohydrate, at 4 kcal per gram. Our own definition.
    if (meal === "before-training") filters.minCarbs = Math.round((share * 0.5) / 4);
    return { meal, kcal: Math.round(share), filters: applyAvoid(filters, request.avoid) };
  });
}

/** Only called with at least one meal. */
export function planHeading(request: PlanRequest): string {
  const targets = planTargets(request);
  const covered = targets.reduce((sum, target) => sum + target.kcal, 0);
  if (targets.every((target) => mealInfo(target.meal).snack)) {
    return `Snacks only — this plan covers ≈ ${covered} of ${request.calories} kcal`;
  }
  // The caps can leave a plan short of its target, and the heading says so instead of claiming it.
  const short = covered < 0.98 * Number(request.calories);
  return [
    short
      ? `This plan covers ≈ ${covered} of ${request.calories} kcal`
      : `≈ ${request.calories} kcal`,
    targets.map((target) => planLabel(target.meal)).join(", "),
    ...avoidSummary(request.avoid),
  ].join(" · ");
}

/**
 * The origin a recipe was opened from, or null to behave as the leftovers search.
 *
 * Only the first known `via` counts, and the next one is never tried: NavTitle uses the same
 * rule, so the page and the title agree on the origin.
 */
export function parseVia(params: SearchParams): ViaOrigin | null {
  const via = values(params.via).find(isVia);
  if (via === undefined) return null;
  // An incomplete origin makes `via` invalid, and the next value is not tried.
  switch (via) {
    case "collection": {
      const collection = firstCollection(params.slug);
      if (!collection) return null;
      return { via, slug: collection.slug, ...parseCollectionAdjustment(collection, params) };
    }
    case "guide": {
      const answers = completeGuideAnswers(parseGuideAnswers(params));
      return answers ? { via, ...answers } : null;
    }
    case "plan": {
      const request = parsePlanRequest(params);
      return request.meals.length > 0 ? { via, ...request } : null;
    }
  }
}
