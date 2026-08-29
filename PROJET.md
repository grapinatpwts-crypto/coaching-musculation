# Muscu — état du projet

Document de reprise. À déposer à la racine du dépôt : il donne tout le contexte
nécessaire pour continuer le travail dans Claude Code sans repartir de zéro.

---

## 1. Objectif

Application de suivi d'entraînement pour **1 coach et ~40 pratiquants** de musculation.

Contraintes qui ont dicté l'architecture :
- Pas de coût par utilisateur (AppSheet écarté : ~205 $/mois à 41 utilisateurs)
- Pas de serveur à administrer (rejeté pour raisons de sécurité et de maintenance)
- Données d'entraînement considérées comme sensibles → jamais exposées publiquement
- Utilisable sur iPhone et Android ; le coach travaille aussi sur PC

## 2. Architecture retenue

```
 iPhone / Android          GitHub Pages              Apps Script            Google Sheet
 ┌──────────────┐          ┌────────────┐            ┌──────────┐          ┌──────────┐
 │ PWA installée│ ────────▶│ index.html │ ──POST────▶│  Code.gs │ ───────▶ │  Données │
 │ (icône)      │  token   │ (statique) │  + token   │ vérifie  │  lit /   │  privées │
 └──────────────┘  Google  └────────────┘            │ le token │  écrit   └──────────┘
                                                     └──────────┘
```

Le front-end statique ne contient **aucune donnée**. L'authentification se fait par
Google Identity Services côté navigateur ; le token est vérifié côté serveur par
Apps Script, qui ne renvoie à chaque personne que ses propres lignes.

## 3. Coordonnées du projet

| Élément | Valeur |
|---|---|
| Dépôt GitHub | `grapinatpwts-crypto/coaching-musculation` (public) |
| App en ligne | https://grapinatpwts-crypto.github.io/coaching-musculation/ |
| Projet Cloud | `coaching-musculation` |
| ID client OAuth | `765877661024-r5p4dhadda0i9eb9996ctb8298f7m6h8.apps.googleusercontent.com` |
| Origine JS autorisée | `https://grapinatpwts-crypto.github.io` |
| URL API (`/exec`) | `https://script.google.com/macros/s/AKfycbw8wC_TmFuLzP8yTrOmX5wH5k3Yoc-AbauN3Hj9oF57Lc1NSA-MrclnkuTnKr8DtBpEiQ/exec` |
| Email coach | `grapinat.pwts@gmail.com` |
| Salle du coach | Wellness Sport Club — Lyon Confluence |
| Second compte test | `guillaume.rapinat@gmail.com` |

L'ID client et l'URL de l'API sont publics par nature (visibles dans le HTML) —
ce ne sont pas des secrets. Le code secret OAuth n'est pas utilisé et n'a pas été conservé.

**État OAuth : mode Test**, 2 utilisateurs tests sur 100. Conséquences : seuls ces
deux comptes peuvent se connecter, et leur session expire au bout de 7 jours.
Le passage en Production (page *Audience*) sera nécessaire avant d'ouvrir aux
40 pratiquants — décision volontairement reportée.

## 4. Fichiers

| Fichier | Emplacement | Rôle |
|---|---|---|
| `Code.gs` | `apps-script/`, synchronisé par clasp (§ 12) | API JSON, auth, logique métier |
| `index.html` | dépôt GitHub | PWA complète (HTML + CSS + JS inline) |
| `manifest.json` | dépôt GitHub | manifeste d'installation |
| `sw.js` | dépôt GitHub | service worker, cache de la coquille |
| `README.md` | non déposé | guide d'installation en 8 étapes |
| `favicon.ico` | racine | monogramme officiel Wellness, source des icônes |
| `assets/` | racine | logo Wellness pour fond sombre |

**Icônes :** produites depuis `favicon.ico`, le monogramme officiel Wellness
(W cerclé, `#C22026`, transparent, 135×134) fourni par le coach. Fond `#151515`,
marque à 72 % pour les icônes classiques, 76 % pour la maskable (12 % de marge par
côté, zone sûre respectée). Régénérables : voir § 9.

