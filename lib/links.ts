/**
 * Hrefs to the recipe page. Server only: nothing with "use client" imports this file.
 * Imports are relative so the unit tests can run the compiled output with plain Node.
 */

/**
 * The search goes along for Back, and the missing ingredients by id so the recipe can mark
 * them: /information has no idea what the user has at home, and asking it again would cost
 * quota. The ids match the recipe's own ingredient ids (checked).
 */
export function leftoversRecipeHref(
  id: number,
  ingredients: string,
  missingIds: number[]
): string {
  const params = new URLSearchParams({ ingredients, missing: missingIds.join(",") });
  return `/recipe/${id}?${params}`;
}
