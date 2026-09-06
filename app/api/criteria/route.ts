import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("criteria")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ criteria: data ?? [] });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { label?: string; description?: string };
  const label = body.label?.trim() ?? "";
  const description = body.description?.trim() || null;

  if (!label) {
    return NextResponse.json({ error: "Label is required." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("criteria")
    .insert({ label, description })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ criterion: data });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from("criteria").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
