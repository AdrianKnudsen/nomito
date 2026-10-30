// Only standard Creative Commons names match, and the URL is built from the two captured groups,
// never from the rest of the string, so nothing Spoonacular sends can end up in the license link's href.
const CC = /^CC (BY(?:-NC)?(?:-SA|-ND)?) (1\.0|2\.0|2\.5|3\.0|4\.0)(?: (?:International|Unported|Generic|DEED))?$/;

/** The license deed URL for a standard CC name, or undefined for anything else. */
export function creativeCommonsUrl(license: string): string | undefined {
  const match = CC.exec(license.trim());
  if (!match) return undefined;
  return `https://creativecommons.org/licenses/${match[1].toLowerCase()}/${match[2]}/`;
}

// Upstream data, so a non-string must not throw in render.
function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The author for the license line. With a source credit on the page the line only names an
 * author the credit does not already name; without one, the author must not vanish with it.
 */
export function licenseAuthor(
  creditsText: string | null | undefined,
  sourceName: string | null | undefined,
  sourceUrl: string | null | undefined
): string | undefined {
  const credits = clean(creditsText);
  const source = clean(sourceName);

  if (clean(sourceUrl)) {
    if (!credits) return undefined;
    return credits.toLowerCase() === source.toLowerCase() ? undefined : credits;
  }
  return credits || source || undefined;
}
