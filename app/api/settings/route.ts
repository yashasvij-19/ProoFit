import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    settings: data ?? { top_n: 3, honorable_mentions_n: 2 },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    top_n?: number;
    honorable_mentions_n?: number;
  };

  const top_n = Math.max(0, Number(body.top_n) || 0);
  const honorable_mentions_n = Math.max(
    0,
    Number(body.honorable_mentions_n) || 0
  );

  const { data: existing, error: readError } = await getSupabaseAdmin()
    .from("settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const payload = {
    top_n,
    honorable_mentions_n,
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? getSupabaseAdmin().from("settings").update(payload).eq("id", existing.id)
    : getSupabaseAdmin().from("settings").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ settings: data });
}
