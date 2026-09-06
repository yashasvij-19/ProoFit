import { NextResponse } from "next/server";
import { generateSummary, scoreCriterion } from "@/lib/anthropic";
import { fetchGithubSnapshot } from "@/lib/github";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Criterion, RankingStatus, Submission } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type AnalyzeBody = {
  reanalyze?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AnalyzeBody;
  const reanalyze = Boolean(body.reanalyze);

  const [
    { data: submissions, error: subError },
    { data: criteria, error: critError },
    { data: settingsRow, error: settingsError },
  ] = await Promise.all([
    getSupabaseAdmin().from("submissions").select("*"),
    getSupabaseAdmin().from("criteria").select("*").order("created_at"),
    getSupabaseAdmin().from("settings").select("*").limit(1).maybeSingle(),
  ]);

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });
  if (critError) return NextResponse.json({ error: critError.message }, { status: 500 });
  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const allSubmissions = (submissions ?? []) as Submission[];
  const allCriteria = (criteria ?? []) as Criterion[];
  const topN = settingsRow?.top_n ?? 3;
  const mentionsN = settingsRow?.honorable_mentions_n ?? 2;

  if (allCriteria.length === 0) {
    return NextResponse.json(
      { error: "Add at least one criterion before analyzing." },
      { status: 400 }
    );
  }
  if (allSubmissions.length === 0) {
    return NextResponse.json({ error: "No submissions to analyze." }, { status: 400 });
  }

  const { data: existingScores, error: scoresError } = await getSupabaseAdmin()
    .from("criterion_scores")
    .select("submission_id");
  if (scoresError) {
    return NextResponse.json({ error: scoresError.message }, { status: 500 });
  }

  const scoredIds = new Set((existingScores ?? []).map((s) => s.submission_id as string));
  const toAnalyze = reanalyze
    ? allSubmissions
    : allSubmissions.filter((s) => !scoredIds.has(s.id));

  const errors: string[] = [];

  for (const submission of toAnalyze) {
    try {
      if (reanalyze) {
        await getSupabaseAdmin()
          .from("criterion_scores")
          .delete()
          .eq("submission_id", submission.id);
        await getSupabaseAdmin()
          .from("rankings")
          .delete()
          .eq("submission_id", submission.id);
      }

      const github = await fetchGithubSnapshot(submission.github_url);
      const scored: Array<{ label: string; score: number; reasoning: string }> = [];

      for (const criterion of allCriteria) {
        const result = await scoreCriterion({ submission, criterion, github });
        const { error } = await getSupabaseAdmin().from("criterion_scores").insert({
          submission_id: submission.id,
          criterion_id: criterion.id,
          score: result.score,
          reasoning: result.reasoning,
        });
        if (error) throw new Error(error.message);
        scored.push({
          label: criterion.label,
          score: result.score,
          reasoning: result.reasoning,
        });
      }

      const overall =
        scored.reduce((sum, s) => sum + s.score, 0) / Math.max(scored.length, 1);
      const summary_text = await generateSummary({ submission, scores: scored });

      // rankings may not have a unique constraint on submission_id; update-or-insert.
      const rankingPayload = {
        submission_id: submission.id,
        overall_score: Number(overall.toFixed(2)),
        rank: 0,
        status: "not_selected",
        summary_text,
        generated_at: new Date().toISOString(),
      };
      const { data: existingRanking } = await getSupabaseAdmin()
        .from("rankings")
        .select("id")
        .eq("submission_id", submission.id)
        .maybeSingle();
      if (existingRanking) {
        const { error } = await getSupabaseAdmin()
          .from("rankings")
          .update(rankingPayload)
          .eq("id", existingRanking.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await getSupabaseAdmin().from("rankings").insert(rankingPayload);
        if (error) throw new Error(error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${submission.name}: ${message}`);
    }
  }

  const { data: rankingRows, error: rankReadError } = await getSupabaseAdmin()
    .from("rankings")
    .select("*");
  if (rankReadError) {
    return NextResponse.json({ error: rankReadError.message }, { status: 500 });
  }

  const ordered = [...(rankingRows ?? [])].sort(
    (a, b) => Number(b.overall_score) - Number(a.overall_score)
  );

  for (let i = 0; i < ordered.length; i += 1) {
    const rank = i + 1;
    let status: RankingStatus = "not_selected";
    if (rank <= topN) status = "shortlisted";
    else if (rank <= topN + mentionsN) status = "honorable_mention";

    const { error } = await getSupabaseAdmin()
      .from("rankings")
      .update({ rank, status })
      .eq("id", ordered[i].id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    analyzed: toAnalyze.length,
    total: allSubmissions.length,
    ranked: ordered.length,
    errors,
  });
}