## 5. Schéma du Google Sheet

| Onglet | Colonnes |
|---|---|
| `Pratiquants` | email, nom, actif, date_inscription, objectif |
| `Exercices` | id, nom, groupe, consigne |
| `Programmes` | id, email, jour, **bloc**, ordre, exercice_id, series, reps_cible, **duree_s**, charge_cible, **cadence**, **pause_s**, repos_s |
| `Seances` | id, email, date, jour, duree_min, ressenti, notes |
| `Series` | id, seance_id, email, exercice_id, serie_num, reps, **duree_s**, charge, horodatage |

Sept exercices d'exemple créés par `setup()` : EX001 développé couché, EX002 squat,
EX003 soulevé de terre, EX004 tractions, EX005 développé militaire, EX006 curl barre,
EX007 gainage (exercice au temps).

`jour` est un texte libre (ex. « Lundi — Haut ») : il devient l'onglet affiché dans
l'app. Les jours sont triés par jour de semaine (`triJours_`), pas alphabétiquement —
sinon « Jeudi » passait avant « Lundi ».

### Les blocs

`bloc` regroupe les lignes qui s'enchaînent. **Plusieurs lignes partageant le même
`bloc` forment un superset ou un circuit** : on enchaîne les exercices, et le repos
n'intervient qu'à la fin du tour. `ordre` classe les exercices à l'intérieur du bloc.

`series` et `repos_s` sont lus sur la **première ligne du bloc** et valent pour tout
le bloc ; `reps_cible` et `charge_cible` restent propres à chaque ligne.

Une ligne seule dans son bloc = une série classique, comportement d'avant. Sur un
Sheet déjà installé, `Muscu ▸ Migration : colonne bloc` crée la colonne et recopie
`ordre` dedans — chaque ligne devient son propre bloc, rien ne change visuellement.

C'est le niveau « Travail » du modèle AppSheet (§ 13), repris dans sa forme légère :
une colonne, pas une table. La version complète — programmes réutilisables,
versionnés, affectés à plusieurs pratiquants — n'est pas faite.

### Les deux minuteurs

Un bloc en fait intervenir **deux**, et c'est la distinction qui structure la saisie :

| Colonne | Portée | Quand il se déclenche |
|---|---|---|
| `pause_s` | la ligne | après cet exercice, **à l'intérieur** du tour, avant le suivant du bloc |
| `repos_s` | le bloc | une fois le tour **complet** terminé, avant de repartir au premier |

L'app enchaîne toute seule : série validée → pause → exercice suivant du bloc →
… → dernier du bloc → repos → retour au premier. Une `pause_s` à 0 enchaîne sans
temps mort. Un bloc à un seul exercice ne connaît que `repos_s`, comportement d'avant.

### Cadence

`cadence` est un tempo en quatre temps, dans l'ordre
**montée · position haute · descente · position basse**.
« 1-0-3-1 » = montée en 1 s, pas d'arrêt en haut, descente en 3 s, 1 s en bas.

Affichée en pastille sur la carte et en toutes lettres dans la saisie, accompagnée
d'une **courbe** : le temps en abscisse, la position de la charge en ordonnée, une
ligne rouge entre les deux guides. La pente donne la vitesse, le plat donne l'arrêt.
Fonction `courbeCadence()` dans `index.html`, SVG inline, aucune dépendance.

Purement indicatif : rien n'est chronométré dessus.

### Exercices au temps

`duree_s` renseigné bascule l'exercice en mode chrono et `reps_cible` est ignoré.
Une valeur numérique donne un décompte (le gainage à 45 s), la valeur `max` un
chrono qui monte jusqu'à l'échec. La série enregistrée porte alors `duree_s` au lieu
de `reps` — c'est pour ça que `logSerie_` accepte l'un **ou** l'autre.

## 6. API — actions disponibles

