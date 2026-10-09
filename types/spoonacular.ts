/**
 * Types for the Spoonacular responses, defined at the API boundary.
 *
 * Field names are checked against spoonacular.com/food-api/docs, not guessed. Anything
 * optional here is optional because Spoonacular actually omits it for some recipes — not
 * because we are unsure. A field we have not confirmed does not belong here; it belongs
 * as `unknown`, narrowed where it is used.
 */

/** An ingredient as findByIngredients returns it. */
export interface SpoonacularIngredient {
  id: number;
  name: string;
  original: string;
  originalName: string;
  amount: number;
  unit: string;
  unitLong: string;
  unitShort: string;
  aisle: string;
  image: string;
}

/**
 * One hit from findByIngredients.
 *
 * `usedIngredientCount` / `missedIngredients` are the core of the food-waste purpose
 * and the reason this type exists — the app fetched them and threw them away.
 */
export interface RecipeSearchResult {
  id: number;
  title: string;
  image: string;
  imageType: string;
  likes: number;
  usedIngredientCount: number;
  missedIngredientCount: number;
  usedIngredients: SpoonacularIngredient[];
  missedIngredients: SpoonacularIngredient[];
  unusedIngredients: SpoonacularIngredient[];
}

/** Extended ingredient from /information — has `original`, which is what we show. */
export interface ExtendedIngredient {
  id: number;
  name: string;
  original: string;
  amount: number;
  unit: string;
}

/** One nutrient figure. Only present with includeNutrition=true. */
export interface Nutrient {
  name: string;
  amount: number;
  unit: string;
  percentOfDailyNeeds?: number;
}

/** Where the calories come from, in percent. Observed in a real /information response. */
export interface CaloricBreakdown {
  percentProtein: number;
  percentFat: number;
  percentCarbs: number;
}

/** Per serving, according to the docs. */
export interface Nutrition {
  nutrients: Nutrient[];
  caloricBreakdown?: CaloricBreakdown;
}

/**
 * /recipes/{id}/information.
 *
 * The fields from `healthScore` down feed the facts panel. They cost no extra quota —
 * they come in the call the app already makes.
 */
export interface RecipeDetail {
  id: number;
  title: string;
  image?: string;
  /**
   * The steps, in the same response. Can be empty — 716429 has neither steps nor
   * `instructions`. Observed in a real response, not only read in the docs.
   */
  analyzedInstructions?: AnalyzedInstruction[];
  /** HTML. Not used: steps come from `analyzedInstructions`, otherwise the source is linked. */
  instructions?: string;
  /** The original recipe. The fallback when `analyzedInstructions` is empty. */
  sourceUrl?: string;
  sourceName?: string;
  extendedIngredients?: ExtendedIngredient[];
  healthScore?: number;
  readyInMinutes?: number;
  servings?: number;
  diets?: string[];
  dishTypes?: string[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  /** Only present with includeNutrition=true. */
  nutrition?: Nutrition;
}

/** One step in `analyzedInstructions`. */
export interface InstructionStep {
  number: number;
  step: string;
}

/**
 * `analyzedInstructions` is a *list* of groups, not one object. Most recipes have a
 * single group with an empty name; some have several named parts (324694 has two).
 */
export interface AnalyzedInstruction {
  name: string;
  steps: InstructionStep[];
}

/** The error states the UI tells apart. */
export type ApiErrorKind = "quota" | "auth" | "network" | "unknown";

export interface ApiError {
  kind: ApiErrorKind;
  status?: number;
  message: string;
}
