import AdminDashboard from "@/app/admin/admin-dashboard";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Criterion, RankedSubmission } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [
    { data: criteria },
    { data: settings },
    { data: submissions },
    { data: rankings },
  ] = await Promise.all([
    getSupabaseAdmin().from("criteria").select("*").order("created_at"),
    getSupabaseAdmin().from("settings").select("*").limit(1).maybeSingle(),
    getSupabaseAdmin().from("submissions").select("*").order("submitted_at", { ascending: false }),
    getSupabaseAdmin().from("rankings").select("*"),
  ]);

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

  return (
    <AdminDashboard
      initialCriteria={(criteria ?? []) as Criterion[]}
      initialSettings={{
        top_n: settings?.top_n ?? 3,
        honorable_mentions_n: settings?.honorable_mentions_n ?? 2,
      }}
      initialSubmissions={merged}
    />
  );
}