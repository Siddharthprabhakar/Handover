-- Handover schema. Paste into the Supabase SQL editor, then run `npm run seed`.
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  role text not null check (role in ('professor','ra')),
  weekly_hours int not null default 10,
  max_tasks int not null default 5,
  status text not null default 'active' check (status in ('active','leaving')),
  leaving_on date
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
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
  assignee uuid references people,
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
  reminders_sent int not null default 0
);

create table if not exists blockers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  phase int not null,
  person_id uuid references people,
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

-- Demo: row level security off. Keys stay on the server.
