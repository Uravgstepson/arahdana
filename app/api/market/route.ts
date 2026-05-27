import { NextResponse } from "next/server";

export const revalidate = 900;

export async function GET() {
  return NextResponse.json(
    {
      source: "ArahDana Market Edge Functions",
      error: "Legacy market route disabled.",
      message:
        "Market data v1.1 memakai Supabase Edge Functions agar API key tetap server-side dan tidak memakai scraping tidak resmi.",
    },
    { status: 410 },
  );
}
