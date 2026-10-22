import { catalog } from "@/server/catalog";

export async function GET() {
  return Response.json(catalog);
}
