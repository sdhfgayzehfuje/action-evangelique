# Action évangélique · Suivi des actions

Site de suivi des comptes rendus (CR) des actions évangéliques de 4 pôles (Ouest, IDF, Sud, Bénin) :
tableau de bord, bilan par pôle et par ville, suivi du parcours des personnes (conversion, baptême, ajout à l'église),
saisie des CR (avec collage automatique d'un CR WhatsApp) et mode présentation.

**Site :** https://action-evangelique.netlify.app

## Architecture
- **Base de données :** PostgreSQL hébergé sur Supabase (scripts dans `supabase/`)
  - 8 tables : `poles`, `campagnes`, `types_evangelisation`, `actions`, `presents`, `personnes`, `invitations`, `comptes`
  - Sécurité au niveau des lignes (RLS) : tout compte lit, seuls les dirigeants modifient leur pôle
  - Vues publiques agrégées sans données nominatives : `stats_actions`, `stats_parcours`
  - Traçabilité des modifications (`modifie_par`, `modifie_le`) par triggers
- **Front-end :** HTML / CSS / JavaScript sans framework, `supabase-js` (fichiers à la racine)
- **Hébergement :** Netlify (déploiement automatique à chaque modification de ce dépôt)

## Fichiers
| Fichier | Rôle |
|---|---|
| `index.html` | Page d'entrée |
| `style.css` | Apparence (thèmes de couleur, mode sombre) |
| `app.js` | Logique : lecture/écriture dans la base, calculs, écrans |
| `config.js` | Adresse du projet Supabase et clé publique |
| `supabase/*.sql` | Création des tables, règles d'accès, vues |
