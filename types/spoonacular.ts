/**
 * Typer for Spoonacular-responsene, definert ved API-grensen.
 *
 * Feltnavnene er verifisert mot spoonacular.com/food-api/docs, ikke gjettet.
 * Alt som er valgfritt her er valgfritt fordi Spoonacular faktisk utelater det for
 * enkelte oppskrifter — ikke fordi vi er usikre. Et felt vi ikke har bekreftet skal
 * ikke stå her; da hører det hjemme som `unknown` og narrowes på bruksstedet.
 */

/** Ingrediens slik den kommer fra findByIngredients. */
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
 * Ett treff fra findByIngredients.
 *
 * `usedIngredientCount` / `missedIngredients` er kjernen i matsvinn-formålet og var
 * årsaken til at denne typen finnes — appen hentet dem og kastet dem.
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

/** Utvidet ingrediens fra /information — har `original`, som er den vi viser. */
export interface ExtendedIngredient {
  id: number;
  name: string;
  original: string;
  amount: number;
  unit: string;
}

/** Ett næringstall. Kommer bare når includeNutrition=true. */
export interface Nutrient {
  name: string;
  amount: number;
  unit: string;
  percentOfDailyNeeds?: number;
}

export interface Nutrition {
  nutrients: Nutrient[];
}

/**
 * /recipes/{id}/information.
 *
 * Feltene under `healthScore` og nedover er de fase 5c bruker i datapanelet. De koster
 * ingen ekstra kvote — de kommer i samme kall appen alt gjør.
 */
export interface RecipeDetail {
  id: number;
  title: string;
  image?: string;
  /** HTML fra Spoonacular. Skal ikke injiseres rått — se CLAUDE.md. */
  instructions?: string;
  extendedIngredients?: ExtendedIngredient[];
  healthScore?: number;
  readyInMinutes?: number;
  servings?: number;
  diets?: string[];
  dishTypes?: string[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  /** Bare til stede når includeNutrition=true. */
  nutrition?: Nutrition;
}

/** Ett steg fra /analyzedInstructions. */
export interface InstructionStep {
  number: number;
  step: string;
}

/**
 * /recipes/{id}/analyzedInstructions returnerer en *liste* av grupper, ikke ett objekt.
 * De fleste oppskrifter har én gruppe med tomt navn; noen har flere navngitte deler.
 */
export interface AnalyzedInstruction {
  name: string;
  steps: InstructionStep[];
}

/** Feiltilstander vi skiller mellom i UI-et. Se fase 5b. */
export type ApiErrorKind = "quota" | "auth" | "network" | "unknown";

export interface ApiError {
  kind: ApiErrorKind;
  status?: number;
  message: string;
}
