import Anthropic from "@anthropic-ai/sdk";
import type { Criterion, Submission } from "@/lib/types";
import {
  snapshotToPromptBlock,
  type GithubRepoSnapshot,
} from "@/lib/github";

const MODEL = "claude-sonnet-4-6";

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }
  return new Anthropic({ apiKey: key });
}

async function complete(prompt: string) {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });
  const block = message.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : "";
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model did not return JSON");
  }
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

export async function scoreCriterion(params: {
  submission: Submission;
  criterion: Criterion;
  github: GithubRepoSnapshot | { error: string };
}) {
  const { submission, criterion, github } = params;
  const prompt = `You are scoring a job applicant's proof of work for a hiring shortlist.

Score ONLY this criterion, from 0 to 100 (integer).
Be honest and specific. Do not inflate scores. If evidence is missing, score lower and say so.

Criterion label: ${criterion.label}
Criterion description: ${criterion.description || "(no extra description)"}

Applicant:
- Name: ${submission.name}
- Email: ${submission.email}
- Live project URL: ${submission.project_url}
- GitHub URL: ${submission.github_url}
- LinkedIn: ${submission.linkedin_url || "(not provided)"}

GitHub repository evidence:
${snapshotToPromptBlock(github)}

Return JSON only, no markdown:
{"score": <0-100 integer>, "reasoning": "<1-2 sentences>"}`;

  const text = await complete(prompt);
  const parsed = extractJson(text);
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
  const reasoning =
    typeof parsed.reasoning === "string" && parsed.reasoning.trim()
      ? parsed.reasoning.trim()
      : "No reasoning returned.";
  return { score, reasoning };
}

export async function generateSummary(params: {
  submission: Submission;
  scores: Array<{ label: string; score: number; reasoning: string }>;
}) {
  const breakdown = params.scores
    .map((s) => `- ${s.label}: ${s.score}/100. ${s.reasoning}`)
    .join("\n");

  const prompt = `Write a 2-3 sentence hiring overview of this applicant's proof of work.
Be honest and plain-language: include real strengths and real weaknesses. No hype, no bullet points.

Applicant: ${params.submission.name}
Project: ${params.submission.project_url}
GitHub: ${params.submission.github_url}

Criterion scores:
${breakdown}

Return only the paragraph.`;

  return complete(prompt);
}
