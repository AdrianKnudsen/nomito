/**
 * Alle Spoonacular-kall samlet ett sted, ett per datatype.
 *
 * Route handlers under app/api/ skal være tynne og bare kalle hit. Grunnen er den samme
 * som for GROQ-spørringer: når et kall skal endres, skal det finnes én fil å endre det i.
 */

import type {
  AnalyzedInstruction,
  ApiError,
  RecipeDetail,
  RecipeSearchResult,
} from "@/types/spoonacular";

const BASE = "https://api.spoonacular.com";

/**
 * Maks er 100 per dokumentasjonen, og kostmodellen er 1 poeng + 0.01 per oppskrift.
 * 24 gir nok å bla i uten å brenne kvote eller dytte 100 kort inn i DOM-en.
 */
const RESULT_COUNT = 24;

function apiKey(): string {
  const key = process.env.SPOONACULAR_KEY;
  if (!key) {
    throw new Error("SPOONACULAR_KEY mangler i miljøet.");
  }
  return key;
}

/**
 * Oversetter en feilet respons til noe UI-et kan skille på.
 *
 * Poenget er 402: oppbrukt kvote viste seg tidligere som «No recipes found», altså en
 * tom tilstand i stedet for en feil. Det er feilinformasjon, ikke en tom liste.
 */
function toApiError(status: number): ApiError {
  if (status === 402) {
    return {
      kind: "quota",
      status,
      message: "Dagens kvote mot Spoonacular er brukt opp.",
    };
  }
  if (status === 401 || status === 403) {
    return { kind: "auth", status, message: "API-nøkkelen ble avvist." };
  }
  return { kind: "unknown", status, message: `Spoonacular svarte ${status}.` };
}

/**
 * Henter ut `ApiError` fra en kastet feil, eller `undefined` om feilen ikke kom herfra.
 *
 * Bor her fordi det er denne fila som fester `apiError` på feilen; formen skal bare
 * kjennes ett sted.
 */
export function getApiError(error: unknown): ApiError | undefined {
  if (typeof error !== "object" || error === null || !("apiError" in error)) {
    return undefined;
  }
  const { apiError } = error;
  if (
    typeof apiError === "object" &&
    apiError !== null &&
    "kind" in apiError &&
    "message" in apiError
  ) {
    return apiError as ApiError;
  }
  return undefined;
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    const error: ApiError = {
      kind: "network",
      message: "Fikk ikke kontakt med Spoonacular.",
    };
    throw Object.assign(new Error(error.message), { apiError: error, cause });
  }

  if (!response.ok) {
    const error = toApiError(response.status);
    throw Object.assign(new Error(error.message), { apiError: error });
  }

  return (await response.json()) as T;
}

/**
 * Søk på ingredienser du har hjemme.
 *
 * `ranking: 2` minimerer manglende ingredienser framfor å maksimere brukte, og
 * `ignorePantry` holder vann, salt og mel utenfor regnestykket. Begge går rett i kjernen
 * av matsvinn-formålet, og begge lå ubrukt før.
 */
export async function findRecipesByIngredients(
  ingredients: string
): Promise<RecipeSearchResult[]> {
  const params = new URLSearchParams({
    ingredients,
    number: String(RESULT_COUNT),
    ranking: "2",
    ignorePantry: "true",
    apiKey: apiKey(),
  });
  return getJson<RecipeSearchResult[]>(
    `${BASE}/recipes/findByIngredients?${params}`
  );
}

/**
 * Full oppskrift.
 *
 * `includeNutrition=true` koster ikke et ekstra kall, og er det som gjør datapanelet
 * mulig. Den sto på `false`, så næringsdataene ble aldri hentet.
 */
export async function getRecipeDetail(id: string): Promise<RecipeDetail> {
  const params = new URLSearchParams({
    includeNutrition: "true",
    metric: "true",
    apiKey: apiKey(),
  });
  return getJson<RecipeDetail>(
    `${BASE}/recipes/${encodeURIComponent(id)}/information?${params}`
  );
}

/**
 * Stegvise instruksjoner.
 *
 * Dette er endepunktet route-fila aldri kalte, fordi den inneholdt en React-komponent
 * i stedet for en handler. Uten den faller oppskriftene tilbake til én tekstvegg.
 */
export async function getAnalyzedInstructions(
  id: string
): Promise<AnalyzedInstruction[]> {
  const params = new URLSearchParams({ apiKey: apiKey() });
  return getJson<AnalyzedInstruction[]>(
    `${BASE}/recipes/${encodeURIComponent(id)}/analyzedInstructions?${params}`
  );
}
