export async function GET(req, { params }) {
  const { id } = params;
  const API_KEY = process.env.SPOONACULAR_KEY;

  const response = await fetch(
    `https://api.spoonacular.com/recipes/${id}/information?apiKey=${API_KEY}`
  );
  const data = await response.json();
  return Response.json(data);
}
