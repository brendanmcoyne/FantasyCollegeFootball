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
    all_rosters_full boolean;
begin
    select current_pick_number
    into current_pick
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
    set current_pick_number = current_pick + 1
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
    end if;
end;
$$;