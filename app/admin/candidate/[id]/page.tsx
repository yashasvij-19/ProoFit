import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Criterion, CriterionScore, Submission } from "@/lib/types";

export const dynamic = "force-dynamic";

function Field({ label, value, href }: { label: string; value: string | null; href?: string | null }) {
  return (
    <div className="border-b border-ink-200 py-4">
      <p className="text-xs tracking-[0.14em] text-ink-400">{label}</p>
      {href && value ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block break-all text-ink-900 hover:text-accent"
        >
          {value}
        </a>
      ) : (
        <p className="mt-1 text-ink-900">{value || "—"}</p>
      )}
    </div>
  );
}

export default async function CandidatePage({
  params,
}: {
  params: { id: string };
}) {
  const { data: submission } = await getSupabaseAdmin()
    .from("submissions")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!submission) notFound();
  const person = submission as Submission;

  const [{ data: ranking }, { data: scores }, { data: criteria }] = await Promise.all([
    getSupabaseAdmin()
      .from("rankings")
      .select("*")
      .eq("submission_id", params.id)
      .maybeSingle(),
    getSupabaseAdmin().from("criterion_scores").select("*").eq("submission_id", params.id),
    getSupabaseAdmin().from("criteria").select("*"),
  ]);

  const criteriaById = new Map(
    ((criteria ?? []) as Criterion[]).map((c) => [c.id, c])
  );
  const breakdown = ((scores ?? []) as CriterionScore[])
    .map((s) => ({
      ...s,
      label: criteriaById.get(s.criterion_id)?.label ?? "Unknown criterion",
      description: criteriaById.get(s.criterion_id)?.description ?? null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const statusLabel =
    ranking?.status === "shortlisted"
      ? "Shortlisted"
      : ranking?.status === "honorable_mention"
        ? "Honorable mention"
        : ranking?.status === "not_selected"
          ? "Not selected"
          : "Not ranked";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/admin" className="text-sm text-ink-400 hover:text-ink-900">
        ← Shortlist
      </Link>

      <p className="mt-10 text-sm text-ink-400">
        {statusLabel}
        {ranking?.rank != null ? ` · Rank ${ranking.rank}` : ""}
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-4xl">{person.name}</h1>
        <p className="font-serif text-4xl text-accent">
          {ranking?.overall_score != null ? Math.round(Number(ranking.overall_score)) : "—"}
        </p>
      </div>

      {ranking?.summary_text ? (
        <p className="mt-8 text-lg leading-relaxed text-ink-700">{ranking.summary_text}</p>
      ) : (
        <p className="mt-8 text-ink-400">No AI summary yet. Run analysis from the dashboard.</p>
      )}

      <section className="mt-14">
        <h2 className="text-sm tracking-[0.14em] text-ink-400">SUBMISSION</h2>
        <div className="mt-4">
          <Field label="NAME" value={person.name} />
          <Field label="PHONE" value={person.phone} />
          <Field label="EMAIL" value={person.email} href={`mailto:${person.email}`} />
          <Field label="LINKEDIN" value={person.linkedin_url} href={person.linkedin_url} />
          <Field label="PROJECT" value={person.project_url} href={person.project_url} />
          <Field label="GITHUB" value={person.github_url} href={person.github_url} />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-sm tracking-[0.14em] text-ink-400">CRITERIA</h2>
        {breakdown.length === 0 ? (
          <p className="mt-4 text-ink-400">No scores yet.</p>
        ) : (
          <ul className="mt-6 space-y-8">
            {breakdown.map((item) => (
              <li key={item.id}>
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-ink-900">{item.label}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm text-ink-400">{item.description}</p>
                    ) : null}
                  </div>
                  <p className="font-serif text-2xl">{Math.round(Number(item.score))}%</p>
                </div>
                <div className="mt-3 h-1 bg-ink-200">
                  <div
                    className="h-1 bg-accent"
                    style={{ width: `${Math.max(0, Math.min(100, Number(item.score)))}%` }}
                  />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">{item.reasoning}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
