/**
 * Feiltypen som går fra Spoonacular-klienten, gjennom route handlers, til UI-et.
 *
 * Egen fil fordi både server og klient trenger den, og klienten ikke skal importere
 * `lib/spoonacular.ts` — den leser API-nøkkelen fra miljøet.
 */

import type { ApiError, ApiErrorKind } from "@/types/spoonacular";

const KINDS: readonly ApiErrorKind[] = ["quota", "auth", "network", "unknown"];

export class SpoonacularError extends Error {
  readonly apiError: ApiError;

  constructor(apiError: ApiError, options?: { cause?: unknown }) {
    super(apiError.message, options);
    this.name = "SpoonacularError";
    this.apiError = apiError;
  }
}

/** For JSON som kommer tilbake fra våre egne ruter: er dette en `ApiError`? */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "message" in value &&
    typeof value.message === "string" &&
    KINDS.some((kind) => kind === value.kind)
  );
}
