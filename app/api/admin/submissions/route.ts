import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { RankedSubmission } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const [{ data: submissions, error: subError }, { data: rankings, error: rankError }] =
    await Promise.all([
      getSupabaseAdmin()
        .from("submissions")
        .select("*")
        .order("submitted_at", { ascending: false }),
      getSupabaseAdmin().from("rankings").select("*"),
    ]);

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }
  if (rankError) {
    return NextResponse.json({ error: rankError.message }, { status: 500 });
  }

  const rankingBySubmission = new Map(
    (rankings ?? []).map((r) => [r.submission_id as string, r])
  );

  const merged: RankedSubmission[] = (submissions ?? []).map((s) => {
    const r = rankingBySubmission.get(s.id);
    return {
      ...s,
      overall_score: r?.overall_score ?? null,
      rank: r?.rank ?? null,
      status: r?.status ?? null,
      summary_text: r?.summary_text ?? null,
    };
  });

  merged.sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return 0;
  });

  return NextResponse.json({ submissions: merged });
}
