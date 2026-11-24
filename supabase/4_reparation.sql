-- =====================================================================
--  RÉPARATION : règles d'accès + autorisations pour le site
--  Contient tout le script n°2 (qui peut être relancé sans risque) + les autorisations
--  que les projets Supabase récents demandent. À coller dans SQL Editor, puis « Run ».
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. ON REPART PROPRE (si une ancienne version de ce script a déjà été lancée)
-- ---------------------------------------------------------------------
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I', r.policyname, r.tablename);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 1. LES RÔLES
--    membre    : par défaut. Voit tout (chiffres, CR, noms) mais ne modifie rien.
--    dirigeant : voit tout et modifie SON pôle uniquement. C'est l'admin qui le désigne.
--    admin     : toi. Tu désignes les dirigeants et tu peux corriger tous les pôles.
--    Personne ne peut se donner un rôle tout seul.
-- ---------------------------------------------------------------------
alter table comptes drop constraint if exists comptes_role_check;
update comptes set role = 'membre' where role not in ('admin', 'dirigeant', 'membre');
alter table comptes alter column role set default 'membre';
alter table comptes add constraint comptes_role_check
  check (role in ('admin', 'dirigeant', 'membre'));


-- ---------------------------------------------------------------------
-- 2. CHAQUE NOUVEAU COMPTE EST CRÉÉ AUTOMATIQUEMENT
--    Il arrive « membre » : il peut tout lire, mais rien modifier.
-- ---------------------------------------------------------------------
create or replace function public.creer_compte() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.comptes (id, email, nom)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists nouveau_compte on auth.users;
create trigger nouveau_compte after insert on auth.users
  for each row execute function public.creer_compte();


-- ---------------------------------------------------------------------
-- 3. PETITES QUESTIONS QUE LA BASE SE POSE À CHAQUE DEMANDE
-- ---------------------------------------------------------------------
-- « Quel est le rôle de la personne connectée ? »
create or replace function public.mon_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from comptes where id = auth.uid()), 'visiteur')
$$;

-- « A-t-elle le droit de modifier ce pôle ? » → oui si c'est un dirigeant de CE pôle (ou l'admin)
create or replace function public.acces_pole(p int) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select role = 'admin' or (role = 'dirigeant' and pole_id = p)
    from comptes where id = auth.uid()
  ), false)
$$;

-- « A-t-elle un compte ? » → elle peut alors tout lire
create or replace function public.est_membre() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from comptes where id = auth.uid())
$$;


-- ---------------------------------------------------------------------
-- 4. LES PORTES DE CHAQUE TIROIR
-- ---------------------------------------------------------------------

-- Listes fixes (pôles, campagnes, types) : tout le monde lit, seule l'admin modifie
create policy "lecture publique" on poles                for select using (true);
create policy "lecture publique" on campagnes            for select using (true);
create policy "lecture publique" on types_evangelisation for select using (true);
create policy "gestion" on poles                for all using (mon_role() = 'admin') with check (mon_role() = 'admin');
create policy "gestion" on campagnes            for all using (mon_role() = 'admin') with check (mon_role() = 'admin');
create policy "gestion" on types_evangelisation for all using (mon_role() = 'admin') with check (mon_role() = 'admin');

-- Actions (CR) : tous les membres lisent ; on écrit seulement sur son pôle
create policy "lecture membres" on actions for select using (est_membre());
create policy "ecriture pole"   on actions for insert with check (acces_pole(pole_id));
create policy "modif pole"      on actions for update using (acces_pole(pole_id)) with check (acces_pole(pole_id));
create policy "suppr pole"      on actions for delete using (acces_pole(pole_id));

-- Frères présents : suivent les droits de leur action
create policy "lecture membres" on presents for select using (est_membre());
create policy "ecriture pole"   on presents for all
  using      (acces_pole((select pole_id from actions a where a.id = action_id)))
  with check (acces_pole((select pole_id from actions a where a.id = action_id)));

-- Personnes : tous les membres lisent ; on modifie seulement son pôle
create policy "lecture membres" on personnes for select using (est_membre());
create policy "ecriture pole"   on personnes for insert with check (acces_pole(pole_id));
create policy "modif pole"      on personnes for update using (acces_pole(pole_id)) with check (acces_pole(pole_id));
create policy "suppr pole"      on personnes for delete using (acces_pole(pole_id));

