export type GithubRepoSnapshot = {
  owner: string;
  repo: string;
  htmlUrl: string;
  description: string | null;
  stars: number;
  defaultBranch: string;
  commitCount: number | null;
  firstCommitDate: string | null;
  lastCommitDate: string | null;
  commitSpanDays: number | null;
  commitMessageQuality: {
    sampleSize: number;
    averageLength: number;
    conventionalCount: number;
    emptyOrGenericCount: number;
    notes: string;
  };
  readmeExcerpt: string | null;
  folderStructure: string;
};

function parseGithubUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (!url.hostname.includes("github.com")) return null;
    const parts = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "").split("/");
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ProoFit",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function githubJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: githubHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function githubText(path: string, accept: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { ...githubHeaders(), Accept: accept },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.text();
}

type GithubRepo = {
  html_url: string;
  description: string | null;
  stargazers_count: number;
  default_branch: string;
};

type GithubCommit = {
  commit: { message: string; author?: { date?: string }; committer?: { date?: string } };
};

type GithubContent = {
  type: string;
  name: string;
  path: string;
};

const GENERIC_MESSAGES = new Set([
  "update",
  "updates",
  "fix",
  "fixes",
  "wip",
  "tmp",
  "misc",
  "changes",
  "initial commit",
  "first commit",
]);

function assessCommitMessages(messages: string[]) {
  if (messages.length === 0) {
    return {
      sampleSize: 0,
      averageLength: 0,
      conventionalCount: 0,
      emptyOrGenericCount: 0,
      notes: "No commit messages were available.",
    };
  }

  const conventional = /^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(\(.+\))?:/i;
  let conventionalCount = 0;
  let emptyOrGenericCount = 0;
  let totalLength = 0;

  for (const raw of messages) {
    const firstLine = raw.split("\n")[0]?.trim() ?? "";
    totalLength += firstLine.length;
    if (!firstLine || GENERIC_MESSAGES.has(firstLine.toLowerCase())) {
      emptyOrGenericCount += 1;
    }
    if (conventional.test(firstLine)) conventionalCount += 1;
  }

  const averageLength = Math.round(totalLength / messages.length);
  const notes = [
    `${messages.length} recent commit messages sampled.`,
    `${conventionalCount} used conventional-commit style.`,
    `${emptyOrGenericCount} were empty or generic.`,
    `Average first-line length: ${averageLength} characters.`,
  ].join(" ");

  return {
    sampleSize: messages.length,
    averageLength,
    conventionalCount,
    emptyOrGenericCount,
    notes,
  };
}

function formatTree(entries: GithubContent[]) {
  const dirs = entries.filter((e) => e.type === "dir").map((e) => e.name);
  const files = entries.filter((e) => e.type === "file").map((e) => e.name);
  const dirLines = dirs.map((name) => `/${name}/`);
  const fileLines = files.map((name) => `/${name}`);
  const listed = [...dirLines, ...fileLines].slice(0, 40);
  if (listed.length === 0) return "(empty or unavailable)";
  return listed.join("\n");
}

export async function fetchGithubSnapshot(
  githubUrl: string
): Promise<GithubRepoSnapshot | { error: string }> {
  const parsed = parseGithubUrl(githubUrl);
  if (!parsed) {
    return { error: `Could not parse GitHub URL: ${githubUrl}` };
  }

  const { owner, repo } = parsed;
  const repoData = await githubJson<GithubRepo>(`/repos/${owner}/${repo}`);
  if (!repoData) {
    return { error: `GitHub repo not found or not public: ${owner}/${repo}` };
  }

  const commits = (await githubJson<GithubCommit[]>(
    `/repos/${owner}/${repo}/commits?per_page=30`
  )) ?? [];

  const firstPageLink = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
    { headers: githubHeaders(), cache: "no-store" }
  );
  const link = firstPageLink.headers.get("link");
  let commitCount: number | null = null;
  const lastPage = link?.match(/page=(\d+)>; rel="last"/);
  if (lastPage) commitCount = Number(lastPage[1]);
  else if (commits.length) commitCount = commits.length;

  const dates = commits
    .map((c) => c.commit.committer?.date || c.commit.author?.date)
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);

  const firstCommitDate = dates[0] ? new Date(dates[0]).toISOString() : null;
  const lastCommitDate = dates.length
    ? new Date(dates[dates.length - 1]).toISOString()
    : null;
  const commitSpanDays =
    dates.length >= 2
      ? Math.max(0, Math.round((dates[dates.length - 1] - dates[0]) / 86_400_000))
      : dates.length === 1
        ? 0
        : null;

  const readmeRaw = await githubText(
    `/repos/${owner}/${repo}/readme`,
    "application/vnd.github.raw"
  );
  const readmeExcerpt = readmeRaw
    ? readmeRaw.slice(0, 4000)
    : null;

  const contents =
    (await githubJson<GithubContent[]>(
      `/repos/${owner}/${repo}/contents`
    )) ?? [];

  return {
    owner,
    repo,
    htmlUrl: repoData.html_url,
    description: repoData.description,
    stars: repoData.stargazers_count,
    defaultBranch: repoData.default_branch,
    commitCount,
    firstCommitDate,
    lastCommitDate,
    commitSpanDays,
    commitMessageQuality: assessCommitMessages(commits.map((c) => c.commit.message)),
    readmeExcerpt,
    folderStructure: formatTree(Array.isArray(contents) ? contents : []),
  };
}

export function snapshotToPromptBlock(
  snapshot: GithubRepoSnapshot | { error: string }
) {
  if ("error" in snapshot) {
    return `GitHub data unavailable: ${snapshot.error}`;
  }

  return [
    `Repo: ${snapshot.owner}/${snapshot.repo} (${snapshot.htmlUrl})`,
    `Description: ${snapshot.description ?? "(none)"}`,
    `Stars: ${snapshot.stars}`,
    `Default branch: ${snapshot.defaultBranch}`,
    `Commit count (approx): ${snapshot.commitCount ?? "unknown"}`,
    `Commit span (from sampled commits): ${snapshot.commitSpanDays ?? "unknown"} days`,
    `First sampled commit: ${snapshot.firstCommitDate ?? "unknown"}`,
    `Last sampled commit: ${snapshot.lastCommitDate ?? "unknown"}`,
    `Commit message quality: ${snapshot.commitMessageQuality.notes}`,
    `Top-level folder structure:\n${snapshot.folderStructure}`,
    `README excerpt:\n${snapshot.readmeExcerpt ?? "(no README found)"}`,
  ].join("\n");
}
