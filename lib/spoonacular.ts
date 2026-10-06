/**
 * Alle Spoonacular-kall samlet ett sted, ett per datatype.
 *
 * Route handlers under app/api/ skal være tynne og bare kalle hit. Grunnen er den samme
 * som for GROQ-spørringer: når et kall skal endres, skal det finnes én fil å endre det i.
 */

import { SpoonacularError } from "@/lib/api-error";
import type {
  ApiError,
  ApiErrorKind,
  RecipeDetail,
  RecipeSearchResult,
} from "@/types/spoonacular";

const BASE = "https://api.spoonacular.com";

/**
 * Maks er 100 per dokumentasjonen, og kostmodellen er 1 poeng + 0.01 per oppskrift.
 * 24 gir nok å bla i uten å brenne kvote eller dytte 100 kort inn i DOM-en.
 */
const RESULT_COUNT = 24;

/**
 * Kvote og nøkkel sendes videre med egen status, så klienten kan skille dem fra
 * «ingen treff». Nettverk og ukjent er upstream-feil sett fra klienten, derav 502.
 */
const STATUS_BY_KIND: Record<ApiErrorKind, number> = {
  quota: 402,
  auth: 401,
  network: 502,
  unknown: 502,
};

function apiKey(): string {
  const key = process.env.SPOONACULAR_KEY;
  if (!key) {
    throw new Error("SPOONACULAR_KEY is missing from the environment.");
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
      message: "Today's recipe quota is used up. Try again tomorrow.",
    };
  }
  if (status === 401 || status === 403) {
    return {
      kind: "auth",
      status,
      message: "The recipe service rejected our API key.",
    };
  }
  return {
    kind: "unknown",
    status,
    message: `The recipe service responded with ${status}.`,
  };
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new SpoonacularError(
      { kind: "network", message: "Could not reach the recipe service." },
      { cause }
    );
  }

  if (!response.ok) {
    throw new SpoonacularError(toApiError(response.status));
  }

  return (await response.json()) as T;
}

/**
 * Gjør en feil fra denne fila om til et svar en route handler kan returnere.
 * Alt annet kastes videre, så Next logger det som en ekte 500 i stedet for at det
 * forkles som en upstream-feil.
 */
export function errorResponse(error: unknown): Response {
  if (!(error instanceof SpoonacularError)) throw error;
  return Response.json(error.apiError, {
    status: STATUS_BY_KIND[error.apiError.kind],
  });
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
 * Full oppskrift, inkludert stegene.
 *
 * `includeNutrition=true` koster ikke et ekstra kall, og er det som gjør datapanelet
 * mulig. `analyzedInstructions` kommer med i samme svar, så et eget kall mot
 * /analyzedInstructions ville bare brent ett kvotepoeng til per oppskrift.
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
