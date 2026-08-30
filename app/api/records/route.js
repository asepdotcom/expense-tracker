import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    // Fetch records with their items, ordered by date descending.
    const { data: records, error } = await getSupabaseAdmin()
      .from("records")
      .select("*, items(*)")
      .order("date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort items by id (stable order within each record)
    records.forEach((r) => {
      if (r.items) r.items.sort((a, b) => a.id - b.id);
    });

    return NextResponse.json({ records: records ?? [] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request) {
  try {
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

    // Insert record
    const { data: record, error: recordError } = await getSupabaseAdmin()
      .from("records")
      .insert({ date, title, total })
      .select("*")
      .single();

    if (recordError) {
      return NextResponse.json({ error: recordError.message }, { status: 500 });
    }

    // Insert items
    const rows = cleanItems.map((it) => ({ record_id: record.id, description: it.description, amount: it.amount }));
    const { error: itemsError } = await getSupabaseAdmin().from("items").insert(rows);

    if (itemsError) {
      // Rollback record if item insert fails
      await getSupabaseAdmin().from("records").delete().eq("id", record.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
