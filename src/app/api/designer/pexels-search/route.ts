/* ─────────────────────────────────────────────────────────────────────────────
   API: GET /api/designer/pexels-search?q=...&per_page=20
   Proxy for Pexels API to avoid exposing API key on client
   ───────────────────────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const perPage = searchParams.get("per_page") || "20";

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { photos: [], error: "Pexels API key not configured" },
      { status: 200 },
    );
  }

  if (!query.trim()) {
    return NextResponse.json({ photos: [] });
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: { Authorization: apiKey },
        next: { revalidate: 300 }, // cache 5 min
      },
    );

    if (!res.ok) {
      return NextResponse.json({ photos: [], error: "Pexels API error" });
    }

    const data = await res.json();
    return NextResponse.json({ photos: data.photos || [] });
  } catch {
    return NextResponse.json({ photos: [], error: "Fetch failed" });
  }
}
