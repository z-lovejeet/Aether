-- 0001_init.sql · Mastery Engine schema (docs/04-data-model.md §2)
create extension if not exists vector;

-- ============ profiles ============
create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  learning_dna jsonb not null default '{}'::jsonb,
  xp int not null default 0,
  streak int not null default 0,
  last_active date,
  created_at timestamptz not null default now()
);

-- ============ subjects ============
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  name text not null,
  hue int not null default 265 check (hue between 0 and 360),
  exam_date date,
  created_at timestamptz not null default now()
);
create index if not exists idx_subjects_user on subjects(user_id);

-- ============ materials ============
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('photo','pdf','text','audio','youtube')),
  raw_text text not null default '',
  storage_path text,
  created_at timestamptz not null default now()
);
create index if not exists idx_materials_subject on materials(subject_id);

-- ============ concepts ============
create table if not exists concepts (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials(id) on delete cascade,
  parent_id uuid references concepts(id) on delete set null,
  name text not null,
  description text not null default '',
  difficulty smallint not null default 3 check (difficulty between 1 and 5)
);
create index if not exists idx_concepts_material on concepts(material_id);

-- ============ mastery (SM-2 state) ============
create table if not exists mastery (
  concept_id uuid primary key references concepts(id) on delete cascade,
  ease_factor real not null default 2.5,
  interval_days real not null default 0,
  repetitions int not null default 0,
  due_date date not null default current_date,
  fail_count int not null default 0,
  last_strategy text
);
create index if not exists idx_mastery_due on mastery(due_date);

-- ============ quiz_items ============
create table if not exists quiz_items (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id) on delete cascade,
  question text not null,
  options jsonb,
  answer text not null,
  qtype text not null check (qtype in ('mcq','short','explain')),
  difficulty smallint not null default 3 check (difficulty between 1 and 5)
);
create index if not exists idx_quiz_items_concept on quiz_items(concept_id);

-- ============ attempts ============
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  quiz_item_id uuid not null references quiz_items(id) on delete cascade,
  correct boolean not null default false,
  partial boolean not null default false,
  response_text text not null default '',
  strategy_shown text,
  misconception text,
  created_at timestamptz not null default now()
);
create index if not exists idx_attempts_user_time on attempts(user_id, created_at desc);

-- ============ flashcards ============
create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id) on delete cascade,
  front text not null,
  back text not null,
  hint text not null default '',
  sm2 jsonb not null default '{}'::jsonb
);
create index if not exists idx_flashcards_concept on flashcards(concept_id);

-- ============ documents_chunks (RAG) ============
create table if not exists documents_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials(id) on delete cascade,
  content text not null,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_chunks_material on documents_chunks(material_id);

-- ============ agent_runs (LangGraph checkpoints / observability) ============
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  graph_state jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  node_timings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ Row Level Security ============
alter table profiles         enable row level security;
alter table subjects         enable row level security;
alter table materials        enable row level security;
alter table concepts         enable row level security;
alter table mastery          enable row level security;
alter table quiz_items       enable row level security;
alter table attempts         enable row level security;
alter table flashcards       enable row level security;
alter table documents_chunks enable row level security;
alter table agent_runs       enable row level security;

create policy "own profile"  on profiles for all using (auth.uid() = user_id);
create policy "own subjects" on subjects for all using (auth.uid() = user_id);
create policy "own attempts" on attempts for all using (auth.uid() = user_id);

-- child tables resolve ownership through subject -> material -> concept chains
create policy "own materials" on materials for all using (
  auth.uid() = (select s.user_id from subjects s where s.id = materials.subject_id));

create policy "own concepts" on concepts for all using (
  auth.uid() = (select s.user_id from materials m
                join subjects s on s.id = m.subject_id
                where m.id = concepts.material_id));

create policy "own mastery" on mastery for all using (
  auth.uid() = (select s.user_id from materials m
                join subjects s on s.id = m.subject_id
                join concepts c on c.material_id = m.id
                where c.id = mastery.concept_id));

create policy "own quiz" on quiz_items for all using (
  auth.uid() = (select s.user_id from materials m
                join subjects s on s.id = m.subject_id
                join concepts c on c.material_id = m.id
                where c.id = quiz_items.concept_id));

create policy "own cards" on flashcards for all using (
  auth.uid() = (select s.user_id from materials m
                join subjects s on s.id = m.subject_id
                join concepts c on c.material_id = m.id
                where c.id = flashcards.concept_id));

create policy "own chunks" on documents_chunks for all using (
  auth.uid() = (select s.user_id from materials m
                join subjects s on s.id = m.subject_id
                where m.id = documents_chunks.material_id));

-- service-role only in practice; tightened when JWT validation lands (Phase 1)
create policy "own runs" on agent_runs for all using (true);