Toutes en POST sur l'URL `/exec`, corps `{token, action, payload}`,
`Content-Type: text/plain;charset=utf-8`.

| Action | Payload | Retour |
|---|---|---|
| `bootstrap` | — | profil, jours, nb séances, estCoach |
| `seance` | `{jour}` | **blocs** du jour : `{bloc, series, repos_s, exercices[]}`, chaque exercice portant `cadence`, `pause_s`, `duree_s` |
| `demarrer` | `{jour}` | `{seance_id}` |
| `serie` | `{seance_id, exercice_id, serie_num, reps \| duree_s, charge}` | confirmation |
| `terminer` | `{seance_id, duree_min, ressenti, notes}` | confirmation |
| `historique` | `{exercice_id}` | 30 dernières séries |
| `coachAthletes` | — | liste des pratiquants + jours d'inactivité |
| `coachDetail` | `{email}` | 15 dernières séances détaillées |

## 7. Sécurité en place

- Vérification serveur du token via `oauth2.googleapis.com/tokeninfo`, contrôle de `aud` et `exp`
- Liste blanche : seuls les emails de l'onglet `Pratiquants` obtiennent une réponse
- Cloisonnement : le filtre se fait sur l'email issu du token, jamais sur un paramètre client
- Les actions coach vérifient l'email avant tout retour
- `LockService` sur toutes les écritures
- Cache de 5 min sur la vérification des tokens (`CacheService`)

## 8. Pièges rencontrés — à ne pas réapprendre

**Apps Script ne peut pas héberger la PWA.** Ses pages sont servies dans une iframe
sandboxée : ni service worker, ni Google Sign-In fiable. D'où la séparation
GitHub Pages (front) / Apps Script (API).

**Le déploiement doit être en « Accès : tout le monde ».** Avec « toute personne
disposant d'un compte Google », les requêtes cross-origin du navigateur arrivent
sans cookie de session et reçoivent une page de connexion HTML au lieu du JSON.
L'accès public est sans risque ici puisque l'auth est faite par le code.

**POST en `text/plain`, pas en `application/json`.** Apps Script ne répond pas aux
requêtes préflight OPTIONS ; le type `text/plain` en fait une requête simple.

**`SpreadsheetApp.getUi()` échoue** si l'éditeur a été ouvert depuis script.google.com
plutôt que depuis le Sheet. Encapsulé dans un `try/catch` dans `setup()`.

**Modifier un déploiement, ne pas en créer un nouveau**, sinon l'URL change et il
faut la reporter dans `index.html`.

**Une 404 sur l'URL `/exec` testée depuis un outil externe n'est pas fiable :**
la redirection vers `script.googleusercontent.com` n'est pas toujours suivie.
Tester dans un navigateur.

**En mode Test, la liste des utilisateurs tests ne doit pas être vide**, sinon
personne ne peut se connecter, pas même le propriétaire du projet.

## 9. Parti pris visuel — charte Wellness Sport Club

L'app reprend l'identité de **Wellness Sport Club** (`wellness-sportclub.fr`),
l'enseigne où travaille le coach. Valeurs relevées directement dans le CSS et les
fichiers du site.

