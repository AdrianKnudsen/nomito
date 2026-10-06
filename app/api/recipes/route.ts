import { errorResponse, findRecipesByIngredients } from "@/lib/spoonacular";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ingredients = searchParams.get("ingredients") || "chicken";

  try {
    return Response.json(await findRecipesByIngredients(ingredients));
  } catch (error) {
    return errorResponse(error);
  }
}
