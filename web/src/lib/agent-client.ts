/**
 * Typed client for the agents service (docs/13-api-contracts.md).
 * REST: start runs, fetch results · WS: stream node events.
 */

export const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL ?? "http://localhost:8000";

export type PipelineEvent = {
  event: "node_start" | "node_end" | "token" | "asset_ready" | "error" | "ping";
  node?: string;
  latencyMs?: number;
  data?: Record<string, unknown>;
  seq?: number;
};

export type ConceptNodeDto = {
  id: string;
  name: string;
  parentId: string | null;
  difficulty: number;
  terms: string[];
  keyFacts: string[];
};

export type LearningProfileDto = {
  goal: "exam" | "coursework" | "selflearn" | "teaching";
  levelBySubject: Record<string, "beginner" | "intermediate" | "advanced">;
  explanationStyle: "examples" | "analogies" | "steps" | "visual";
  interests: string[];
  sessionLengthMin: number;
  cadence: "daily" | "few_weekly" | "cram";
  modality: "read" | "listen" | "both";
  language: string;
  inferredTraits?: Record<string, unknown>;
};

export type QuizItemDto = {
  id?: string;
  conceptId: string;
  qtype: "mcq" | "short" | "explain";
  question: string;
  options: string[] | null;
  answer: string;
  difficulty: number;
};

export type FlashcardDto = {
  id?: string;
  conceptId: string;
  front: string;
  back: string;
  hint: string;
};

export type GeneratedAssetsDto = {
  explainerMd?: string;
  cheatSheetMd?: string;
  quizItems?: QuizItemDto[];
  flashcards?: FlashcardDto[];
};

export type RunResult = {
  status: string;
  sessionId?: string;
  result?: {
    cleanedText?: string;
    conceptTree?: ConceptNodeDto[];
    materialId?: string;
    learningDNA?: LearningProfileDto;
    generatedAssets?: GeneratedAssetsDto;
    sourceMeta?: Record<string, unknown>;
    errors?: { code: string; message: string; retryable?: boolean }[];
  };
  error?: string;
};

export async function startRun(
  sessionId: string,
  action: "upload_material" | "profile_update",
  payload: Record<string, unknown>,
): Promise<{ runId: string }> {
  const res = await fetch(`${AGENT_API_URL}/sessions/${sessionId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error(`run failed: ${await res.text()}`);
  return res.json();
}

export async function getRun(runId: string): Promise<RunResult> {
  const res = await fetch(`${AGENT_API_URL}/runs/${runId}`);
  if (!res.ok) throw new Error(`fetch run failed: ${await res.text()}`);
  return res.json();
}

/** Subscribe to a session's pipeline events. Returns an unsubscribe fn. */
export function subscribeToSession(
  sessionId: string,
  onEvent: (e: PipelineEvent) => void,
  onOpen?: () => void,
): () => void {
  const wsUrl = AGENT_API_URL.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsUrl}/ws/${sessionId}`);
  ws.onopen = () => onOpen?.();
  ws.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data as string) as PipelineEvent);
    } catch {
      /* ignore malformed frames */
    }
  };
  return () => ws.close();
}

export function pollRunUntilDone(runId: string, intervalMs = 1500): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const run = await getRun(runId);
        if (!["queued", "running"].includes(run.status)) {
          clearInterval(timer);
          resolve(run);
        }
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, intervalMs);
  });
}

/* ============ Phase 5: Grading API ============ */

export type MisconceptionDto = {
  type: string;
  evidenceQuote: string;
};

export type GradeResultDto = {
  verdict: "correct" | "partial" | "wrong";
  score: number;
  misconception: MisconceptionDto | null;
  feedbackMd: string;
};

export type SM2UpdateDto = {
  concept_id: string;
  quality: number;
  verdict: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  fail_count: number;
  due_date: string;
};

export type RemediationStepDto = {
  step: number;
  strategy: string | null;
  diagnosisMd?: string;
  reteachMd?: string;
  microCheckQuestion?: string;
  microCheckAnswer?: string;
  isComplete: boolean;
  rescued: boolean;
  messageMd?: string;
  totalSteps: number;
  triedStrategies?: string[];
};

