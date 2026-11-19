-- Family tournaments (Baloot or any other game): admin creates tournaments, family members register from the tree.
create table if not exists public.tournaments(
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 2 and 80),
  game text not null default 'بلوت' check (char_length(game) between 1 and 40),
  team_size smallint not null default 2 check (team_size in (1,2)),
  starts_at timestamptz,
  place text check (char_length(place) <= 120),
  reg_deadline timestamptz,
  match_rule text check (char_length(match_rule) <= 60),
  rules text check (char_length(rules) <= 3000),
  status text not null default 'draft' check (status in ('draft','open','closed','done')),
  archived boolean not null default false,  -- "delete" from the admin panel = archive (hidden from everyone)
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tournament_entries(
  id bigint generated always as identity primary key,
  tournament_id bigint not null references public.tournaments(id),
  kind text not null check (kind in ('team','solo')),  -- solo = registered alone in a 2-player tournament, waiting for a partner
  p1_id bigint not null references public.persons(id),
  p2_id bigint references public.persons(id),
  team_name text check (char_length(team_name) <= 30),
  phone text not null,
  phone2 text,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);
create index if not exists tournament_entries_tid on public.tournament_entries(tournament_id);
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;

create policy tour_read on public.tournaments for select to anon, authenticated
  using (private.is_admin() or (status <> 'draft' and not archived and private.site_visible()));
create policy tour_insert on public.tournaments for insert to authenticated with check (private.is_admin());
create policy tour_update on public.tournaments for update to authenticated using (private.is_admin()) with check (private.is_admin());
-- entries hold phone numbers: only the admin reads them directly; the public goes through get_tournament()
create policy tent_read on public.tournament_entries for select to authenticated using (private.is_admin());
create policy tent_update on public.tournament_entries for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- who can play: living men who are public in the tree
create or replace function private.tour_eligible(p bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.persons x where x.id = p and x.gender = 'm' and x.visibility = 'public'
                and not coalesce(x.is_dead,false) and x.death_year is null)
$$;

-- list of tournaments for the public hub (staff also see drafts)
create or replace function public.list_tournaments()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when private.site_visible() then coalesce(jsonb_agg(jsonb_build_object(
    'id',t.id,'title',t.title,'game',t.game,'team_size',t.team_size,'status',t.status,'starts_at',t.starts_at,'place',t.place,'reg_deadline',t.reg_deadline,
    'count',(select count(*) from public.tournament_entries e where e.tournament_id = t.id and e.status <> 'rejected'))
    order by (t.status = 'open') desc, t.id desc), '[]'::jsonb) end
  from public.tournaments t where not t.archived and (private.is_admin() or t.status <> 'draft')
$$;

-- one tournament (by id, or the newest visible one), entries WITHOUT phone numbers, and who is eligible
create or replace function public.get_tournament(p_id bigint default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare t public.tournaments; adm boolean := private.is_admin();
begin
  if not private.site_visible() then return null; end if;
  select * into t from public.tournaments x
   where not x.archived and (adm or x.status <> 'draft') and (p_id is null or x.id = p_id)
   order by (x.status = 'open') desc, x.id desc limit 1;
  if t.id is null then return null; end if;
  return jsonb_build_object(
    't', jsonb_build_object('id',t.id,'title',t.title,'game',t.game,'team_size',t.team_size,'starts_at',t.starts_at,'place',t.place,
                           'reg_deadline',t.reg_deadline,'match_rule',t.match_rule,'rules',t.rules,'status',t.status),
    'entries', coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'p1',e.p1_id,'p2',e.p2_id,'team_name',e.team_name,'status',e.status) order by e.id)
                from public.tournament_entries e where e.tournament_id = t.id and e.status <> 'rejected'), '[]'::jsonb),
    'eligible', coalesce((select jsonb_agg(x.id) from public.persons x where private.tour_eligible(x.id)), '[]'::jsonb));
end $$;

