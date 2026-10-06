import { errorResponse, getRecipeDetail } from "@/lib/spoonacular";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    return Response.json(await getRecipeDetail(id));
  } catch (error) {
    return errorResponse(error);
  }
}