export type RemediationCheckResultDto = {
  passed: boolean;
  rescued: boolean;
  feedbackMd: string;
  winningStrategy?: string;
  sm2?: SM2UpdateDto | null;
  celebrationMd?: string;
  parked?: boolean;
  messageMd?: string;
  nextStep?: RemediationStepDto;
};

export type AttemptResultDto = {
  grade: GradeResultDto;
  sm2: SM2UpdateDto | null;
  remediation?: RemediationStepDto | null;
};

export async function submitAnswer(
  sessionId: string,
  quizItemId: string,
  responseText: string,
): Promise<AttemptResultDto> {
  const res = await fetch(`${AGENT_API_URL}/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, quizItemId, responseText }),
  });
  if (!res.ok) throw new Error(`grading failed: ${await res.text()}`);
  return res.json();
}

export async function checkRemediation(
  sessionId: string,
  conceptId: string,
  quizItemId: string,
  strategy: string,
  microCheckAnswer: string,
  responseText: string,
  triedStrategies: string[],
): Promise<RemediationCheckResultDto> {
  const res = await fetch(`${AGENT_API_URL}/remediation/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      conceptId,
      quizItemId,
      strategy,
      microCheckAnswer,
      responseText,
      triedStrategies,
    }),
  });
  if (!res.ok) throw new Error(`remediation check failed: ${await res.text()}`);
  return res.json();
}

/* ============ Phase 7: Mind Map + Progress ============ */

export type MasteryDataDto = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string | null;
  failCount: number;
  lastStrategy: string | null;
};

export type MasteryNodeDto = {
  id: string;
  name: string;
  parentId: string | null;
  difficulty: number;
  description: string;
  mastery: MasteryDataDto;
};

export type MasteryMapDto = {
  nodes: MasteryNodeDto[];
};

export type ConceptProgressDto = {
  conceptId: string;
  name: string;
  easeFactor: number;
  intervalDays: number;
  dueDate: string | null;
  failCount: number;
  repetitions: number;
  status: "mastered" | "learning" | "weak" | "new";
};

export type StrategyStatDto = {
  strategy: string;
  total: number;
  successes: number;
  rate: number;
};

export type WeakConceptDto = {
  conceptId: string;
  name: string;
  failCount: number;
  easeFactor: number;
  dueDate: string | null;
  repetitions: number;
};

export type OverallStatsDto = {
  totalConcepts: number;
  mastered: number;
  learning: number;
  weak: number;
  new: number;
  totalAttempts: number;
  totalCorrect: number;
  totalPartial: number;
  totalWrong: number;
};

export type ProgressDto = {
  conceptProgress: ConceptProgressDto[];
  strategyStats: StrategyStatDto[];
  weakestConcepts: WeakConceptDto[];
  overallStats: OverallStatsDto;
};

export async function getMasteryMap(
  materialId: string,
): Promise<MasteryMapDto> {
  const res = await fetch(
    `${AGENT_API_URL}/materials/${materialId}/mastery-map`,
  );
  if (!res.ok) throw new Error(`mastery map failed: ${await res.text()}`);
  return res.json();
}

export async function getProgress(
  materialId: string,
): Promise<ProgressDto> {
  const res = await fetch(
    `${AGENT_API_URL}/materials/${materialId}/progress`,
  );
  if (!res.ok) throw new Error(`progress failed: ${await res.text()}`);
  return res.json();
}

/* ============ Phase 8: Chat Tutor RAG ============ */

export type ChatSourceDto = {
  chunkId: string;
  materialId: string;
  sectionRef: string;
  excerpt: string;
  similarity: number;
};

export type ChatResponseDto = {
  answerMd: string;
  sources: ChatSourceDto[];
  suggestedAction: string | null;
};

export async function sendChatMessage(
  sessionId: string,
  materialId: string,
  question: string,
): Promise<ChatResponseDto> {
  const res = await fetch(`${AGENT_API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, materialId, question }),
  });
  if (!res.ok) throw new Error(`chat query failed: ${await res.text()}`);
  return res.json();
}