| Jeton | Valeur | Usage |
|---|---|---|
| `--iron` | `#151515` | fond (repris de l'enseigne) |
| `--plate` | `#1E1E1E` | surfaces |
| `--edge` | `#2E2E2E` | bordures |
| `--chalk` | `#F4F4F4` | texte principal — 16,6:1 |
| `--dust` | `#9A9A9A` | texte secondaire — 6,5:1 |
| `--brand` | `#A61E1F` | **aplats uniquement** (`--main_color` du site) |
| `--brand-ink` | `#E05253` | **texte et accents** sur fond sombre — 4,8:1 |
| `--on-brand` | `#FFFFFF` | encre sur aplat rouge — 7,4:1 |

**Le dédoublement du rouge n'est pas cosmétique.** Le rouge officiel `#A61E1F`
plafonne à **2,42:1** sur le fond : illisible en texte. Il ne sert qu'en aplat, avec
du blanc dessus. Toute couleur de texte passe par `--brand-ink`. L'ancien parti pris
« encre sombre sur accent », hérité de l'ambre, a été abandonné : `#14171C` sur
`#A61E1F` ne donne que 2,4:1.

À noter : **la marque a deux rouges.** Le CSS déclare `#A61E1F`, le fichier du logo
est peint en `#C22026`. C'est le premier qui fait foi pour l'interface.

### Typographie

Le site utilise Futura (partout), Bebas (chiffres et dates), Catamaran (corps
éditorial) et Gilroy (prix uniquement). Futura et Gilroy sont sous licence
commerciale et ne peuvent pas être embarquées.

| Rôle | Retenu | Raison |
|---|---|---|
| Titres, chiffres | **Bebas Neue** | déjà dans la charte, libre (OFL) — remplace Anton |
| Interface | **Jost** | reprise libre de Futura — remplace Inter Tight |

### Logo

`assets/logo-wellness-dark.png` est une **variante dérivée** : le sous-titre
« SPORT CLUB » du fichier officiel est en gris `#494948`, invisible sur fond sombre ;
il a été recoloré en `#F4F4F4`. Le rouge n'a pas été touché. À remplacer par le
fichier officiel pour fond sombre dès que l'enseigne le fournit.

> **Autorisation à obtenir.** L'usage du logo et du nom Wellness dans une app
> distribuée aux pratiquants doit être validé par l'enseigne. Tant que ce n'est pas
> fait, l'app reste un outil interne au coach. Le logo est isolé dans un seul fichier
> et l'identité tient dans huit jetons CSS : revenir en arrière coûte cinq minutes.

### Constantes conservées

Cibles tactiles de 44 px minimum — l'app est utilisée en salle, téléphone en main,
entre deux séries.

Élément signature : les charges sont représentées par des **disques olympiques aux
couleurs réglementaires** (25 rouge, 20 bleu, 15 jaune, 10 vert, 5 blanc), calculés
par côté sur une barre de 20 kg. Fonction `disques()` dans `index.html`.
Ces couleurs sont normatives, pas décoratives : elles ne suivent pas la charte.

## 10. Prochaines étapes

1. ~~Programme de test~~ — fait, `Muscu ▸ Charger le programme de test`
2. ~~Les trois icônes~~ — faites, générées depuis `favicon.ico`
3. Lancer `Muscu ▸ Migration : aligner les colonnes` sur le Sheet, puis
   `Recharger le programme de test (remplace)` pour voir superset, cadence et gainage
4. Valider une série de bout en bout depuis le téléphone
5. Installer sur téléphone (Safari sur iOS, Chrome sur Android) et juger l'ergonomie réelle
6. Saisir le catalogue d'exercices réel du coach
7. Activer le déclencheur hebdomadaire sur `rapportHebdo()`
8. Décider si on reprend le modèle AppSheet complet (§ 13)

## 11. Idées d'évolution non implémentées

- File d'attente locale pour la saisie hors ligne (aujourd'hui, une série validée sans réseau est perdue)
- Interface coach en écriture pour composer les programmes depuis l'app
- Graphiques de progression par exercice
- Notification au coach lors d'un record battu
- Export PDF du bilan mensuel via `DocumentApp`
- Archivage annuel : le Sheet reste confortable jusqu'à ~50 000 lignes de séries

## 12. Outillage local — clasp

`clasp` est la CLI officielle Google qui synchronise un dossier local avec un projet
Apps Script. Elle supprime les copier-coller vers l'éditeur en ligne.

**En place sur ce poste :** Node 24 (via `nvm`, dans `~/.nvm`) et `@google/clasp` 3.4.1
en global. Les nouveaux terminaux chargent Node automatiquement (`~/.bashrc`).
Session ouverte au nom de `grapinat.pwts@gmail.com`, identifiants dans `~/.clasprc.json`
(hors du dépôt, cf. `.gitignore`).

