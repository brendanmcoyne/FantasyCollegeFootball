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

    draft_status text not null default 'NOT_STARTED'
    check (
        draft_status in (
            'NOT_STARTED',
            'IN_PROGRESS',
            'COMPLETED'
        )
    ),

    current_pick_number integer not null default 1,
);

create table league_members (
    id uuid primary key default gen_random_uuid(),
    league_id uuid not null references leagues(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    team_name text,
    joined_at timestamptz default now(),

    unique (league_id, user_id)
);

create table public.draft_picks (
    id uuid primary key default gen_random_uuid(),

    league_id uuid not null
        references public.leagues(id)
        on delete cascade,

    league_member_id uuid not null
        references public.league_members(id)
        on delete cascade,

    college_team_id integer not null,
        unit_type text not null
            check (
                unit_type in (
                    'PASSING',
                    'RUSHING',
                    'RECEIVING',
                    'DEFENSE',
                    'SPECIAL_TEAMS'
                )
            ),

    pick_number integer,
    created_at timestamptz default now(),

    unique (
        league_id,
        college_team_id,
        unit_type
    )
);

create table public.draft_order (
    id uuid primary key default gen_random_uuid(),

    league_id uuid not null
        references public.leagues(id)
        on delete cascade,

    league_member_id uuid not null
        references public.league_members(id)
        on delete cascade,

    draft_position integer not null,

    unique (league_id, league_member_id),
    unique (league_id, draft_position)
);