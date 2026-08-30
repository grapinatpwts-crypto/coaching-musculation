# Coaching Fitness — état du projet

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
- **Rien ne part vers un pratiquant sans un geste du coach.** Il est
  auto-entrepreneur : l'app lui fait gagner du temps, elle ne parle jamais à sa
  place. Aucun message, aucune relance, aucune notification automatique vers un
  pratiquant. Décidé explicitement, à ne pas revenir dessus sans nouvelle décision.

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
| Coach | Jérémy — `grapinat.pwts@gmail.com` |
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
| `Pratiquants` | email, nom, **statut**, **telephone**, date_inscription, objectif, **notes**, actif |
| `Exercices` | id, nom, **nom_en**, groupe, equipement, consigne, photo, video |
| `Ajustements` | id, email, attribution_id, exercice_id, charge, note, maj_le |
| `Modeles` | id, nom, categorie, difficulte, description, duree_semaines, statut, **source**, **video**, cree_le |
| `ModeleLignes` | id, modele_id, jour, bloc, ordre, exercice_id, series, reps_cible, duree_s, charge_cible, **pct_rm**, cadence, pause_s, repos_s |
| `Attributions` | id, email, modele_id, nom, date_debut, date_fin, statut, **paye**, notes, cree_le |
| `Maxis` | id, email, exercice_id, rm_kg, date, source |
| `Programmes` | id, **attribution_id**, email, jour, bloc, ordre, exercice_id, series, reps_cible, duree_s, charge_cible, **pct_rm**, cadence, pause_s, repos_s |
| `Seances` | id, email, date, jour, duree_min, ressenti, notes, **exercices_finis** |
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
Sheet déjà installé, `Coaching Fitness ▸ Migration : colonne bloc` crée la colonne et recopie
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
| `seance` | `{jour}` | `{seance_id, debut, faits, finis, blocs}` — `faits` les séries déjà saisies, `finis` les exercices clos |
| `demarrer` | `{jour}` | `{seance_id}` |
| `serie` | `{seance_id, exercice_id, serie_num, reps \| duree_s, charge}` | confirmation |
| `terminer` | `{seance_id, duree_min?, ressenti, notes}` | clôt la séance ; durée déduite du début si absente |
| `finirExercice` | `{seance_id, exercice_id}` | clôt un exercice sans exiger toutes ses séries |
| `reprendreExercice` | `{seance_id, exercice_id}` | rouvre un exercice clos par erreur |
| `historique` | `{exercice_id}` | 30 dernières séries |
| `calendrier` | `{depuis?, jusqua?, email?}` | séances de la période + volume et durée |
| `catalogue` | — | bibliothèque d'exercices complète |
| `coachAthletes` | — | liste des pratiquants + jours d'inactivité |
| `coachDetail` | `{email}` | 15 dernières séances détaillées |
| `exerciceSave` | `{id?, nom, groupe, equipement, consigne, video}` | crée ou met à jour ; sans `id` c'est une création |
| `exerciceSuppr` | `{id}` | refuse si l'exercice est employé dans un programme |
| `programme` | `{email, attribution_id?}` | contenu d'une attribution ; par défaut celle en cours |
| `programmeSave` | `{email, attribution_id, jour, blocs}` | réécrit **un seul jour** |
| `programmeJour` | `{attribution_id, jour}` | supprime un jour entier |
| `modeles` | — | liste des modèles génériques + nombre de jours et d'exercices |
| `modele` | `{id}` | un modèle avec son contenu |
| `modeleSave` | `{id?, nom, categorie, difficulte, description, duree_semaines, statut}` | fiche du modèle |
| `modeleJourSave` | `{modele_id, jour, blocs}` | réécrit un jour du modèle |
| `modeleJour` | `{modele_id, jour}` | supprime un jour du modèle |
| `modeleSuppr` | `{id}` | supprime le modèle et son contenu |
| `attributions` | `{email}` | historique des programmes d'un pratiquant |
| `attribuer` | `{email, modele_id?, nom?, date_debut?}` | donne un programme, en copiant le modèle |
| `attributionMaj` | `{id, statut?, nom?, date_fin?, notes?}` | modifie une attribution |
| `attributionSuppr` | `{id}` | supprime l'attribution **et ses lignes** |

