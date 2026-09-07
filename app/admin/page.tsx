import AdminDashboard from "@/app/admin/admin-dashboard";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Criterion, RankedSubmission } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [
  { data: criteria, error: criteriaError },
  { data: settings, error: settingsError },
  { data: submissions, error: submissionsError },
  { data: rankings, error: rankingsError },
] = await Promise.all([
  getSupabaseAdmin().from("criteria").select("*").order("created_at"),
  getSupabaseAdmin().from("settings").select("*").limit(1).maybeSingle(),
  getSupabaseAdmin().from("submissions").select("*").order("submitted_at", { ascending: false }),
  getSupabaseAdmin().from("rankings").select("*"),
]);

console.error("DEBUG criteriaError:", criteriaError);
console.error("DEBUG settingsError:", settingsError);
console.error("DEBUG submissionsError:", submissionsError);
console.error("DEBUG rankingsError:", rankingsError);
console.error("DEBUG URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.error("DEBUG SERVICE KEY START:", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20));
console.error("DEBUG counts:", {
  criteria: criteria?.length,
  submissions: submissions?.length,
  rankings: rankings?.length,
});
const knownGoodKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdHFsc3d6a3NvY3VuaG52cWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODcwMjIwOCwiZXhwIjoyMTA0Mjc4MjA4fQ.o4Doek2MFnO8wQZTlUcQAS6WIBMPjCiaZP343q0hcWg";

console.error("DEBUG KEY EXACT MATCH:", process.env.SUPABASE_SERVICE_ROLE_KEY === knownGoodKey);
console.error("DEBUG KEY LENGTH actual vs expected:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length, knownGoodKey.length);

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
