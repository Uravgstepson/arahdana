import { NextResponse } from "next/server";

export const revalidate = 900;

export async function GET() {
  return NextResponse.json(
    {
      source: "ArahDana Market Edge Functions",
      error: "Legacy Yahoo market route disabled.",
      message:
        "Market data v1.1 memakai Supabase Edge Functions dan provider resmi/berkunci. Endpoint lama ini tidak lagi mengambil data publik langsung.",
    },
    { status: 410 },
  );
}