Les cinq dernières sont réservées au coach (`guardCoach_`). `calendrier` accepte un
`email` **uniquement** si l'appelant est le coach : pour tout le monde d'autre, la
cible est l'email du token (`cibleEmail_`), jamais un paramètre client.

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

## 8 bis. Le poste de travail du coach

Trois écrans, sous l'onglet **Coach**.

**Bibliothèque.** Le catalogue d'exercices, groupé par groupe musculaire, avec
recherche. Chaque fiche porte nom, groupe, équipement, consigne d'exécution et lien
vidéo. Création et modification depuis l'app ; les identifiants `EXnnn` sont attribués
automatiquement à la suite du plus grand existant. **La suppression est refusée si
l'exercice figure encore dans un programme** — le message dit combien de lignes
l'emploient, plutôt que de casser un programme en silence.

**Modèles.** Deux niveaux. L'écran ouvre sur les **catégories**, en boutons : c'est
la première question que se pose le coach — force, hypertrophie, endurance. Une
catégorie ouvre sa page, où les modèles sont rangés en **sections pliées par
difficulté** et triés par nom.

Catégorie et difficulté sont des **listes ouvertes** : le coach tape ce qu'il veut,
les valeurs déjà utilisées lui sont proposées. Rien n'est figé dans le code, sinon
l'ordre d'affichage des quatre difficultés usuelles — les autres viennent ensuite,
« Sans difficulté » en dernier.

**Programme.** Un pratiquant, un jour, des blocs. Le nombre de tours et le repos se
saisissent sur l'en-tête du bloc ; chaque exercice ouvre une fiche où l'on règle
répétitions *ou* durée, charge, cadence et pause. La cadence s'y prévisualise en
courbe, en direct. L'ordre des exercices se change avec la flèche.

L'enregistrement **réécrit un jour entier** : les lignes existantes de ce couple
(email, jour) sont supprimées puis remplacées, les autres jours et les autres
pratiquants ne bougent pas. Les numéros de bloc et d'ordre sont renumérotés à
l'écriture — l'éditeur n'a pas à les tenir à jour.

**Calendrier.** Le même composant sert au pratiquant pour lui-même et au coach par
pratiquant : grille mensuelle, jours travaillés en rouge, bilan du mois (séances,
volume, minutes), détail au clic sur un jour. Les séances sont chargées une fois sur
douze mois, la navigation entre mois ne recharge rien.

### Ce qui n'est pas fait

Le programme reste attaché à un email. Composer le même programme pour douze
personnes, c'est encore douze saisies. Le modèle `Programme` réutilisable et affecté
du § 13 reste le prochain chantier — c'est lui qui ferait passer l'outil à l'échelle
des 40 pratiquants.

## 8 ter. Modèles génériques et attributions

Le programme d'un pratiquant naît en deux temps, et cette séparation est le cœur
du modèle de données.

```
Modele  « Force 5×5 » · Force · Intermédiaire · 8 semaines · Actif
  └─ ModeleLignes            générique, aucun pratiquant
        │
        │  attribuer_() COPIE les lignes
        ▼
Attribution  Guillaume · « Force 5×5 » · depuis le 21/07 · En cours
  └─ Programmes              personnalisable sans toucher au modèle
```

**La copie est délibérée.** Personnaliser le programme d'un pratiquant — alléger une
charge, retirer un exercice qui réveille une épaule — ne doit pas modifier le modèle
ni les programmes des autres. Et le même modèle peut être redonné au même pratiquant
des mois plus tard, sur des bases différentes, sans conflit.

**Une seule attribution « En cours » par pratiquant.** `attribuer_()` clôt
automatiquement la précédente en la passant à « Terminé » avec sa date de fin.
L'historique reste : la liste des attributions est la chronologie des programmes
suivis, et le coach peut rouvrir n'importe lequel pour le consulter ou le corriger.

