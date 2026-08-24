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
end;
$$;