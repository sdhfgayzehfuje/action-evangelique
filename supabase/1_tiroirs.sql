-- =====================================================================
--  ÉTAPE 3 : LES TIROIRS DE LA BASE (tables)
--  À coller dans Supabase > SQL Editor > New query, puis cliquer « Run ».
-- =====================================================================


-- ---------------------------------------------------------------------
-- TIROIR 1 : PÔLES  (une ligne par pôle)
-- ---------------------------------------------------------------------
create table poles (
  id      serial primary key,          -- numéro automatique (1, 2, 3…)
  nom     text not null unique,        -- « Pôle Ouest »… jamais deux fois le même
  couleur text not null default '#1d3bd1'
);


-- ---------------------------------------------------------------------
-- TIROIR 2 : CAMPAGNES  (la croisade, puis les suivantes)
-- ---------------------------------------------------------------------
create table campagnes (
  id         serial primary key,
  nom        text not null,
  date_debut date not null,
  date_fin   date not null,
  check (date_fin >= date_debut)       -- la fin ne peut pas être avant le début
);


-- ---------------------------------------------------------------------
-- TIROIR 3 : TYPES D'ÉVANGÉLISATION  (la liste des choix possibles)
-- ---------------------------------------------------------------------
create table types_evangelisation (
  id    serial primary key,
  nom   text not null unique,
  ordre int  not null default 0        -- pour l'ordre d'affichage
);


-- ---------------------------------------------------------------------
-- TIROIR 4 : ACTIONS  (une ligne = un compte rendu)
-- ---------------------------------------------------------------------
create table actions (
  id            uuid primary key default gen_random_uuid(),  -- identifiant unique
  date_action   date not null,
  type_id       int  references types_evangelisation(id),    -- renvoie au tiroir 3
  pole_id       int  not null references poles(id),          -- renvoie au tiroir 1
  campagne_id   int  references campagnes(id),               -- renvoie au tiroir 2 (vide = hors campagne)
  ville         text,
  lieu          text,
  theme         text,
  responsable   text not null,                               -- la personne qui a mené l'action
  compte_rendu  text,                                        -- le texte libre du CR
  cree_par      uuid default auth.uid(),                     -- le compte qui a saisi le CR
  cree_le       timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- TIROIR 5 : FRÈRES PRÉSENTS  (une ligne par frère/sœur présent·e à une action)
-- ---------------------------------------------------------------------
create table presents (
  id        serial primary key,
  action_id uuid not null references actions(id) on delete cascade,  -- si on supprime le CR, ses présents partent avec
  nom       text not null
);


-- ---------------------------------------------------------------------
-- TIROIR 6 : PERSONNES  (une fiche par personne rencontrée)
-- ---------------------------------------------------------------------
create table personnes (
  id               uuid primary key default gen_random_uuid(),
  nom              text not null,
  pole_id          int  not null references poles(id),
  ville            text,
  premier_contact  date not null,          -- date de la 1re action où on l'a rencontrée
  suivi_par        text,                   -- obligatoire dès qu'elle est convertie (voir règle plus bas)
  date_conversion  date,                   -- vide = pas (encore) convertie
  date_bapteme     date,                   -- vide = pas (encore) baptisée
  date_ajout_eglise date,                  -- vide = pas (encore) ajoutée à l'église
  notes            text,
  cree_le          timestamptz not null default now(),
  -- RÈGLE : un converti a forcément quelqu'un qui le suit
  constraint converti_doit_etre_suivi
    check (date_conversion is null or coalesce(trim(suivi_par), '') <> '')
);


-- ---------------------------------------------------------------------
-- TIROIR 7 : INVITATIONS  (qui était invité à quelle action, et ce qui s'est passé)
-- ---------------------------------------------------------------------
create table invitations (
  id            serial primary key,
  action_id     uuid not null references actions(id)   on delete cascade,
  personne_id   uuid not null references personnes(id) on delete cascade,
  converti      boolean not null default false,   -- s'est converti·e pendant cette action
  club_lecture  boolean not null default false,   -- ouvert·e à un club de lecture
  restauration  boolean not null default false,   -- est revenu·e à la foi
  unique (action_id, personne_id)                 -- une personne n'est notée qu'une fois par action
);


-- ---------------------------------------------------------------------
-- TIROIR 8 : COMPTES  (les responsables qui peuvent se connecter)
-- ---------------------------------------------------------------------
create table comptes (
  id      uuid primary key references auth.users(id) on delete cascade,
  email   text,
  nom     text,
  role    text not null default 'lecteur' check (role in ('admin', 'responsable', 'lecteur')),
  pole_id int references poles(id)
);


-- ---------------------------------------------------------------------
-- VERROU DE SÉCURITÉ
-- On ferme tous les tiroirs à clé. Pour l'instant, PERSONNE ne peut les lire
-- depuis le site. On ouvrira les bonnes portes à l'étape « qui voit quoi ».
-- ---------------------------------------------------------------------
alter table poles                enable row level security;
alter table campagnes            enable row level security;
alter table types_evangelisation enable row level security;
alter table actions              enable row level security;
alter table presents             enable row level security;
alter table personnes            enable row level security;
alter table invitations          enable row level security;
alter table comptes              enable row level security;


-- ---------------------------------------------------------------------
-- ON REMPLIT LES PETITES LISTES FIXES
-- ---------------------------------------------------------------------
insert into poles (nom, couleur) values
  ('Pôle Ouest', '#2f6fdb'),
  ('Pôle IDF',   '#e0533d'),
  ('Pôle Sud',   '#f2a531'),
  ('Pôle Bénin', '#1f9d6b');

insert into types_evangelisation (nom, ordre) values
  ('Porte-à-porte', 1), ('Évangélisation de rue', 2), ('Campus', 3),
  ('Conférence', 4), ('Étude biblique', 5), ('Évangélisation personnelle', 6),
  ('En ligne', 7), ('Retraite', 8), ('Autre', 99);

insert into campagnes (nom, date_debut, date_fin) values
  ('Croisade 40 jours', '2026-10-12', '2026-11-20');