Une attribution peut naître **sans modèle** : page blanche, pour du sur-mesure.
`modele_id` reste alors vide.

`getSeance_` et `bootstrap_` lisent les lignes de l'attribution en cours, via
`lignesProgramme_()`. Sans attribution, on retombe sur les lignes non rattachées :
un Sheet non migré continue de fonctionner.

### L'éditeur est le même des deux côtés

`peindreEditeur()` sert aux modèles comme aux programmes attribués : la structure
jour → bloc → exercice est identique, seule la clé de rattachement change.
`S.ed.cible` vaut `'modele'` ou `'programme'` et aiguille l'enregistrement.

## 8 quater. Session et reprise

**La session survit au rechargement.** Le jeton Google et le profil sont conservés
dans `localStorage`, et restaurés au chargement si le jeton n'est pas expiré — il
vaut environ une heure. Le profil est rafraîchi en arrière-plan.

Un échec de ce rafraîchissement ne déconnecte pas : en salle, le réseau saute, et
perdre sa séance parce qu'un mur est en béton serait absurde. Seul un compte devenu
inconnu, ou un jeton refusé par le serveur, ramène à l'écran de connexion.

Le jeton en `localStorage` est une clé de session au porteur. Il expire seul en une
heure et le bouton **Quitter** l'efface, en coupant aussi la reconnexion
automatique de Google.

### Rien n'oblige à aller au bout

Une séance réelle s'interrompt : matériel occupé, douleur, temps qui manque. Trois
sorties sont prévues, à tous les niveaux.

**Terminer un exercice** sans faire toutes ses séries — bouton dans l'écran de
saisie. Les séries déjà enregistrées sont conservées, l'exercice passe en « clos » et
la carte affiche « arrêté à 2 ». Dans un superset, l'enchaînement saute les exercices
clos et continue avec les autres.

**Terminer la séance** à tout moment — bouton en bas de la liste, actif dès qu'une
séance est ouverte. La durée est pré-remplie depuis l'heure de début ; ressenti et
notes sont libres. Les exercices jamais commencés restent simplement non commencés :
aucune notion d'échec.

**Ne rien terminer du tout.** La séance reste ouverte et se reprend le jour même.
Le lendemain, `seanceOuverte_` ne la voit plus — elle filtre sur la date — et une
nouvelle séance démarre. L'ancienne garde sa `duree_min` vide, ce qui la distingue
des séances closes.

La colonne `exercices_finis` de `Seances` porte la liste des exercices clos, séparés
par des virgules. C'est ce qui permet de retrouver l'état exact après un rechargement.

**La séance en cours se reprend.** `getSeance_` renvoie la séance du jour si elle est
ouverte, avec les séries déjà saisies ; `demarrerSeance_` la réutilise au lieu d'en
créer une seconde. Auparavant les données étaient bien écrites dans le Sheet, mais
les compteurs de l'écran repartaient de zéro après un rechargement.

## 8 quinquies. Aucune migration obligatoire

`feuille_()` crée l'onglet manquant depuis `SCHEMA`, et complète l'en-tête avec les
colonnes déclarées mais absentes. `lire_()` renvoie un tableau vide sur un onglet
inexistant.

Conséquence : **ajouter une colonne ou un onglet à `SCHEMA` suffit**, le classeur se
met à niveau au premier usage. Une version antérieure exigeait de lancer la migration
avant de pouvoir seulement se connecter — `bootstrap_` lisait `Attributions`, absent,
et `getDataRange()` échouait sur `null`.

`Coaching Fitness ▸ Migration : aligner les colonnes` reste utile pour une chose que
l'auto-création ne fait pas : rattacher les lignes de `Programmes` antérieures au
modèle d'attribution à une attribution « Programme courant ».

## 8 sexies. Charges en pourcentage du max

`pct_rm` sur une ligne de programme remplace la charge fixe : la charge est
recalculée à chaque lecture depuis le 1RM du pratiquant, et suit donc sa
progression sans que le coach ait à retoucher le programme.