Le backend vit dans `apps-script/`, séparé de la racine : GitHub Pages sert
`index.html` depuis la racine, et clasp ne pousse que le contenu de `apps-script/`.
Sans cette séparation, clasp enverrait `index.html` dans le projet Apps Script.

```
apps-script/
├── .clasp.json        scriptId + réglages clasp
├── appsscript.json    manifeste (fuseau Europe/Paris, V8, webapp ANYONE_ANONYMOUS)
└── Code.js            le backend — « Code.gs » dans l'éditeur en ligne
```

Le fichier s'appelle `Code.js` en local et `Code.gs` dans l'éditeur : clasp fait la
conversion. Ne pas le renommer en `.gs`, un `pull` recréerait un `Code.js` à côté.

### Coordonnées clasp

| Élément | Valeur |
|---|---|
| Script ID | `1IGvh4SSg-1YAZpO3yjEipg3YucdGG32HMLLSa1VQmhyqBU8g6Sciu09N` |
| Déploiement servant `/exec` | `AKfycbw8wC_TmFuLzP8yTrOmX5wH5k3Yoc-AbauN3Hj9oF57Lc1NSA-MrclnkuTnKr8DtBpEiQ` (@3) |

Le Script ID n'est pas un secret : sans droit Drive sur le projet, il ne donne accès
à rien. L'ID de déploiement est déjà public, c'est le segment de l'URL `/exec`.

### Usage quotidien, depuis `apps-script/`

| Commande | Effet |
|---|---|
| `clasp pull` | rapatrie l'état de l'éditeur en ligne |
| `clasp push` | envoie le code local vers l'éditeur |
| `clasp push --watch` | pousse à chaque enregistrement |
| `clasp status` | liste ce qui serait poussé |
| `clasp open-script` | ouvre l'éditeur dans le navigateur |
| `clasp tail-logs` | affiche les logs d'exécution |

**`push` ne déploie pas.** Le code poussé devient la version « HEAD » de l'éditeur ;
l'URL `/exec` continue de servir le déploiement figé @3. Pour publier une modification :

```
clasp push
clasp redeploy AKfycbw8wC_TmFuLzP8yTrOmX5wH5k3Yoc-AbauN3Hj9oF57Lc1NSA-MrclnkuTnKr8DtBpEiQ -d "ce qui change"
```

`redeploy` **met à jour** le déploiement existant : l'URL ne change pas, rien à
reporter dans `index.html`. Ne jamais utiliser `clasp deploy` (sans ID), qui en
créerait un nouveau — c'est le piège du § 8.

**Toujours `pull` avant de modifier** si le code a pu être touché dans l'éditeur en
ligne : `push` écrase le distant sans fusion.

### `clasp run` — tenté, abandonné

Objectif : lancer `migrerSchema` ou `programmeTest` depuis le terminal, sans passer
par le menu du Sheet. **Non retenu.** Trois obstacles levés, un quatrième rédhibitoire :

1. Déploiement de type « exécutable de l'API » manquant → `NOT_FOUND`. Créé puis
   **supprimé** : il rendait le manifeste `webapp` visible sous une seconde URL
   `/exec` publique, pour rien.
2. Client OAuth de Google au lieu d'un client du projet → résolu, clasp s'authentifie
   maintenant avec `765877661024-16v27e30…` (client « Application de bureau » du
   projet `coaching-musculation`, credentials dans `~/creds.json`, hors dépôt).
3. API Apps Script non activée sur le projet Cloud — distinct du réglage
   `script.google.com/home/usersettings`. Activée.
4. **Le périmètre d'autorisation.** L'API d'exécution ne sait pas travailler avec le
   scope restreint d'un script lié à un classeur. Il aurait fallu déclarer le scope
   Sheets complet, donnant au script l'accès à *tous* les classeurs du coach.
   Refusé : le cloisonnement vaut mieux que la commodité.