create or replace function public.tournament_register(p_tid bigint, p_p1 bigint, p_p2 bigint, p_team text, p_phone text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.tournaments; ph text; tn text; new_id bigint; k text;
begin
  if not private.site_visible() then raise exception 'الموقع متوقف حاليًا'; end if;
  select * into t from public.tournaments x where x.id = p_tid and not x.archived for update;
  if t.id is null or (t.status = 'draft' and not private.is_admin()) then raise exception 'البطولة غير موجودة'; end if;
  if t.status <> 'open' and not (t.status = 'draft' and private.is_admin()) then raise exception 'التسجيل مغلق'; end if;
  if t.reg_deadline is not null and now() > t.reg_deadline then raise exception 'انتهى موعد التسجيل'; end if;
  if t.team_size = 1 then p_p2 := null; end if;
  if p_p1 is null or not private.tour_eligible(p_p1) then raise exception 'اختر اسم اللاعب من الشجرة'; end if;
  if p_p2 is not null and not private.tour_eligible(p_p2) then raise exception 'اختر اسم الشريك من الشجرة'; end if;
  if p_p1 = p_p2 then raise exception 'اختر شريكًا غير نفسك'; end if;
  if exists(select 1 from public.tournament_entries e where e.tournament_id = t.id and e.status <> 'rejected'
            and (e.p1_id in (p_p1, p_p2) or e.p2_id in (p_p1, p_p2))) then
    raise exception 'مسجّل مسبقًا في هذه البطولة';
  end if;
  ph := regexp_replace(translate(coalesce(p_phone,''), '٠١٢٣٤٥٦٧٨٩', '0123456789'), '\D', '', 'g');
  if ph ~ '^9665\d{8}$' then ph := '0' || substr(ph, 4); elsif ph ~ '^5\d{8}$' then ph := '0' || ph; end if;
  if ph !~ '^05\d{8}$' then raise exception 'اكتب رقم جوال صحيح يبدأ بـ 05'; end if;
  tn := nullif(btrim(coalesce(p_team,'')), '');
  if char_length(tn) > 30 then raise exception 'اسم الفريق طويل، اختصره إلى 30 حرفًا'; end if;
  if (select count(*) from public.tournament_entries e where e.created_at > now() - interval '1 hour') > 150 then
    raise exception 'عدد كبير من الطلبات، حاول بعد قليل';
  end if;
  k := case when t.team_size = 2 and p_p2 is null then 'solo' else 'team' end;
  insert into public.tournament_entries(tournament_id, kind, p1_id, p2_id, team_name, phone)
  values (t.id, k, p_p1, p_p2, case when k = 'team' and t.team_size = 2 then tn end, ph)
  returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

-- admin: join two players who registered alone into one team (the second entry is closed, not removed)
create or replace function public.tournament_pair(p_a bigint, p_b bigint, p_team text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.tournament_entries; b public.tournament_entries; who text;
begin
  if not private.is_admin() then raise exception 'غير مصرح'; end if;
  select * into a from public.tournament_entries where id = p_a for update;
  select * into b from public.tournament_entries where id = p_b for update;
  if a.id is null or b.id is null or a.id = b.id or a.tournament_id <> b.tournament_id
     or a.kind <> 'solo' or b.kind <> 'solo' or a.status = 'rejected' or b.status = 'rejected' then
    raise exception 'اختر لاعبَين منفردَين من نفس البطولة';
  end if;
  who := (select s.display_name from public.staff s where s.email = private.my_email());
  update public.tournament_entries set kind = 'team', p2_id = b.p1_id, phone2 = b.phone,
    team_name = nullif(left(btrim(coalesce(p_team,'')),30),''), status = 'approved', decided_at = now(), decided_by = who
  where id = a.id;
  update public.tournament_entries set status = 'rejected', note = 'دُمج في فريق #' || a.id, decided_at = now(), decided_by = who
  where id = b.id;
  return jsonb_build_object('ok', true);
end $$;
