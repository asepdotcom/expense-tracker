import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(request, { params }) {
  try {
    const { id } = await params; // params is a Promise in Next.js 15+
    const body = await request.json();
    const date = body.date;
    const title = (body.title || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const cleanItems = items
      .map((it) => ({
        description: String(it.description || "").trim(),
        amount: parseFloat(it.amount),
      }))
      .filter((it) => it.description && Number.isFinite(it.amount) && it.amount > 0);

    if (cleanItems.length === 0) {
      return NextResponse.json({ error: "Add at least one valid item" }, { status: 400 });
    }

    const total = cleanItems.reduce((s, it) => s + it.amount, 0);

    // Update record fields
    const { data: record, error: recordError } = await getSupabaseAdmin()
      .from("records")
      .update({ date, title, total, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (recordError) {
      return NextResponse.json({ error: recordError.message }, { status: 500 });
    }

    // Replace items: delete old ones then insert new ones
    const delRes = await getSupabaseAdmin().from("items").delete().eq("record_id", id);
    if (delRes.error) {
      return NextResponse.json({ error: delRes.error.message }, { status: 500 });
    }

    const rows = cleanItems.map((it) => ({ record_id: id, description: it.description, amount: it.amount }));
    const insRes = await getSupabaseAdmin().from("items").insert(rows);
    if (insRes.error) {
      return NextResponse.json({ error: insRes.error.message }, { status: 500 });
    }

    return NextResponse.json({ record });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params; // params is a Promise in Next.js 15+

    // Deleting items first (FK constraint), then the record.
    await getSupabaseAdmin().from("items").delete().eq("record_id", id);
    const { error } = await getSupabaseAdmin().from("records").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
