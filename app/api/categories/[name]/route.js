import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function DELETE(request, { params }) {
  try {
    const { name } = await params; // params is a Promise in Next.js 15+
    const clean = String(name || "").trim();

    if (!clean) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    // Protect the default "Other" category from deletion.
    if (clean.toLowerCase() === "other") {
      return NextResponse.json(
        { error: "The default 'Other' category cannot be deleted" },
        { status: 400 }
      );
    }

    const { error } = await getSupabaseAdmin()
      .from("categories")
      .delete()
      .eq("name", clean);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
