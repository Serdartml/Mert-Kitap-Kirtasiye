import { NextResponse, type NextRequest } from "next/server";
import { getSearchSuggestions } from "@/lib/catalog";

// Arama kutusunun otomatik tamamlaması. Herkese açık, yalnızca okur; yanıt kısa süre önbelleğe alınır.
const MIN_LENGTH = 2;
const MAX_LENGTH = 60;

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, MAX_LENGTH);
  if (query.length < MIN_LENGTH) return NextResponse.json({ categories: [], products: [], total: 0 });

  const suggestions = await getSearchSuggestions(query);
  return NextResponse.json(suggestions);
}
