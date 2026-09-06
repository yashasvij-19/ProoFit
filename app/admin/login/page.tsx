"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error || "Incorrect password");
      setSaving(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="text-sm tracking-[0.18em] text-ink-400">PROOFIT</p>
      <h1 className="mt-6 font-serif text-4xl text-ink-900">Admin</h1>
      <form onSubmit={onSubmit} className="mt-10 space-y-6">
        <label className="block">
          <span className="text-sm text-ink-700">Password</span>
          <input
            name="password"
            type="password"
            required
            autoFocus
            className="mt-2 w-full border-0 border-b border-ink-200 bg-transparent py-2.5 outline-none focus:border-accent"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-ink-900 py-3 text-sm tracking-wide text-ink-50 hover:bg-accent disabled:opacity-50"
        >
          {saving ? "Signing in…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
