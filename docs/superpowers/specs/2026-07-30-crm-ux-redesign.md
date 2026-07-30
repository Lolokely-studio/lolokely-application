# CRM UX Redesign — Design Spec

**Date:** 2026-07-30  
**Status:** Approved for planning  
**Context:** Refonte UI/UX du module CRM admin existant (`/crm`, `/crm/:id`). Conserve la charte graphique verte (palette actuelle). Focus sur le pipeline de prospection et la lisibilité avec ~5 500 sociétés.

## Goals

- Rendre le CRM utilisable au quotidien pour suivre la prospection : savoir qui a été contacté, en discussion, gagné ou perdu.
- Améliorer la page liste (recherche, filtres, vue par status) et la fiche société (hiérarchie visuelle, résumé pipeline).
- Standardiser le status société via un pipeline fixe avec dropdown partout (plus de texte libre).
- Conserver les patterns existants (Flask blueprints, JWT + admin, React, classes `glass-card`, `btn-primary`, tokens CSS verts).

## Non-goals (V2)

- CSV import/export
- Notifications CRM
- Refonte fonctionnelle lourde des onglets Prospects / Emails / Financials
- Bulk actions (changement de status en masse)
- Sync avec système d'ingestion externe

## User requirements (validated)

| Besoin | Solution retenue |
|--------|------------------|
| Priorité liste + fiche | Approche 1 : refonte ciblée des composants CRM existants |
| Pipeline prospection | `new` → `contacted` → `in_discussion` → `won` / `lost` |
| Vue par status | Chips avec compteurs + toggle Liste / Kanban |
| Changement de status | Drag & drop Kanban + dropdown inline (tableau + fiche header) |
| Fiche trop plate | Header enrichi, stepper pipeline, actions visibles |
| Charte graphique | Palette verte existante (`primary-*`, `--chip-*`, glass panels) |

## Status pipeline

| DB value | Label UI (FR) | Badge style |
|----------|---------------|-------------|
| `new` | Nouveau | chip vert clair (`primary-500/15`) |
| `contacted` | Contacté | vert moyen |
| `in_discussion` | En discussion | teal / accent vert |
| `won` | Gagné | vert foncé, icône check |
| `lost` | Perdu | rouge danger existant (`--danger-*`) |

Default: `new`. Toutes les sociétés existantes (~5 473) sont déjà `new` — aucune migration de données requise.

## Backend changes

### Schema validation

`backend/schemas/company_schema.py` — valider `status` avec :

```python
validate.OneOf(['new', 'contacted', 'in_discussion', 'won', 'lost'])
```

Default à la création : `new` si non fourni.

### New endpoints

#### `GET /api/companies/status-counts`

Retourne le décompte par status (respecte les filtres `q`, `country`, `company_type` si fournis ; **sans** filtre `status` pour toujours montrer la répartition complète).

```json
{
  "total": 5473,
  "counts": {
    "new": 5473,
    "contacted": 0,
    "in_discussion": 0,
    "won": 0,
    "lost": 0
  }
}
```

#### `PATCH /api/companies/<id>/status`

Body : `{ "status": "contacted" }`

- Valide le status via schema dédié
- Met à jour `updated_at`
- Retourne la société mise à jour
- Erreurs : 400 (validation), 404, 403, 401

### Existing endpoints

- `GET /api/companies/` — filtre `status` passe de `ILIKE` à égalité exacte sur les valeurs enum
- `PUT /api/companies/<id>` — status validé via le même enum

## Frontend architecture

### New shared module: `frontend/src/components/crm/`

| File | Role |
|------|------|
| `crmConstants.js` | Pipeline order, labels FR, badge class maps |
| `StatusBadge.jsx` | Read-only colored chip |
| `StatusSelect.jsx` | Reusable dropdown (filter, table inline, detail header) |
| `StatusFilterChips.jsx` | Chip bar with live counts |
| `PipelineStepper.jsx` | Horizontal pipeline on company detail |
| `KanbanBoard.jsx` | 5 columns + drag-and-drop |
| `CompanyCard.jsx` | Kanban card (name, domain, location, type) |

Dependency: `@dnd-kit/core` + `@dnd-kit/sortable` (or `@dnd-kit/utilities`) for Kanban DnD.

