alter table profiles enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;


create policy "Users can read profiles"
on profiles
for select
to authenticated
using (true);


create policy "Users can update their own profile"
on profiles
for update
to authenticated
using (
    auth.uid() = id
);


create policy "Authenticated users can create leagues"
on leagues
for insert
to authenticated
with check (
    auth.uid() = commissioner_id
);


create policy "Commissioners can view their leagues"
on leagues
for select
to authenticated
using (
    auth.uid() = commissioner_id
);


create policy "Users can join leagues"
on league_members
for insert
to authenticated
with check (
    auth.uid() = user_id
);


create or replace function public.is_league_member(target_league_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
select exists (
    select 1
    from public.league_members
    where league_id = target_league_id
      and user_id = auth.uid()
);
$$;

create policy "League members can view league members"
on public.league_members
for select
to authenticated
using (
    public.is_league_member(league_id)
);

create policy "Users can create their own leagues"
on public.leagues
for insert
to authenticated
with check (
    auth.uid() = commissioner_id
);

create policy "Authenticated users can view leagues"
on public.leagues
for select
to authenticated
using (true);

create policy "League members can view draft picks"
on public.draft_picks
for select
to authenticated
using (
    public.is_league_member(league_id)
);

create policy "League members can make draft picks"
on public.draft_picks
for insert
to authenticated
with check (
    public.is_league_member(league_id)
);

create policy "League members can view draft order"
on public.draft_order
for select
to authenticated
using (
    public.is_league_member(league_id)
);

create policy "Commissioners can create draft order"
on public.draft_order
for insert
to authenticated
with check (
    exists (
        select 1
        from public.leagues
        where leagues.id = draft_order.league_id
        and leagues.commissioner_id = auth.uid()
    )
);

create policy "League members can view roster units"
on public.roster_units
for select
                      to authenticated
                      using (
                      public.is_league_member(league_id)
                      );