Conséquence : **les fonctions se lancent depuis le menu `Muscu` du Sheet.**
`migrerSchema`, `programmeTest`, `rechargerProgrammeTest` y sont toutes.

`projectId` a été ajouté à `.clasp.json` au passage — sans lui, `clasp list-apis` et
`clasp open-credentials-setup` envoient le script ID à la place de l'ID du projet et
échouent sur « projet non valide ».

### Coordonnées clasp

| Élément | Valeur |
|---|---|
| Script ID | `1IGvh4SSg-1YAZpO3yjEipg3YucdGG32HMLLSa1VQmhyqBU8g6Sciu09N` |
| Déploiement servant `/exec` | `AKfycbw8wC_TmFuLzP8yTrOmX5wH5k3Yoc-AbauN3Hj9oF57Lc1NSA-MrclnkuTnKr8DtBpEiQ` (@3) |

Le Script ID n'est pas un secret : sans droit Drive sur le projet, il ne donne accès
à rien. L'ID de déploiement est déjà public, c'est le segment de l'URL `/exec`.

### Usage quotidien, depuis `apps-script/`

| Commande | Effet |
|---|---|
| `clasp pull` | rapatrie l'état de l'éditeur en ligne |
| `clasp push` | envoie le code local vers l'éditeur |
| `clasp push --watch` | pousse à chaque enregistrement |
| `clasp status` | liste ce qui serait poussé |
| `clasp open-script` | ouvre l'éditeur dans le navigateur |
| `clasp tail-logs` | affiche les logs d'exécution |

**`push` ne déploie pas.** Le code poussé devient la version « HEAD » de l'éditeur ;
l'URL `/exec` continue de servir le déploiement figé @3. Pour publier une modification :

```
clasp push
clasp redeploy AKfycbw8wC_TmFuLzP8yTrOmX5wH5k3Yoc-AbauN3Hj9oF57Lc1NSA-MrclnkuTnKr8DtBpEiQ -d "ce qui change"
```

`redeploy` **met à jour** le déploiement existant : l'URL ne change pas, rien à
reporter dans `index.html`. Ne jamais utiliser `clasp deploy` (sans ID), qui en
créerait un nouveau — c'est le piège du § 8.

**Toujours `pull` avant de modifier** si le code a pu être touché dans l'éditeur en
ligne : `push` écrase le distant sans fusion.

### Exécuter une fonction depuis le terminal — `clasp run`

Objectif : lancer `migrerSchema`, `programmeTest`, `rechargerProgrammeTest` sans
passer par le menu du Sheet.

Deux conditions, dont une seule reste à remplir :

1. **Un déploiement de type « exécutable de l'API ».** Fait : `executionApi` avec
   `access: MYSELF` a été ajouté au manifeste, et le déploiement **@4** créé. Sans
   lui, `clasp run` répond `NOT_FOUND`. `MYSELF` = seul le propriétaire du script
   peut appeler, rien n'est ouvert à quiconque.

2. **Un client OAuth appartenant au projet Cloud du script.** *À faire.*
   `scripts.run` exige que l'application appelante et le script partagent le même
   projet Cloud. clasp utilise par défaut le client OAuth de Google, d'où le
   message « Unable to run script function ». Il faut donc un client local :

   ```
   clasp open-credentials-setup          # ouvre la page Identifiants du projet
   # → Créer des identifiants ▸ ID client OAuth ▸ Application de bureau
   # → télécharger le JSON, par exemple dans ~/creds.json
   clasp login --creds ~/creds.json --extra-scopes https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/script.external_request,https://www.googleapis.com/auth/script.send_mail
   ```

   Les trois scopes correspondent à ce qu'utilise `Code.gs` : le Sheet,
   `UrlFetchApp` pour la vérification des tokens, `MailApp` pour `rapportHebdo`.
   Le jeton d'appel doit couvrir tout ce que la fonction touche.

   Le fichier de credentials contient un secret client : il est dans `.gitignore`,
   ne jamais le committer.

Ensuite :

