import { getAnalyzedInstructions, getApiError } from "@/lib/spoonacular";
import type { ApiErrorKind } from "@/types/spoonacular";

/**
 * Kvote og nøkkel sendes videre med egen status, så klienten kan skille dem fra
 * «ingen steg». Nettverk og ukjent er upstream-feil sett fra klienten, derav 502.
 */
const STATUS_BY_KIND: Record<ApiErrorKind, number> = {
  quota: 402,
  auth: 401,
  network: 502,
  unknown: 502,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    return Response.json(await getAnalyzedInstructions(id));
  } catch (error) {
    const apiError = getApiError(error);
    if (!apiError) throw error;
    return Response.json(apiError, { status: STATUS_BY_KIND[apiError.kind] });
  }
}
