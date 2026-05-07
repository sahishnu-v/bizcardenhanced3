import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, title, company, email, phone, website } = body;

    if (!full_name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: card, error } = await supabase
      .from("cards")
      .insert([{
        full_name: full_name.trim(),
        title: title?.trim() || null,
        company: company?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        status: "pending",
        session_id: crypto.randomUUID(),
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ card });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, profile_photo_url } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Card ID is required." }, { status: 400 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from("cards")
      .update({ profile_photo_url })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}