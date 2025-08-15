export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ingredients = searchParams.get("ingredients") || "chicken";
  const API_KEY = process.env.SPOONACULAR_KEY;

  const response = await fetch(
    `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=99999&apiKey=${API_KEY}`
  );
  const data = await response.json();
  return Response.json(data);
}
