-- Handover schema (v2: real accounts, one lab per professor).
-- Paste into the Supabase SQL editor on a NEW project. Auth users live in Supabase's own auth.users table.

create table if not exists labs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references labs on delete cascade,
  auth_user_id uuid unique references auth.users on delete set null, -- set for professors; RAs use personal links
  name text not null,
  email text not null,
  role text not null check (role in ('professor','ra')),
  weekly_hours int not null default 10,
  max_tasks int not null default 5,
  status text not null default 'active' check (status in ('active','leaving')),
  leaving_on date,
  invited_at timestamptz,
  unique (lab_id, email)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references labs on delete cascade,
  name text not null,
  kind text not null check (kind in ('lab','thesis')),
  goal text,
  phase_template text[] not null,
  current_phase int not null default 1,
  deadline date
);

create table if not exists project_members (
  project_id uuid references projects on delete cascade,
  person_id uuid references people on delete cascade,
  primary key (project_id, person_id)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  phase int not null,
  title text not null,
  est_hours numeric not null default 1,
  assignee uuid references people on delete set null,
  status text not null default 'open' check (status in ('open','done')),
  due date
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people on delete cascade,
  week date not null,
  raw jsonb,
  parsed jsonb,
  token text unique not null,
  submitted_at timestamptz,
  reminders_sent int not null default 0,
  unique (person_id, week)
);

create table if not exists blockers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  phase int not null,
  person_id uuid references people on delete set null,
  quote text not null,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists overtime (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people on delete cascade,
  reason text not null,
  starts date not null,
  ends date not null,
  check (ends - starts <= 14)
);

create table if not exists handoffs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people on delete cascade,
  project_id uuid references projects on delete cascade,
  questions jsonb,
  thanks text,
  answers jsonb,
  brief jsonb,
  token text unique not null,
  status text not null default 'draft'
);

create table if not exists digests (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references labs on delete cascade,
  week date not null,
  text text not null,
  shared_at timestamptz,
  unique (lab_id, week)
);

-- Security model: the app talks to Postgres only from the server with the service-role key and checks
-- the signed-in professor's lab on every request. Turn RLS on with no policies so the public (anon)
-- key can never read these tables directly.
alter table labs enable row level security;
alter table people enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table checkins enable row level security;
alter table blockers enable row level security;
alter table overtime enable row level security;
alter table handoffs enable row level security;
alter table digests enable row level security;