```
Squat · 5 tours
  ├─ 3 reps à 90 %   ─┐ même exercice, même bloc
  └─ 12 reps à 60 %  ─┘ top set puis back-off
```

**D'où vient le 1RM.** Une valeur saisie par le coach dans `Maxis` fait foi. À
défaut, il est estimé depuis les séries réalisées par la formule d'Epley,
`1RM ≈ charge × (1 + reps / 30)`, en retenant la **meilleure** estimation et non la
plus récente — un maxi ne se perd pas d'une séance à l'autre. Les séries de plus de
15 répétitions sont ignorées, Epley y devient trop optimiste.

La charge obtenue est arrondie au multiple de 2,5 kg, le plus petit saut réel sur une
barre. L'app affiche la charge **et** son origine — « 107,5 kg · 90 % de 120 kg » —
et précise « estimés » quand le max n'a pas été mesuré : le pratiquant doit savoir
si le chiffre repose sur une mesure ou sur un calcul.

Sans 1RM connu, la ligne affiche « % — max inconnu » plutôt qu'une charge fausse.

L'écran **Coach ▸ un athlète ▸ Maxis** liste les exercices, ceux du programme
d'abord, avec leur 1RM et sa source. Une valeur saisie peut être effacée pour
revenir à l'estimation.

## 8 sexies. Hors ligne

Une salle en sous-sol coupe le réseau, et c'est précisément là que la saisie a lieu.
Deux mécanismes, indépendants.

**Les lectures sont mises en cache.** `lire()` tente le réseau, et sert la dernière
copie connue en cas d'échec. L'app s'ouvre et affiche le programme du jour sans
connexion.

**Les écritures sont mises en file.** `ecrire()` tente l'envoi ; sans réseau, l'action
est empilée dans `localStorage` et la séance continue sans blocage. La file est
rejouée dans l'ordre au retour du réseau, à l'ouverture de l'app, et toutes les
20 secondes tant qu'elle n'est pas vide. Un bandeau indique le nombre d'actions en
attente.

Seules cinq actions sont différables — `demarrer`, `serie`, `finirExercice`,
`reprendreExercice`, `terminer`. Elles décrivent un fait daté, pas un état global :
les rejouer plus tard reste juste. Rien de ce que compose le coach n'est différé.

**Le cas de la séance créée hors ligne.** `demarrer` ne peut pas renvoyer
d'identifiant serveur : l'app en fabrique un provisoire, `LOC-…`, et les séries s'y
rattachent. Au rejeu, la séance est créée pour de bon et l'identifiant est substitué
partout, y compris dans l'état courant. Aucune ligne ne part avec un `LOC-`.

Vérifié sous Node, hors navigateur : séance démarrée hors ligne, deux séries, une
clôture d'exercice, rechargement, retour du réseau — quatre actions rejouées dans
l'ordre sur le bon identifiant.

## 8 septies. Courbes de progression

L'écran Progrès trace, par exercice, la charge la plus lourde de chaque séance, du
plus ancien au plus récent. `courbeProgression()` dans `index.html`, SVG inline.

L'échelle part de **90 % du minimum**, pas de zéro : sur des charges qui passent de
50 à 60 kg, une échelle absolue écraserait la pente et ne dirait rien. L'écart depuis
la première séance est affiché à côté du record.

## 8 octies. La charge appartient au pratiquant

Le coach fixe une charge, ou un pourcentage du max. Mais c'est le pratiquant qui est
sous la barre : il peut décider autrement, et son choix tient d'une séance à l'autre.

Trois sources, dans cet ordre de priorité :

| Source | Quand | Affiché |
|---|---|---|
| `charge_cible` | le coach a fixé un poids | « Charge prévue par le coach » |
| `pct_rm` × 1RM | le coach a fixé un pourcentage et le max est connu | « 90 % de votre max (100 kg) » |
| `Ajustements` | le pratiquant a enregistré sa propre charge | « Votre charge · le programme dit 60 kg » |

**Un pourcentage sans max connu ne donne aucune charge.** L'app le dit —
« votre max n'est pas connu, à vous de juger » — plutôt que d'inventer un chiffre.

