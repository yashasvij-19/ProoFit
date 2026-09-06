export type Submission = {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  linkedin_url: string | null;
  project_url: string;
  github_url: string;
  submitted_at: string;
};

export type Criterion = {
  id: string;
  label: string;
  description: string | null;
  created_at: string;
};

export type Settings = {
  id: string;
  top_n: number;
  honorable_mentions_n: number;
  updated_at: string;
};

export type CriterionScore = {
  id: string;
  submission_id: string;
  criterion_id: string;
  score: number;
  reasoning: string;
  scored_at: string;
};

export type RankingStatus = "shortlisted" | "honorable_mention" | "not_selected";

export type Ranking = {
  id: string;
  submission_id: string;
  overall_score: number;
  rank: number;
  status: RankingStatus;
  summary_text: string;
  generated_at: string;
};

export type RankedSubmission = Submission & {
  overall_score: number | null;
  rank: number | null;
  status: RankingStatus | null;
  summary_text: string | null;
};

export type CandidateDetail = Submission & {
  overall_score: number | null;
  rank: number | null;
  status: RankingStatus | null;
  summary_text: string | null;
  scores: Array<
    CriterionScore & {
      label: string;
      description: string | null;
    }
  >;
};
