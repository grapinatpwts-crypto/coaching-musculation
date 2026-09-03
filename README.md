# Coaching Fitness — installation

Application de suivi de musculation : 1 coach, ~40 pratiquants.
Données stockées dans **votre** projet Firebase (Firestore). Les pratiquants n'ont
jamais accès qu'à leurs propres données, imposé par les Security Rules — il n'y a
pas de serveur applicatif entre le navigateur et la base.

## Architecture

```
 iPhone / Android          GitHub Pages              Firebase
 ┌──────────────┐          ┌────────────┐            ┌──────────────────────────┐
 │ PWA installée│ ────────▶│ index.html │ ──SDK─────▶│ Auth (Google)             │
 │ (icône)      │          │ (statique) │            │ Firestore (europe-west9) │
 └──────────────┘          └────────────┘            │  ↳ Security Rules        │
                                                       └──────────────────────────┘
```

Le fichier statique ne contient **aucune donnée**. Le SDK Firestore lit et écrit
directement depuis le navigateur, authentifié par Firebase Auth (Google) ; la
sécurité tient entièrement aux Security Rules (`firestore.rules`), qui cloisonnent
chaque compte sur ses propres documents.

## Étape 1 — Le projet Firebase

1. [console.firebase.google.com](https://console.firebase.google.com) ▸ **Créer un
   projet**. Plan **Spark** (gratuit) suffit à cette échelle.
2. **Authentication ▸ Sign-in method** : activer le fournisseur **Google**.
3. **Firestore Database ▸ Créer une base** : mode production, région au choix
   (proche de vos utilisateurs).
4. **Authentication ▸ Settings ▸ Authorized domains** : ajouter le domaine où sera
   hébergé le front-end (ex. `votrepseudo.github.io`), et `localhost` pour tester en
   local.
5. **Paramètres du projet ▸ Général** : ajouter une application Web, copier l'objet
   de configuration (`apiKey`, `authDomain`, `projectId`...).

## Étape 2 — Déployer les règles et les index

Depuis la racine du dépôt, avec la [CLI Firebase](https://firebase.google.com/docs/cli)
(`npm install -g firebase-tools`, puis `firebase login`) :

```bash
firebase use --add          # associer ce dossier à votre projet
firebase deploy --only firestore:rules,firestore:indexes
```

`firestore.rules` porte toute la sécurité — à ne jamais déployer sans relire, une
règle mal écrite est une faille immédiate. `firestore.indexes.json` déclare les
index composites nécessaires aux requêtes multi-champs (historique par exercice,
attributions actives, calendrier...).

## Étape 3 — Semer les données de départ

```bash
cd scripts
npm install
```

Générez une clé de compte de service (**Paramètres du projet ▸ Comptes de
service ▸ Générer une nouvelle clé privée**), enregistrez-la sous
`scripts/service-account.json` (ignoré par git, ne jamais la commiter ni la
déposer côté client — elle contourne les Security Rules).

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node seed.mjs
```

Verse le catalogue d'exercices (`apps-script/Catalogue.js`, 171 fiches sous
licence libre), dix programmes-types réutilisables, et crée le compte coach/admin
(`CONFIG.COACH_EMAIL` dans `apps-script/Code.js`).

## Étape 4 — Renseigner la configuration côté client

Dans `index.html`, le module `<script type="module">` en tête de fichier :
remplacez l'objet passé à `initializeApp({...})` par celui copié à l'étape 1.
Ces valeurs sont publiques par nature (visibles dans le HTML envoyé au
navigateur) — ce ne sont pas des secrets, la sécurité tient aux Security Rules.

## Étape 5 — Héberger le front-end

Sur GitHub : nouveau dépôt public, déposez `index.html`, `manifest.json`, `sw.js`
et vos icônes. Puis `Settings ▸ Pages ▸ Source : main / root`.

Icônes à fournir : `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`
(fond `#14171C`, marge de 12 % pour la version maskable).

## Étape 6 — Inscrire les pratiquants

Connectez-vous en premier avec le compte du coach (`CONFIG.COACH_EMAIL` du seed) :
Coach ▸ Athlètes ▸ **Inscrire un pratiquant**. L'email doit être exactement celui
du compte Google de la personne — une adresse absente de `pratiquants/` obtient un
refus poli à la connexion (`NON_INSCRIT`).

## Étape 7 — Donner un programme

Coach ▸ un athlète ▸ Programme ▸ **Donner un programme**, depuis un modèle
existant (les dix programmes-types du seed, ou les vôtres). Pour verser vos
propres programmes sans passer par le dépôt public : remplissez
`modele-import.xlsx` puis `Réglages ▸ Importer un programme`.
`Réglages ▸ Exporter un programme` fait l'inverse — un modèle redescend dans le
même gabarit, retouchable dans Excel puis réimportable tel quel.

## Étape 8 — Installer l'app sur téléphone

- **Android (Chrome)** : ouvrir le lien → bannière « Installer l'application ».
- **iPhone (Safari uniquement)** : ouvrir le lien → bouton Partager → « Sur l'écran d'accueil ».
  Chrome sur iOS ne propose pas l'installation ; prévoyez une petite notice pour vos pratiquants.

## Sécurité — ce qui est en place

- Authentification Firebase (Google), cloisonnement par email issu du jeton
- Toute la sécurité dans `firestore.rules` : lecture/écriture par collection,
  jamais un paramètre envoyé par le navigateur qui décide de la cible
- Rôle (`coach`/`pratiquant`) et statut lus par `get()` sur le document du compte
  lui-même, pas par un jeton personnalisé — pas de Cloud Function, reste gratuit
- Statut *Inactif*/*Archivé* bloque l'écriture d'un pratiquant, jamais la lecture
- `admin:true` peut réécrire un historique déjà clos et attribuer les rôles,
  depuis Réglages ▸ Rôles — un écran qui n'apparaît que pour lui. Le premier
  admin, lui, vient du seed : il n'y a pas d'amorçage depuis l'app

## Limites connues

- Écran de consentement Google (Firebase Auth) en mode **Test** par défaut : seuls
  les comptes explicitement ajoutés peuvent se connecter. Passer en Production
  avant d'ouvrir à plus de quelques comptes.
- L'envoi d'e-mail direct depuis le compte du coach n'est pas construit ; le bouton
  Prévenir propose WhatsApp, SMS et un lien `mailto:` en attendant.
- Le mode hors ligne (lecture et écriture) est natif à Firestore
  (`persistentLocalCache`) — aucune file à gérer, mais une coupure trop longue sans
  jamais resynchroniser reste un cas non testé à cette échelle.

Documentation technique complète : [`PROJET.md`](PROJET.md). Décisions et
« pourquoi » : [`PRODUCTION.md`](PRODUCTION.md).
