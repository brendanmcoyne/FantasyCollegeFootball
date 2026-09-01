create or replace function public.populate_rosters_from_draft(
    target_league_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if exists (
        select 1
        from public.roster_units
        where league_id = target_league_id
    ) then
        return;
end if;

with ranked_picks as (
    select
        dp.league_id,
        dp.league_member_id,
        dp.college_team_id,
        dp.unit_type,
        dp.pick_number,

        row_number() over (
                partition by
                    dp.league_member_id,
                    dp.unit_type
                order by dp.pick_number
            ) as unit_rank

    from public.draft_picks dp
    where dp.league_id = target_league_id
),

     classified_picks as (
         select
             league_id,
             league_member_id,
             college_team_id,
             unit_type,

             case
                 when unit_type = 'PASSING'
                     and unit_rank <= 3 then 'STARTER'

                 when unit_type = 'RUSHING'
                     and unit_rank <= 3 then 'STARTER'

                 when unit_type = 'RECEIVING'
                     and unit_rank <= 3 then 'STARTER'

                 when unit_type = 'DEFENSE'
                     and unit_rank <= 2 then 'STARTER'

                 when unit_type = 'SPECIAL_TEAMS'
                     and unit_rank <= 2 then 'STARTER'

                 else 'BENCH'
                 end as roster_slot

         from ranked_picks
     )

insert into public.roster_units (
        league_id,
        league_member_id,
        college_team_id,
        unit_type,
        roster_slot,
        acquired_via
    )
select
    league_id,
    league_member_id,
    college_team_id,
    unit_type,
    roster_slot,
    'DRAFT'
from classified_picks;
end;
$$;

create or replace function public.make_draft_pick(
    target_league_id uuid,
    target_league_member_id uuid,
    target_college_team_id integer,
    target_unit_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
current_pick integer;
    current_turn integer;
    all_rosters_full boolean;
begin
select
    current_pick_number,
    current_turn_number
into
    current_pick,
    current_turn
from public.leagues
where id = target_league_id;

insert into public.draft_picks (
    league_id,
    league_member_id,
    college_team_id,
    unit_type,
    pick_number
)
values (
           target_league_id,
           target_league_member_id,
           target_college_team_id,
           target_unit_type,
           current_pick
       );

update public.leagues
set
    current_pick_number = current_pick + 1,
    current_turn_number = current_turn + 1
where id = target_league_id;

select bool_and(pick_count >= 16)
into all_rosters_full
from (
         select
             lm.id,
             count(dp.id) as pick_count
         from public.league_members lm
                  left join public.draft_picks dp
                            on dp.league_member_id = lm.id
                                and dp.league_id = lm.league_id
         where lm.league_id = target_league_id
         group by lm.id
     ) roster_counts;

if all_rosters_full then
update public.leagues
set draft_status = 'COMPLETED'
where id = target_league_id;

perform public.populate_rosters_from_draft(
            target_league_id
        );
end if;
end;
$$;

create or replace function public.swap_roster_units(
    target_league_id uuid,
    target_league_member_id uuid,
    bench_unit_id uuid,
    starter_unit_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
bench_type text;
    starter_type text;
begin
select unit_type
into bench_type
from public.roster_units
where id = bench_unit_id
  and league_id = target_league_id
  and league_member_id = target_league_member_id
  and roster_slot = 'BENCH';

if bench_type is null then
        raise exception 'Invalid bench unit';
end if;

select unit_type
into starter_type
from public.roster_units
where id = starter_unit_id
  and league_id = target_league_id
  and league_member_id = target_league_member_id
  and roster_slot = 'STARTER';

if starter_type is null then
        raise exception 'Invalid starter unit';
end if;

    if bench_type <> starter_type then
        raise exception 'Bench and starter units must be the same unit type';
end if;

update public.roster_units
set roster_slot = 'BENCH'
where id = starter_unit_id;

update public.roster_units
set roster_slot = 'STARTER'
where id = bench_unit_id;
end;
$$;

create or replace function public.make_free_agent_move(
    target_league_id uuid,
    target_league_member_id uuid,
    drop_roster_unit_id uuid,
    add_college_team_id integer,
    add_unit_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
passing_count integer;
    rushing_count integer;
    receiving_count integer;
    defense_count integer;
    special_teams_count integer;
    roster_count integer;

    dropped_team_id integer;
    dropped_unit_type text;
begin
    if add_unit_type not in (
        'PASSING',
        'RUSHING',
        'RECEIVING',
        'DEFENSE',
        'SPECIAL_TEAMS'
    ) then
        raise exception 'Invalid unit type';
end if;

    if not public.is_league_member(target_league_id) then
        raise exception 'You are not a member of this league';
end if;

    if not exists (
        select 1
        from public.league_members
        where id = target_league_member_id
          and league_id = target_league_id
          and user_id = auth.uid()
    ) then
        raise exception 'Invalid league member';
end if;

    if not exists (
        select 1
        from public.roster_units
        where id = drop_roster_unit_id
          and league_id = target_league_id
          and league_member_id = target_league_member_id
    ) then
        raise exception 'You do not own that unit';
end if;

    if exists (
        select 1
        from public.roster_units
        where league_id = target_league_id
          and college_team_id = add_college_team_id
          and unit_type = add_unit_type
    ) then
        raise exception 'That unit is already owned';
end if;

delete from public.roster_units
where id = drop_roster_unit_id;

insert into public.roster_units (
    league_id,
    league_member_id,
    college_team_id,
    unit_type,
    roster_slot,
    acquired_via
)
values (
           target_league_id,
           target_league_member_id,
           add_college_team_id,
           add_unit_type,
           'BENCH',
           'FREE_AGENCY'
       );

select
    count(*) filter (where unit_type = 'PASSING'),
        count(*) filter (where unit_type = 'RUSHING'),
        count(*) filter (where unit_type = 'RECEIVING'),
        count(*) filter (where unit_type = 'DEFENSE'),
        count(*) filter (where unit_type = 'SPECIAL_TEAMS'),
        count(*)
into
    passing_count,
    rushing_count,
    receiving_count,
    defense_count,
    special_teams_count,
    roster_count
from public.roster_units
where league_member_id = target_league_member_id;

if passing_count < 3
        or rushing_count < 3
        or receiving_count < 3
        or defense_count < 2
        or special_teams_count < 2
    then
        raise exception 'Move would violate roster minimums';
end if;

    if roster_count <> 16 then
        raise exception 'Roster must contain exactly 16 units';
end if;
end;
$$;

create or replace function public.move_roster_unit_to_starter(
    target_league_id uuid,
    target_league_member_id uuid,
    target_roster_unit_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
target_unit_type text;
    starter_count integer;
    starter_limit integer;
begin
    -- Verify this membership belongs to the logged-in user
    if not exists (
        select 1
        from public.league_members
        where id = target_league_member_id
          and league_id = target_league_id
          and user_id = auth.uid()
    ) then
        raise exception 'Invalid league member';
end if;

    -- Get the unit type and verify the unit is currently on this user's bench
select unit_type
into target_unit_type
from public.roster_units
where id = target_roster_unit_id
  and league_id = target_league_id
  and league_member_id = target_league_member_id
  and roster_slot = 'BENCH';

if target_unit_type is null then
        raise exception 'Invalid bench unit';
end if;

    starter_limit :=
        case target_unit_type
            when 'PASSING' then 3
            when 'RUSHING' then 3
            when 'RECEIVING' then 3
            when 'DEFENSE' then 2
            when 'SPECIAL_TEAMS' then 2
            else 0
end;

select count(*)
into starter_count
from public.roster_units
where league_id = target_league_id
  and league_member_id = target_league_member_id
  and unit_type = target_unit_type
  and roster_slot = 'STARTER';

if starter_count >= starter_limit then
        raise exception 'That starter position is already full';
end if;

update public.roster_units
set roster_slot = 'STARTER'
where id = target_roster_unit_id;
end;
$$;

create or replace function public.initialize_weekly_rosters(
    target_league_id uuid,
    target_week integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_league_member(target_league_id) then
        raise exception 'You are not a member of this league';
end if;

insert into public.weekly_rosters (
    league_id,
    league_member_id,
    week,
    college_team_id,
    unit_type,
    roster_slot,
    locked_at
)
select
    ru.league_id,
    ru.league_member_id,
    target_week,
    ru.college_team_id,
    ru.unit_type,
    ru.roster_slot,
    now()
from public.roster_units ru
where ru.league_id = target_league_id

    on conflict (
        league_id,
        league_member_id,
        week,
        college_team_id,
        unit_type
    )
    do nothing;
end;
$$;