### Service updates: `crmService.js`

```javascript
getStatusCounts(params)   // GET /companies/status-counts
updateCompanyStatus(id, status)  // PATCH /companies/:id/status
```

## Page liste — `/crm`

### Layout

```
[Header: CRM + subtitle + New Company button]

[Search bar]                              [List | Kanban toggle]

[All (n)] [Nouveau (n)] [Contacté (n)] [En discussion (n)] [Gagné (n)] [Perdu (n)]

[Status ▾] [Country] [Company Type]  [Clear filters]

[Table view OR Kanban view]

[Pagination]
```

- Toggle Liste/Kanban : préférence persistée dans `localStorage` (`crm-view-mode`)
- Chips status : filtre principal ; clic = filtre la liste/Kanban sur ce status ; « Tous » = pas de filtre status
- Status dropdown (filtres) : remplace le champ texte libre ; synchronisé avec le chip actif
- Country / Company Type : texte libre conservé

### Vue Liste (tableau)

Colonnes : Nom (avec initiale/avatar), Domaine (lien si URL), Localisation, Type (chip), **Status (StatusSelect inline)**, Actions.

- Status inline : `PATCH /status` on change, optimistic update + rollback on error
- Tri : nom, status, `updated_at` (query param `sort` + `order` côté API si absent aujourd'hui — ajouter `sort=company_name|status|updated_at`, `order=asc|desc`)
- Pagination : numéros de pages + saut direct (pas seulement Prev/Next)
- `per_page` default : 25 (max 100, inchangé côté API)

### Vue Kanban

5 colonnes correspondant au pipeline. Chaque carte (`CompanyCard`) :
- Nom société (clic → `/crm/:id`)
- Domaine + ville
- Type (chip)

Drag & drop entre colonnes → `PATCH /status`, optimistic update.

**Performance (5 473+ sociétés) :**
- Chaque colonne charge max **50 cartes** avec bouton « Charger plus »
- Kanban respecte recherche + filtres country/type actifs
- Quand un chip status est actif, une seule colonne est pleinement pertinente ; les autres restent vides ou minimales

## Fiche société — `/crm/:id`

### Header enrichi

- Initiale/avatar + nom en `h1`
- Sous-titre : domaine · localisation
- **StatusSelect** inline dans le header (PATCH immédiat)
- **PipelineStepper** : étape courante en vert plein, étapes passées cochées, futures grisées
- Compteurs : Emails (n), Prospects (n), Financials (n)
- Boutons Edit / Delete plus visibles (styles existants `btn-secondary` + danger)

### Onglet Info

Grille regroupée en sections :
1. **Identité** — domaine, site web, type
2. **Localisation** — pays, ville, région
3. **Suivi** — status (lecture + badge), dernière MAJ, notes (bloc `surface-muted` en bas)

### Onglets Prospects / Emails / Financials

Harmonisation visuelle uniquement (cards, empty states, boutons) — pas de refonte CRUD.

## Error handling

| Cas | Comportement UI |
|-----|-----------------|
| PATCH status échoue | Rollback optimistic, toast/banner erreur |
| Counts API échoue | Chips sans compteurs (labels seuls), retry silencieux |
| Kanban DnD vers colonne identique | No-op |
| Delete company avec enfants | Message 409 existant conservé |

## Testing (manual)

- Admin : chips filtrent correctement ; compteurs cohérents avec la liste
- Dropdown status dans tableau change le status sans ouvrir Edit
- Kanban DnD met à jour le status ; carte disparaît de l'ancienne colonne
- Fiche : stepper reflète le status ; StatusSelect header fonctionne
- Non-admin : accès UI/API bloqué (inchangé)
- Dark mode : badges et stepper lisibles (tokens CSS existants)

## Success criteria

- Un admin voit en un coup d'œil combien de sociétés sont à chaque étape du pipeline
- Changer le status prend ≤ 2 clics (dropdown ou drag) sans ouvrir le formulaire complet
- La fiche société a une hiérarchie claire (header > stepper > contenu)
- Charte verte conservée ; pas de régression sur CRUD existant
- Performance acceptable avec 5 000+ sociétés (pagination Kanban par colonne)
