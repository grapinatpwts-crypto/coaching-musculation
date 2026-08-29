# Muscu — installation

Application de suivi de musculation : 1 coach, ~40 pratiquants.
Données stockées dans **votre** Google Sheet. Les pratiquants n'ont jamais accès au Sheet.

## Architecture

```
 iPhone / Android          GitHub Pages              Apps Script            Google Sheet
 ┌──────────────┐          ┌────────────┐            ┌──────────┐          ┌──────────┐
 │ PWA installée│ ────────▶│ index.html │ ──POST────▶│  Code.gs │ ───────▶ │  Données │
 │ (icône)      │  token   │ (statique) │  + token   │ vérifie  │  lit /   │  privées │
 └──────────────┘  Google  └────────────┘            │ le token │  écrit   └──────────┘
                                                     └──────────┘
```

Le fichier statique ne contient **aucune donnée**. Toutes les lectures et écritures
passent par le script, qui vérifie l'identité Google puis ne renvoie à chaque
personne que ses propres lignes.

## Étape 1 — Le Google Sheet

1. Créez un Google Sheet nommé `Muscu`.
2. `Extensions ▸ Apps Script`.
3. Collez le contenu de `Code.gs` (remplacez tout le fichier existant).
4. Enregistrez, puis rechargez le Sheet : un menu **Muscu** apparaît.
5. `Muscu ▸ Installer les onglets` → les 5 onglets sont créés avec des exercices d'exemple.

## Étape 2 — Le projet Google Cloud

1. Dans l'éditeur Apps Script : `Paramètres du projet ▸ Projet Google Cloud ▸ Modifier`.
2. Créez ou associez un projet Cloud (gratuit).
3. Ouvrez [console.cloud.google.com](https://console.cloud.google.com) sur ce projet.

## Étape 3 — L'identifiant OAuth

1. `API et services ▸ Écran de consentement OAuth` : type **Externe**, nom `Muscu`,
   votre email en contact. Publiez l'application (sinon limite à 100 testeurs).
2. `Identifiants ▸ Créer ▸ ID client OAuth ▸ Application Web`.
3. **Origines JavaScript autorisées** : l'URL où sera hébergé le front-end,
   par exemple `https://votrepseudo.github.io`.
4. Copiez l'ID client (`....apps.googleusercontent.com`).

## Étape 4 — Déployer l'API

Dans l'éditeur Apps Script :

1. Renseignez en haut de `Code.gs` :
   - `CLIENT_ID` : l'ID client de l'étape 3
   - `COACH_EMAIL` : l'adresse Google du coach
2. `Déployer ▸ Nouveau déploiement ▸ Application web`
   - Exécuter en tant que : **moi**
   - Qui a accès : **tout le monde**
3. Copiez l'URL qui finit par `/exec`.

> « Tout le monde » signifie que l'URL est joignable, pas que les données sont
> ouvertes : le script refuse toute requête sans token Google valide et non inscrit
> dans l'onglet `Pratiquants`.

## Étape 5 — Héberger le front-end

Sur GitHub : nouveau dépôt public, déposez `index.html`, `manifest.json`, `sw.js`
et vos trois icônes. Puis `Settings ▸ Pages ▸ Source : main / root`.

Avant l'envoi, renseignez en haut du `<script>` de `index.html` :

```js
const API = 'https://script.google.com/macros/s/..../exec';
const CLIENT_ID = '....apps.googleusercontent.com';
```

Icônes à fournir : `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`
(fond `#14171C`, marge de 12 % pour la version maskable).

## Étape 6 — Inscrire les pratiquants

Dans l'onglet `Pratiquants`, une ligne par personne :

| email | nom | actif | date_inscription | objectif |
|---|---|---|---|---|
| marie.d@gmail.com | Marie Dupont | VRAI | 12/09/2026 | Force |

L'email doit être **exactement** celui de son compte Google. Une personne absente
de cette liste obtient un refus poli à la connexion.

## Étape 7 — Écrire les programmes

Onglet `Programmes`, une ligne par exercice d'une séance :

| id | email | jour | ordre | exercice_id | series | reps_cible | charge_cible | repos_s |
|---|---|---|---|---|---|---|---|---|
| P001 | marie.d@gmail.com | Lundi — Haut | 1 | EX001 | 4 | 8-10 | 40 | 120 |
| P002 | marie.d@gmail.com | Lundi — Haut | 2 | EX005 | 3 | 10 | 25 | 90 |

`jour` est libre : il devient l'onglet affiché dans l'app.

## Étape 8 — Installer l'app sur téléphone

- **Android (Chrome)** : ouvrir le lien → bannière « Installer l'application ».
- **iPhone (Safari uniquement)** : ouvrir le lien → bouton Partager → « Sur l'écran d'accueil ».
  Chrome sur iOS ne propose pas l'installation ; prévoyez une petite notice pour vos pratiquants.

## Automatisations incluses

- `rapportHebdo()` — envoie au coach la liste des pratiquants sans séance depuis
  10 jours. Pour l'activer : éditeur Apps Script ▸ **Déclencheurs** ▸ ajouter un
  déclencheur hebdomadaire sur cette fonction.

Idées d'extensions faciles : export PDF du bilan mensuel (`DocumentApp`),
graphique de progression dans le Sheet, notification au coach dès qu'un record est battu.

## Sécurité — ce qui est en place

- Vérification serveur du token auprès de Google (`tokeninfo`), contrôle de `aud` et `exp`
- Liste blanche : seuls les emails de l'onglet `Pratiquants` sont servis
- Cloisonnement : chaque requête filtre sur l'email issu du token, jamais sur un
  paramètre envoyé par le navigateur
- Les fonctions coach vérifient l'email avant de renvoyer quoi que ce soit
- `LockService` sur toutes les écritures, pour éviter les collisions quand
  plusieurs personnes s'entraînent en même temps

## Limites connues

- Le Sheet reste confortable jusqu'à ~50 000 lignes de séries. Au-delà (plusieurs
  années à 40 pratiquants), il faudra archiver les saisons passées dans un second Sheet.
- Le mode hors ligne couvre l'affichage, pas la saisie : une série validée sans
  réseau n'est pas enregistrée. Une file d'attente locale est possible plus tard.
- Quotas Apps Script : largement suffisants pour 41 utilisateurs.
