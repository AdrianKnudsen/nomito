export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const API_KEY = process.env.SPOONACULAR_KEY;

  const response = await fetch(
    `https://api.spoonacular.com/recipes/${id}/information?apiKey=${API_KEY}&includeNutrition=false&metric=true`
  );
  const data = await response.json();
  return Response.json(data);
}
