import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    phone?: string;
    email?: string;
    linkedin_url?: string;
    project_url?: string;
    github_url?: string;
  };

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const project_url = body.project_url?.trim() ?? "";
  const github_url = body.github_url?.trim() ?? "";
  const phone = body.phone?.trim() || null;
  const linkedin_url = body.linkedin_url?.trim() || null;

  if (!name || !email || !project_url || !github_url) {
    return NextResponse.json(
      { error: "Name, email, project URL, and GitHub URL are required." },
      { status: 400 }
    );
  }

  const { error } = await getSupabase().from("submissions").insert({
    name,
    phone,
    email,
    linkedin_url,
    project_url,
    github_url,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
