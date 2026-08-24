create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text,
    display_name text,
    avatar_url text,
    created_at timestamptz default now()
);

create table leagues (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    join_code text unique not null,
    commissioner_id uuid not null references profiles(id) on delete cascade,
    created_at timestamptz default now()
);

create table league_members (
    id uuid primary key default gen_random_uuid(),
    league_id uuid not null references leagues(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    team_name text,
    joined_at timestamptz default now(),

    unique (league_id, user_id)
);