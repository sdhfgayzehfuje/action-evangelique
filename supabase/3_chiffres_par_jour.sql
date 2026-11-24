-- =====================================================================
--  PETIT COMPLÉMENT : les chiffres publics du parcours, jour par jour
--  (pour que le filtre « Croisade 40 jours » soit exact au jour près).
--  À coller dans Supabase > SQL Editor, puis « Run ». Toujours aucun nom.
-- =====================================================================
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

grant select on stats_parcours to anon, authenticated;
