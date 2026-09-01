import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("categories")
      .select("name")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: (data ?? []).map((c) => c.name) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    // Insert, ignoring duplicates (unique constraint on name).
    const { error } = await getSupabaseAdmin()
      .from("categories")
      .upsert({ name }, { onConflict: "name" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ name }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
