/**
 * The app's URL vocabulary: the values the pages accept in their query strings.
 *
 * Input from outside, but not from Spoonacular, which is why it is not in types/spoonacular.ts.
 * lib/filters.ts translates these into the Spoonacular values defined there.
 *
 * Also the substitutes Server Action's return type, which crosses the same server/client line.
 */

import type { ApiErrorKind } from "./spoonacular";

export type MealAnswer = "breakfast" | "lunch" | "dinner" | "snack";
export type TimeAnswer = "15" | "30" | "60" | "any";
/** A collection can only be tightened, so "any" is not an adjustment. */
export type CollectionTime = Exclude<TimeAnswer, "any">;
export type GoalAnswer = "healthy" | "good" | "surprise";
export type AvoidValue = "vegetarian" | "vegan" | "gluten-free" | "dairy-free";
export type PlanMeal =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "evening-snack"
  | "before-training";
export type CalorieTarget = "1600" | "2000" | "2500" | "3000";
export type Via = "collection" | "guide" | "plan";

export interface CollectionAdjustment {
  time?: CollectionTime;
  avoid: AvoidValue[];
}

/** /guide: any subset of answers is a valid state. */
export interface GuideAnswers {
  meal?: MealAnswer;
  time?: TimeAnswer;
  goal?: GoalAnswer;
  avoid: AvoidValue[];
}

/** /guide/results needs the first three. */
export interface CompleteGuideAnswers {
  meal: MealAnswer;
  time: TimeAnswer;
  goal: GoalAnswer;
  avoid: AvoidValue[];
}

/** /plan: preselects the form, so nothing is filled in. */
export interface PlanChoices {
  meals: PlanMeal[];
  calories?: CalorieTarget;
  avoid: AvoidValue[];
}

/** /plan/results. `round` 1 is the first plan and is never written to the URL. */
export interface PlanRequest {
  meals: PlanMeal[];
  calories: CalorieTarget;
  avoid: AvoidValue[];
  round: number;
}

/** Where a recipe was opened from, with the origin's own canonical parameters. */
export type ViaOrigin =
  | ({ via: "collection"; slug: string } & CollectionAdjustment)
  | ({ via: "guide" } & CompleteGuideAnswers)
  | ({ via: "plan" } & PlanRequest);

/** What the substitutes Server Action returns. A plain object: a thrown error is redacted in prod. */
export type SubstitutesState =
  | { status: "idle" }
  | { status: "ok"; substitutes: string[] }
  | { status: "error"; kind: ApiErrorKind | "invalid"; message: string };
