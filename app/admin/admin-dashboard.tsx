"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Criterion, RankedSubmission, Settings } from "@/lib/types";

function scoreLabel(value: number | null) {
  if (value == null) return "—";
  return `${Math.round(value)}`;
}

function CandidateRow({
  item,
  emphasis,
}: {
  item: RankedSubmission;
  emphasis: "gold" | "muted" | "plain";
}) {
  const border =
    emphasis === "gold"
      ? "border-accent-muted bg-accent-faint/60"
      : emphasis === "muted"
        ? "border-ink-200 bg-white"
        : "border-transparent bg-transparent";

  return (
    <Link
      href={`/admin/candidate/${item.id}`}
      className={`block border px-4 py-4 transition hover:border-accent ${border}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-ink-900">
            {item.rank != null && (
              <span className="mr-3 text-sm text-ink-400">{item.rank}</span>
            )}
            {item.name}
          </p>
          <p className="mt-1 line-clamp-1 text-sm text-ink-500">
            {item.summary_text || "Not analyzed yet."}
          </p>
        </div>
        <p className="shrink-0 font-serif text-2xl text-ink-900">
          {scoreLabel(item.overall_score)}
        </p>
      </div>
    </Link>
  );
}

export default function AdminDashboard({
  initialCriteria,
  initialSettings,
  initialSubmissions,
}: {
  initialCriteria: Criterion[];
  initialSettings: Pick<Settings, "top_n" | "honorable_mentions_n">;
  initialSubmissions: RankedSubmission[];
}) {
  const router = useRouter();
  const [criteria, setCriteria] = useState(initialCriteria);
  const [settings, setSettings] = useState(initialSettings);
  const submissions = initialSubmissions;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [remainingOpen, setRemainingOpen] = useState(false);

  useEffect(() => {
    setCriteria(initialCriteria);
    setSettings(initialSettings);
  }, [initialCriteria, initialSettings]);

  const grouped = useMemo(() => {
    const shortlisted = submissions
      .filter((s) => s.status === "shortlisted")
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    const mentions = submissions
      .filter((s) => s.status === "honorable_mention")
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    const rest = submissions.filter(
      (s) => s.status !== "shortlisted" && s.status !== "honorable_mention"
    );
    return { shortlisted, mentions, rest };
  }, [submissions]);

  const hasResults = submissions.some((s) => s.rank != null);

  async function addCriterion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const res = await fetch("/api/criteria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: data.get("label"),
        description: data.get("description"),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Could not add criterion");
      return;
    }
    setCriteria((prev) => [...prev, json.criterion]);
    form.reset();
  }

  async function deleteCriterion(id: string) {
    const res = await fetch(`/api/criteria?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      setMessage(json.error || "Could not delete");
      return;
    }
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        top_n: Number(data.get("top_n")),
        honorable_mentions_n: Number(data.get("honorable_mentions_n")),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Could not save settings");
      return;
    }
    setSettings({
      top_n: json.settings.top_n,
      honorable_mentions_n: json.settings.honorable_mentions_n,
    });
    setMessage("Shortlist sizes saved.");
  }

  async function analyze(reanalyze: boolean) {
    setBusy(true);
    setMessage(reanalyze ? "Re-analyzing all submissions…" : "Analyzing new submissions…");
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reanalyze }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error || "Analysis failed");
      return;
    }
    const extra =
      json.errors?.length > 0 ? ` Issues: ${json.errors.join("; ")}` : "";
    setMessage(`Analyzed ${json.analyzed} of ${json.total}.${extra}`);
    router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.replace("/admin/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm tracking-[0.18em] text-ink-400">PROOFIT</p>
          <h1 className="mt-3 font-serif text-4xl">Shortlist</h1>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-ink-400 hover:text-ink-900"
        >
          Sign out
        </button>
      </header>

      <section className="mt-16">
        <h2 className="text-sm tracking-[0.14em] text-ink-400">CRITERIA</h2>
        <form onSubmit={addCriterion} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-1">
            <span className="text-sm text-ink-700">Label</span>
            <input
              name="label"
              required
              placeholder="Code cleanliness"
              className="mt-2 w-full border-0 border-b border-ink-200 bg-transparent py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="text-sm text-ink-700">Description</span>
            <input
              name="description"
              placeholder="Well-structured, readable code"
              className="mt-2 w-full border-0 border-b border-ink-200 bg-transparent py-2 outline-none focus:border-accent"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="text-sm text-accent hover:text-ink-900"
            >
              Add criterion
            </button>
          </div>
        </form>

        <ul className="mt-8 divide-y divide-ink-200 border-y border-ink-200">
          {criteria.length === 0 ? (
            <li className="py-4 text-sm text-ink-400">No criteria yet.</li>
          ) : (
            criteria.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-ink-900">{c.label}</p>
                  {c.description ? (
                    <p className="mt-1 text-sm text-ink-500">{c.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => deleteCriterion(c.id)}
                  className="text-sm text-ink-400 hover:text-red-700"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>

        <form onSubmit={saveSettings} className="mt-10 grid gap-6 sm:grid-cols-2">
          <label>
            <span className="text-sm text-ink-700">How many to shortlist</span>
            <input
              name="top_n"
              type="number"
              min={0}
              defaultValue={settings.top_n}
              className="mt-2 w-full border-0 border-b border-ink-200 bg-transparent py-2 outline-none focus:border-accent"
            />
          </label>
          <label>
            <span className="text-sm text-ink-700">Honorable mentions</span>
            <input
              name="honorable_mentions_n"
              type="number"
              min={0}
              defaultValue={settings.honorable_mentions_n}
              className="mt-2 w-full border-0 border-b border-ink-200 bg-transparent py-2 outline-none focus:border-accent"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="text-sm text-accent hover:text-ink-900">
              Save sizes
            </button>
          </div>
        </form>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => analyze(false)}
            className="bg-ink-900 px-6 py-3 text-sm tracking-wide text-ink-50 hover:bg-accent disabled:opacity-50"
          >
            Analyze & Rank Submissions
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => analyze(true)}
            className="px-2 py-3 text-sm text-ink-400 hover:text-ink-900 disabled:opacity-50"
          >
            Re-analyze all
          </button>
        </div>
        {message ? <p className="mt-4 text-sm text-ink-500">{message}</p> : null}
      </section>

      <section className="mt-20">
        <h2 className="text-sm tracking-[0.14em] text-ink-400">RESULTS</h2>
        {!hasResults ? (
          <p className="mt-6 text-ink-500">Run analysis to see ranked candidates.</p>
        ) : (
          <div className="mt-8 space-y-12">
            <div>
              <h3 className="mb-4 font-serif text-2xl">Shortlisted</h3>
              <div className="space-y-3">
                {grouped.shortlisted.length === 0 ? (
                  <p className="text-sm text-ink-400">None yet.</p>
                ) : (
                  grouped.shortlisted.map((item) => (
                    <CandidateRow key={item.id} item={item} emphasis="gold" />
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg text-ink-700">Honorable mentions</h3>
              <div className="space-y-3">
                {grouped.mentions.length === 0 ? (
                  <p className="text-sm text-ink-400">None yet.</p>
                ) : (
                  grouped.mentions.map((item) => (
                    <CandidateRow key={item.id} item={item} emphasis="muted" />
                  ))
                )}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setRemainingOpen((v) => !v)}
                className="text-sm text-ink-400 hover:text-ink-900"
              >
                Remaining ({grouped.rest.length}) {remainingOpen ? "–" : "+"}
              </button>
              {remainingOpen ? (
                <div className="mt-4 space-y-2">
                  {grouped.rest.map((item) => (
                    <CandidateRow key={item.id} item={item} emphasis="plain" />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