```
clasp run migrerSchema
clasp run rechargerProgrammeTest
clasp run --params '["EX007"]' uneFonctionAvecArguments
```

`clasp run` s'exécute en mode dev par défaut : c'est la version **HEAD** qui tourne,
donc le code fraîchement poussé, pas celui du déploiement figé.

> **Effet de bord à connaître.** Le manifeste déclare aussi `webapp`, donc le
> déploiement @4 est *également* une application web et possède sa propre URL
> `/exec` publique. Même code, même vérification de token qu'en @3 : pas de risque
> nouveau, mais c'est une seconde URL vivante. `clasp undeploy <id>` la retire —
> au prix de `clasp run`, qui cesse alors de fonctionner.

> **Ce que ça donne comme pouvoir.** `clasp run` exécute n'importe quelle fonction
> du projet sous l'identité du coach, avec tous les droits du script sur le Sheet.
> C'est le but recherché, mais `rapportHebdo` envoie de vrais mails : à ne pas
> lancer à l'aveugle.

## 13. Le modèle AppSheet — ce qu'on en a repris

L'app AppSheet « BDD musculation » (classeur `1Kjo6Vmv…`, propriété du coach) a servi
de référence. Son moteur ne se laisse pas inspecter par outillage — la page ne se
stabilise jamais — mais le classeur source dit tout.

### Sa hiérarchie

```
Programme  (GR Février, 5 semaines, thème « Squats Bench Deadlift », Actif)
└─ Séance  (n°2, « HDC + box + deadlift », jour « 2-Mardi »)
   └─ Travail  (n°1 · 4 séries · 90 s)          ← notre « bloc »
      └─ Ligne  (Incline neutral DB row · 10 reps · 34 kg · cadence 1-1-1-0)
      └─ Ligne  (Développé militaire assis · 12 reps · 23 kg · 1-0-1-0)
```

Le « Travail » porte les séries et le repos ; les lignes portent reps, charge et
cadence. **C'est ce niveau qu'on a repris sous le nom de bloc** (§ 5), en le
réduisant à une colonne au lieu d'une table.

### Ce qu'on n'a pas repris

| Notion | Chez AppSheet | Chez nous |
|---|---|---|
| Programme réutilisable | entité, versionnée, `Actif`/`Brouillon` | absent — lignes collées à un email |
| `% RM` | colonne | absent |
| `Cadence` (tempo 1-0-3-0) | colonne | **repris** → `cadence` |
| `Temps pause` (rest-pause intra-bloc) | colonne | **repris** → `pause_s` |
| `Durée` (exercice au temps, « max ») | colonne | **repris** → `duree_s` |
| Catalogue exercice | + équipement, description longue, GIF, vidéo YouTube | id, nom, groupe, consigne |
| Profil pratiquant | ~20 champs + questionnaire de 104 colonnes | 5 champs |
| Blessures | 17 zones typées | absent |

Le questionnaire d'entrée est la pièce la plus riche et la plus absente : objectifs
notés, accès matériel, blessures par zone, sommeil, stress, alimentation,
disponibilités **heure par heure de 6 h à 23 h**, motivation, craintes. Le coach
compose à partir de contraintes, pas d'un objectif — les blessures et les créneaux
pèsent plus lourd que « prise de masse ».

### Deux leçons de leurs données

**Le préfixe numérique du jour.** `1-Lundi`, `2-Mardi` : le tri tombe juste. On a
préféré garder le texte libre et trier par jour de semaine côté serveur, mais le
problème était réel — l'alphabétique plaçait « Jeudi » avant « Lundi ».

**Les colonnes dénormalisées dérivent.** `Programme` et `Séance` sont recopiées dans
chaque table enfant ; elles sont déjà vides pour « GR Bulgare » alors que les liens
par ID sont bons. Le catalogue contient aussi deux « Curl » distincts, un exercice
nommé « Test » et deux lignes vides. À ne pas reproduire : un seul identifiant fait
foi, jamais de libellé recopié.
