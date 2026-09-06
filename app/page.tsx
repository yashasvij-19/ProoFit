"use client";

import { FormEvent, useState } from "react";

const fields = [
  { name: "name", label: "Name", type: "text", required: true, autoComplete: "name" },
  { name: "phone", label: "Phone", type: "tel", required: false, autoComplete: "tel" },
  { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
  {
    name: "linkedin_url",
    label: "LinkedIn URL",
    type: "url",
    required: false,
    placeholder: "https://linkedin.com/in/…",
  },
  {
    name: "project_url",
    label: "Project URL",
    hint: "Live proof of work",
    type: "url",
    required: true,
    placeholder: "https://…",
  },
  {
    name: "github_url",
    label: "GitHub URL",
    type: "url",
    required: true,
    placeholder: "https://github.com/you/repo",
  },
] as const;

export default function HomePage() {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setStatus("error");
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setStatus("done");
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-20 sm:py-28">
      <p className="mb-16 text-sm tracking-[0.18em] text-ink-400">PROOFIT</p>
      <h1 className="font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">
        Show the work.
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-500">
        Skip the pitch. Share a live project and the repo behind it.
      </p>

      {status === "done" ? (
        <p className="mt-16 border-t border-ink-200 pt-10 text-lg text-ink-700">
          Thanks — you&apos;ll hear back in a few days.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-14 space-y-6">
          {fields.map((field) => (
            <label key={field.name} className="block">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-700">
                  {field.label}
                  {!field.required && (
                    <span className="ml-2 text-ink-400">optional</span>
                  )}
                </span>
                {"hint" in field && field.hint ? (
                  <span className="text-xs text-ink-400">{field.hint}</span>
                ) : null}
              </span>
              <input
                name={field.name}
                type={field.type}
                required={field.required}
                autoComplete={"autoComplete" in field ? field.autoComplete : undefined}
                placeholder={"placeholder" in field ? field.placeholder : undefined}
                className="mt-2 w-full border-0 border-b border-ink-200 bg-transparent py-2.5 text-ink-900 outline-none transition placeholder:text-ink-200 focus:border-accent"
              />
            </label>
          ))}

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={status === "saving"}
            className="mt-4 w-full bg-ink-900 py-3 text-sm tracking-wide text-ink-50 transition hover:bg-accent disabled:opacity-50"
          >
            {status === "saving" ? "Submitting…" : "Submit"}
          </button>
        </form>
      )}
    </main>
  );
}
