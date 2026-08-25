# 04 · Data Model & Schema
## Mastery Engine

---

## 1. GraphState (LangGraph shared state — TypeScript mirror)

```typescript
interface MasteryState {
  sessionId: string; userId: string; intent: Intent;
  // ingestion
  rawInput?: { type: 'photo'|'pdf'|'text'|'audio'|'youtube'; payload: unknown };
  cleanedText?: string; sourceMeta?: Record<string, unknown>;
  // concepts & assets
  conceptTree?: ConceptNode[];       // {id,name,parentId,difficulty,terms[]}
  generatedAssets?: {
    explainerMd?: string; cheatSheetMd?: string;
    flashcards?: Flashcard[]; quizItems?: QuizItem[];
  };
  // personalization
  learningDNA?: LearningProfile;     // behavioral + inferred
  strategyHistory?: Record<string, { strategy: StrategyId; worked: boolean }[]>;
  // mastery loop
  currentAttempt?: { conceptId: string; response: string };
  gradeResult?: { verdict:'correct'|'partial'|'wrong'; misconception?: string };
  remediationPlan?: RemediationStep[];
  sm2Updates?: SM2Update[];
  errors?: AgentError[]; retryCount: number;
  messages: BaseMessage[];
}

type LearningProfile = {
  goal: 'exam'|'coursework'|'selflearn'|'teaching';
  levelBySubject: Record<string, 'beginner'|'intermediate'|'advanced'>;
  explanationStyle: 'examples'|'analogies'|'steps'|'visual';
  interests: string[];               // cricket, gaming, music...
  sessionLengthMin: 5|15|30;
  cadence: 'daily'|'few_weekly'|'cram';
  modality: 'read'|'listen'|'both';
  language: string;                  // e.g. 'en', 'hi-en (Hinglish)'
  inferredTraits?: { bestStrategy?: StrategyId; paceHint?: string };
};

type StrategyId = 'analogy'|'visual'|'steps'|'simpler'|'story'|'different_interest';
```

## 2. Supabase Tables

```sql
profiles (
  user_id uuid PK refs auth.users,
  learning_dna jsonb NOT NULL DEFAULT '{}',
  xp int DEFAULT 0, streak int DEFAULT 0, last_active date,
  created_at timestamptz DEFAULT now()
)

subjects (
  id uuid PK DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles, name text, hue int,   -- aurora hue 0-360
  exam_date date NULL, created_at timestamptz DEFAULT now()
)

materials (
  id uuid PK, subject_id uuid REFERENCES subjects,
  title text, source_type text CHECK (source_type IN
    ('photo','pdf','text','audio','youtube')),
  raw_text text, storage_path text NULL, created_at timestamptz DEFAULT now()
)

concepts (
  id uuid PK, material_id uuid REFERENCES materials ON DELETE CASCADE,
  parent_id uuid NULL REFERENCES concepts, name text NOT NULL,
  description text, difficulty smallint CHECK (difficulty BETWEEN 1 AND 5)
)

mastery (
  concept_id uuid PK REFERENCES concepts ON DELETE CASCADE,
  ease_factor real DEFAULT 2.5, interval_days real DEFAULT 0,
  repetitions int DEFAULT 0, due_date date DEFAULT current_date,
  fail_count int DEFAULT 0, last_strategy text NULL
)

quiz_items (
  id uuid PK, concept_id uuid REFERENCES concepts ON DELETE CASCADE,
  question text, options jsonb NULL, answer text, qtype text
    CHECK (qtype IN ('mcq','short','explain')), difficulty smallint
)

attempts (
  id uuid PK, user_id uuid, quiz_item_id uuid REFERENCES quiz_items,
  correct boolean, partial boolean DEFAULT false, response_text text,
  strategy_shown text NULL, misconception text NULL,
  created_at timestamptz DEFAULT now()
)

flashcards (
  id uuid PK, concept_id uuid REFERENCES concepts ON DELETE CASCADE,
  front text, back text, hint text, sm2 jsonb DEFAULT '{}'
)

documents_chunks (            -- RAG for Chat Tutor
  id uuid PK, material_id uuid REFERENCES materials ON DELETE CASCADE,
  content text, embedding vector(768),
  metadata jsonb DEFAULT '{}' -- page/section refs for citations
)

agent_runs (                  -- LangGraph checkpoints / observability
  id uuid PK, session_id uuid, graph_state jsonb, status text,
  node_timings jsonb DEFAULT '{}', created_at timestamptz DEFAULT now()
)
```

**RLS:** every table has `user_id` (or resolves via join) with policy `auth.uid() = user_id`.

## 3. SM-2 Algorithm Spec (Scheduler Agent core)

```
For each review with quality q ∈ 0..5:
  if q >= 3:                       # passed
    reps == 0 → interval = 1 day
    reps == 1 → interval = 6 days
    else      → interval = round(prev_interval * EF)
    repetitions += 1
  else:                            # failed
    repetitions = 0; interval = 1; fail_count += 1
  EF' = max(1.3, EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02)))
Map verdicts: wrong→q=1, partial→q=3, correct(easy feel)→q=4/5.
```
Worked example (new concept): pass(4) → 1 d → pass(4) → 6 d → pass(3) → EF≈2.36 → ~14 d → …

## 4. Remediation Strategy Ladder (Remediation Coach state machine)

```
attempt order: analogy → visual → steps → simpler → story → different_interest
Rules: start from LearningDNA.explanationStyle-preferred strategy;
       on success write winning strategy to inferredTraits.bestStrategy;
       never repeat the immediately-failed strategy for that concept.
```