L'ajustement se pose depuis l'écran de saisie : le pratiquant change la charge, un
bouton propose de la garder. Un second appui revient à la charge du programme.
L'ajustement est rattaché à l'attribution en cours : un nouveau programme repart
des valeurs du coach.

## 8 nonies. Bibliothèque de départ

`apps-script/Catalogue.js` contient **167 exercices en français**, versés
dans l'onglet `Exercices` par `Coach ▸ Réglages ▸ Importer le catalogue de départ`.

Répartition : Jambes 16, Dos 15, Pectoraux 12, Abdominaux 10, Épaules 9, Triceps 9,
Biceps 8, Fessiers 7, Mollets 3, Trapèzes 3, Avant-bras 3, Lombaires 2.
Par matériel : barre 29, haltère 24, poids de corps 18, poulie 13, machine 9,
barre EZ 3, kettlebell 1.

**Provenance et droits.** Données et images viennent de
[free-exercise-db](https://github.com/yuhonas/free-exercise-db), publié sous
*Unlicense* — versé au domaine public, réutilisation libre y compris commerciale,
sans attribution obligatoire. Les noms, groupes, équipements et consignes ont été
rédigés en français pour ce projet ; seules les illustrations sont reprises telles
quelles, servies depuis leur dépôt.

**Ce qui a été écarté.** Les fiches de docteur-fitness.com ont servi de référence
de *structure* — leur découpage groupe / matériel / consigne est propre. Leurs
illustrations, en revanche, portent un crédit d'illustrateur tiers
(`© Aliaksandr Makatserchyk`) : les reprendre dans une app distribuée à
40 pratiquants serait une contrefaçon. Si le coach y tient, la voie est de leur
demander une licence, ou de photographier ses propres mouvements en salle.

L'import est **relançable** : un exercice dont le nom existe déjà est ignoré, les
fiches saisies par le coach ne sont jamais touchées, et les identifiants continuent
la numérotation existante.

## 8 decies. Statuts des pratiquants

| Statut | Ce que ça veut dire | Accès à l'app |
|---|---|---|
| **Nouveau** | inscrit, aucun programme démarré | complet |
| **Actif** | en cours de suivi | complet |
| **Inactif** | pause, arrêt temporaire | **lecture seule** — il consulte, il ne saisit plus |
| **Archivé** | terminé | **aucun** — les données restent conservées |

Le contrôle est fait dans `doPost`, avant tout routage : un compte archivé reçoit
`COMPTE_ARCHIVE`, un compte inactif reçoit `COMPTE_INACTIF` sur les six actions qui
écrivent (`ECRITURES_PRATIQUANT`). La lecture reste ouverte à un inactif — couper
l'accès à son propre historique n'aurait servi personne.

Rien n'est jamais supprimé : archiver, c'est fermer la porte, pas effacer.

## 8 undecies. Le poste de travail du coach

Le coach ne suit pas de programme dans l'app. Sa barre de navigation est donc
différente de celle d'un pratiquant : **Athlètes · Modèles · Bibliothèque ·
Réglages**, construite selon le rôle par `construireNav()`. Il n'a plus d'écran
Séance ni Progrès pour lui-même.

**L'accueil liste ses athlètes**, triés par statut puis par ancienneté de la dernière
séance — les nouveaux d'abord, les silencieux ensuite. Chaque carte porte le statut,
le programme en cours, une barre d'avancement et un rappel « à encaisser » si le
programme n'est pas payé.

**Deux mesures d'avancement**, qui ne disent pas la même chose. Le temps écoulé donne
« semaine 4 sur 8 ». L'assiduité donne « 6 séances sur 16 attendues », et c'est elle
qui alimente la barre : un programme peut être à sa moitié dans le calendrier sans
que personne ne soit venu. Sans durée déclarée au modèle, la référence devient ce qui
aurait dû être fait depuis le début.

**La fiche du pratiquant** ouvre sur l'identité, l'objectif et trois boutons de
contact — WhatsApp, appel, e-mail — construits depuis le téléphone normalisé au
format international. Puis le statut, modifiable d'un appui, et l'historique des
programmes donnés avec pour chacun une case **payé / non payé**.

C'est le début du volet administratif : le suivi de paiement est volontairement
minimal — une case, pas une facturation.

## 8 duodecies. Prévenir un pratiquant

Un programme attribué doit être annoncé. Le bouton **Prévenir** — sur la fiche à
côté de chaque programme, dans l'onglet Programme, et proposé automatiquement juste
après une attribution — ouvre un message pré-écrit, modifiable, et laisse le coach
choisir son canal.

| Canal | Comment | Coût |
|---|---|---|
| WhatsApp | `https://wa.me/<numéro>?text=…` | aucun |
| SMS | `sms:<numéro>?&body=…` | le forfait du coach |
| Client mail | `mailto:?subject=&body=` | aucun |
| E-mail direct | `MailApp` depuis le compte du coach | aucun, quota Google |

Les trois premiers ouvrent l'application du téléphone avec le texte pré-rempli :
rien ne transite par un service tiers, le coach relit et envoie lui-même. La forme
`sms:numéro?&body=` est celle qui convient à la fois à Android, qui attend `?body=`,
et à iOS, qui attend `&body=`.

Le quatrième part directement du compte Google du coach, avec son nom en expéditeur
et son adresse en réponse. Utile depuis un PC, où les liens `sms:` ne mènent nulle
part. Le quota Google restant est rappelé après l'envoi.

Le texte est composé **côté serveur** (`messageType_`) : il reste identique quel que
soit le canal, et se modifie en un seul endroit. Il reprend le nom du programme, le
nombre de séances par semaine, la durée et la date de début.

### Pas d'envoi automatique — décision tranchée

Deux raisons, la seconde suffisant à elle seule.

Techniquement, Apps Script ne sait pas envoyer de SMS : il faudrait une passerelle
payante, ce qui contredirait le « pas de coût par utilisateur » du § 1.

Mais surtout, **le coach veut garder la main.** Il relit et envoie lui-même, y
compris par e-mail. Le bouton « Envoyer depuis mon compte » n'est pas une
automatisation : c'est un raccourci qui lui évite de recopier le texte, et il ne
part que sur son clic.

Deux envois existent dans tout le projet, et deux seulement :

| Fonction | Destinataire | Déclencheur |
|---|---|---|
| `notifierMail_` | le pratiquant | le clic du coach, après relecture |
| `rapportHebdo` | **le coach lui-même** | manuel, ou déclencheur hebdomadaire |

`rapportHebdo` peut donc être automatisé sans réserve : il ne s'adresse qu'au coach.
Aucune fonction n'écrit à un pratiquant sans action humaine.

## 8 terdecies. Programmes types

`Coaching Fitness ▸ Réglages ▸ Importer dix programmes types` verse dix méthodes
largement documentées comme modèles réutilisables : 5×5 débutant, Force 3 jours,
Push Pull Legs, Haut/Bas 4 jours, Full body débutant, Cycle 5/3/1, Texas Method,
Madcow 5×5, Split 5 jours, Sans matériel. **135 lignes d'exercices au total**,
toutes rattachées au catalogue de départ.

**Sur les droits.** Un schéma séries × répétitions est une méthode, pas une œuvre :
il se reprend librement. Les descriptions sont rédigées pour ce projet, aucune n'est
recopiée, et l'origine est citée quand la méthode porte le nom de son auteur —
Rippetoe pour Starting Strength, Wendler pour 5/3/1. C'est de l'honnêteté autant que
du service : le coach voudra remonter à la source.

Ce sont des **points de départ à adapter**. Les pourcentages supposent un max connu ;
les charges fixes sont laissées à zéro quand elles dépendent trop de la personne.

L'import est relançable : un modèle portant déjà le même nom est laissé intact, le
coach ayant pu l'adapter.

### Source et vidéo

Un modèle porte deux liens facultatifs : `source`, la page qui documente la méthode,
et `video`. La fiche affiche un bouton **Source ↗** et, si une vidéo est renseignée,
un **lecteur intégré** — YouTube et Vimeo sont reconnus et joués sur place, toute
autre adresse devient un simple lien. Intégrer une URL quelconque dans une iframe
exposerait l'app à ce que sert la page ; le cadrage aux deux plateformes est délibéré.

Sept des dix programmes portent une source, **vérifiée en HTTP avant publication** :

| Programme | Source |
|---|---|
| 5×5 débutant, Madcow 5×5 | `stronglifts.com` |
| Force 3 jours | `startingstrength.com` |
| Push Pull Legs, Full body débutant, Cycle 5/3/1 | `thefitness.wiki` |
| Sans matériel | wiki r/bodyweightfitness |

Haut/Bas, Texas Method et Split 5 jours n'en portent pas : ce sont des découpages
génériques sans page canonique.

**Aucune vidéo n'est renseignée.** Une adresse YouTube ne se devine pas, et je n'en
ai pas trouvé qui fasse autorité pour ces méthodes ; inventer un identifiant aurait
donné un lecteur affichant n'importe quoi. Le champ existe et le lecteur fonctionne :
il suffit de coller une adresse.

## 8 quaterdecies. Contenus achetés : la règle

Le dépôt GitHub est **public**. Le Google Sheet est **privé**. Cette différence
décide de tout.

| Contenu | Où il va |
|---|---|
| Catalogue d'exercices, méthodes publiquement documentées | dépôt, comme aujourd'hui |
| Contenus achetés, programmes écrits par le coach | **Sheet uniquement** |

Un nom d'exercice n'appartient à personne : « traction d'omoplates », « dips
négatifs », « squat archer » sont le vocabulaire de la discipline. Le catalogue les
reprend librement. Un **agencement de séries, répétitions et progressions**, lui, est
le produit vendu : il n'a rien à faire dans un dépôt public, et sa diffusion à
40 pratiquants est une question de licence que le coach doit poser à l'auteur.

L'usage personnel — remettre dans son propre suivi un programme qu'on a acheté —
ne pose pas ce problème.

### L'onglet Import

Pour verser un programme sans passer par le dépôt : un onglet **Import** du classeur
sert de sas. On y colle un tableau où **les exercices sont désignés par leur nom**,
puis `Coach ▸ Réglages ▸ Importer la feuille` le transforme en modèle.

Rien n'est créé si un seul nom est introuvable — la fonction renvoie la liste des
noms en défaut. Mieux vaut refuser que produire un programme troué.

Le fichier `modele-import.xlsx`, à la racine, sert de gabarit : une notice, la fiche
du modèle, la grille à remplir, et la liste des exercices disponibles en référence.
**Il ne contient aucun contenu acheté**, seulement la structure.

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

Ce qui reste, par ordre d'utilité décroissante.

1. **Importer la bibliothèque**, puis **créer le programme d'exemple**, depuis
   Coach ▸ Réglages. Compléter ensuite des exercices propres au coach (§ 8 nonies).
2. **Installer sur téléphone** et juger l'ergonomie réelle, téléphone en main
   entre deux séries. Safari sur iOS, Chrome sur Android.
3. **Étendre l'ajustement du pratiquant** au-delà de la charge, si le besoin
   apparaît à l'usage — les répétitions, par exemple (§ 8 octies).
4. **Activer le déclencheur hebdomadaire** sur `rapportHebdo()`, depuis l'éditeur
   Apps Script (`Déclencheurs ▸ Ajouter`). Il n'écrit qu'au coach, jamais aux
   pratiquants : l'automatiser ne contredit pas le principe du § 1. L'envoi manuel
   existe déjà dans Coach ▸ Réglages.
5. **Passer l'écran OAuth en Production** avant d'ouvrir aux 40 pratiquants.
   En mode Test, seuls deux comptes se connectent et leur session expire à 7 jours.

## 11. Idées d'évolution non implémentées

- Notification au coach lors d'un record battu
- Export PDF du bilan mensuel via `DocumentApp`
- Comparaison entre pratiquants suivant le même modèle
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

Conséquence : **les fonctions se lancent depuis le menu `Coaching Fitness` du Sheet.**
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
