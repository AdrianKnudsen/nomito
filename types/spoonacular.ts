/**
 * Types for the Spoonacular requests and responses, defined at the API boundary.
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

/**
 * One nutrient figure. On /information only with includeNutrition=true; on complexSearch hits
 * with a nutrient filter or addRecipeNutrition.
 */
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
  /** Seen in the documentation's example, not in an observed response. */
  license?: string | null;
  /** Assumed to be the author, from the documentation's example; not yet verified against a response. */
  creditsText?: string | null;
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

/**
 * One hit from /recipes/complexSearch without addRecipeInformation, from the docs' example
 * response. `image` is optional for the same reason as on RecipeDetail: a recipe without a photo
 * comes back without it, and `imageType` goes with it. Every hit in the real collection picks had
 * an image, so whether complexSearch ever omits it is unconfirmed; optional costs nothing, since
 * the card has a placeholder.
 */
export interface RecipeSummary {
  id: number;
  title: string;
  image?: string;
  imageType?: string;
  /** With a nutrient filter or addRecipeNutrition (both measured). */
  nutrition?: { nutrients: Nutrient[] };
}

/** /recipes/complexSearch. */
export interface ComplexSearchResponse {
  offset: number;
  number: number;
  totalResults: number;
  results: RecipeSummary[];
}

/** The Spoonacular values the app sends. Spoonacular has more of each. */
export type MealType = "main course" | "breakfast" | "snack" | "soup" | "salad";
export type Diet = "vegetarian" | "vegan";
export type Intolerance = "gluten" | "dairy";
export type SortOption = "healthiness" | "popularity" | "price" | "random";
export type SortDirection = "asc" | "desc";

/**
 * What searchRecipes sends to complexSearch. Lists are joined with commas; for `diet` a comma
 * means AND (docs). Setting a nutrient filter adds to the call's quota cost (docs).
 */
export interface RecipeFilters {
  type?: MealType;
  diet?: Diet[];
  intolerances?: Intolerance[];
  maxReadyTime?: number;
  minCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  minCarbs?: number;
  sort?: SortOption;
  sortDirection?: SortDirection;
}

/**
 * /food/ingredients/{id}/substitutes. Free-text lines. Both fields with data are absent when
 * nothing is known: Spoonacular then answers 200 with status "failure" and only a message.
 */
export interface IngredientSubstitutes {
  status: string;
  ingredient?: string;
  substitutes?: string[];
  message: string;
}

/** The error states the UI tells apart. */
export type ApiErrorKind = "quota" | "auth" | "rateLimit" | "network" | "unknown";

export interface ApiError {
  kind: ApiErrorKind;
  status?: number;
  message: string;
}