-- Invitations : tous les membres lisent ; on modifie seulement si l'action est de son pôle
create policy "lecture membres" on invitations for select using (est_membre());
create policy "ecriture pole"   on invitations for all
  using      (acces_pole((select pole_id from actions a where a.id = action_id)))
  with check (acces_pole((select pole_id from actions a where a.id = action_id)));

-- Comptes : chacun voit le sien ; un membre peut changer son nom et son pôle (pour info),
-- mais jamais son rôle. Seule l'admin désigne les dirigeants.
create policy "mon compte"    on comptes for select using (id = auth.uid() or mon_role() = 'admin');
create policy "je me decris"  on comptes for update using (id = auth.uid() and role = 'membre')
  with check (id = auth.uid() and role = 'membre');
create policy "gestion admin" on comptes for update using (mon_role() = 'admin') with check (mon_role() = 'admin');


-- ---------------------------------------------------------------------
-- 5. TRAÇABILITÉ : on note qui a modifié en dernier, et quand
-- ---------------------------------------------------------------------
alter table actions   add column if not exists modifie_par text, add column if not exists modifie_le timestamptz;
alter table personnes add column if not exists modifie_par text, add column if not exists modifie_le timestamptz;

create or replace function public.noter_modification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.modifie_par := coalesce((select email from comptes where id = auth.uid()), 'inconnu');
  new.modifie_le  := now();
  return new;
end $$;

drop trigger if exists trace_actions on actions;
create trigger trace_actions before insert or update on actions
  for each row execute function public.noter_modification();
drop trigger if exists trace_personnes on personnes;
create trigger trace_personnes before insert or update on personnes
  for each row execute function public.noter_modification();


-- ---------------------------------------------------------------------
-- 6. LES CHIFFRES PUBLICS (visibles sans connexion, AUCUN nom)
--    Ce sont des « vues » : des tableaux calculés automatiquement à partir des tiroirs.
-- ---------------------------------------------------------------------

-- Une ligne par action, avec ses totaux calculés (sans noms ni texte du CR)
drop view if exists stats_actions;
create view stats_actions with (security_invoker = false) as
select a.id, a.date_action, a.pole_id, a.campagne_id, a.type_id, a.ville,
       (select count(*) from presents pr where pr.action_id = a.id)                     as nb_freres,
       (select count(*) from invitations i where i.action_id = a.id)                    as nb_invites,
       (select count(*) from invitations i where i.action_id = a.id and i.converti)     as nb_conversions,
       (select count(*) from invitations i where i.action_id = a.id and i.club_lecture) as nb_clubs_lecture,
       (select count(*) from invitations i where i.action_id = a.id and i.restauration) as nb_restaurations
from actions a;

-- Le parcours, compté par pôle et par jour (sans noms)
drop view if exists stats_parcours;
create view stats_parcours with (security_invoker = false) as
select pole_id, d as jour, etape, count(*) as nombre
from (
  select pole_id, premier_contact as d, 'nouvelle_personne' as etape from personnes
  union all select pole_id, date_conversion,   'conversion'   from personnes where date_conversion   is not null
  union all select pole_id, date_bapteme,      'bapteme'      from personnes where date_bapteme      is not null
  union all select pole_id, date_ajout_eglise, 'ajout_eglise' from personnes where date_ajout_eglise is not null
) t
group by pole_id, d, etape;

grant select on stats_actions, stats_parcours to anon, authenticated;


-- ---------------------------------------------------------------------
-- 7. AUTORISATIONS (« GRANT ») : on ouvre l'accès du site aux tiroirs.
--    Les règles ci-dessus (RLS) décident ensuite, ligne par ligne, qui voit et modifie quoi.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- Visiteurs sans compte : seulement les listes fixes et les chiffres sans noms
grant select on poles, campagnes, types_evangelisation to anon;
grant select on stats_actions, stats_parcours to anon;

-- Personnes connectées : lecture et écriture, toujours filtrées par les règles
grant select, insert, update, delete on poles, campagnes, types_evangelisation, actions, presents, personnes, invitations, comptes to authenticated;
grant select on stats_actions, stats_parcours to authenticated;
grant usage, select on all sequences in schema public to authenticated;
