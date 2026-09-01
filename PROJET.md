# Coaching Fitness — état du projet

Document de reprise : **comment l'app fonctionne**. Il donne tout le contexte
nécessaire pour continuer le travail sans repartir de zéro.

Pour **pourquoi elle est ainsi et où elle va** — les principes, ce qui reste avant
d'ouvrir aux 40 pratiquants, et les idées gardées dont le local-first — voir
[PRODUCTION.md](PRODUCTION.md).

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
 iPhone / Android          GitHub Pages              Firebase
 ┌──────────────┐          ┌────────────┐            ┌──────────────────────────┐
 │ PWA installée│ ────────▶│ index.html │ ──SDK─────▶│ Auth (Google)             │
 │ (icône)      │          │ (statique) │            │ Firestore (europe-west9) │
 └──────────────┘          └────────────┘            │  ↳ Security Rules        │
                                                       └──────────────────────────┘
```

Le front-end statique ne contient **aucune donnée**. L'authentification se fait par
Firebase Auth (provider Google) côté navigateur ; le SDK Firestore lit et écrit
directement depuis le client — **il n'y a plus de routeur serveur du tout**. La
sécurité tient entièrement aux Security Rules (`firestore.rules`), qui lisent le
rôle du compte par `get()` sur son propre document plutôt que par un jeton
personnalisé, pour rester sur le plan gratuit (pas de Cloud Function).

Jusqu'à l'été 2026, le backend était Google Apps Script + Google Sheets (§ 12 et
`apps-script/`, conservés en lecture, plus jamais appelés). Le détail du chantier de
bascule, vague par vague, est dans `git log` de la branche `firestore` — chaque
commit explique un « pourquoi ».

## 3. Coordonnées du projet

| Élément | Valeur |
|---|---|
| Dépôt GitHub | `grapinatpwts-crypto/coaching-musculation` (public) |
| App en ligne | https://grapinatpwts-crypto.github.io/coaching-musculation/ |
| Projet Firebase | `coaching-musculation-f0c1c` (plan **Spark**, gratuit) |
| Firestore | région `europe-west9`, règles dans `firestore.rules`, index dans `firestore.indexes.json` |
| Coach | Jérémy — `grapinat.pwts@gmail.com` |
| Salle du coach | Wellness Sport Club — Lyon Confluence |
| Second compte test | `guillaume.rapinat@gmail.com` |

La configuration Firebase (`apiKey`, `authDomain`...) visible dans `index.html` est
publique par nature — ce ne sont pas des secrets, la sécurité tient aux Security
Rules, pas à leur confidentialité. La clé de compte de service
(`scripts/service-account.json`, utilisée uniquement par `scripts/seed.mjs` en
local) est le seul vrai secret du projet : ignorée par git, jamais envoyée au client.

**État de l'écran de consentement Google (Firebase Auth) : mode Test.** Conséquence :
seuls les comptes explicitement ajoutés peuvent se connecter. Le passage en
Production sera nécessaire avant d'ouvrir aux 40 pratiquants — décision
volontairement reportée, voir `PRODUCTION.md` § 5.

## 4. Fichiers

| Fichier | Emplacement | Rôle |
|---|---|---|
| `index.html` | dépôt GitHub | PWA complète (HTML + CSS + JS inline), lit/écrit Firestore directement |
| `firestore.rules` | dépôt GitHub | toute la sécurité — lecture/écriture par collection, cloisonnement par email |
| `firestore.indexes.json` | dépôt GitHub | index composites nécessaires aux requêtes (attributions, séances, séries, commentaires) |
| `scripts/seed.mjs` | dépôt GitHub | seed initial (catalogue, modèles-types, compte coach) — exécuté une fois en local avec `firebase-admin`, jamais depuis le client |
| `manifest.json` | dépôt GitHub | manifeste d'installation |
| `sw.js` | dépôt GitHub | service worker, cache de la coquille — `CACHE` à incrémenter à chaque déploiement |
| `modele-import.xlsx` | dépôt GitHub | gabarit d'import de programme, lu par SheetJS dans le navigateur |
| `apps-script/` | dépôt GitHub | **archive** de l'ancien backend Apps Script — jamais appelé, conservé pour référence (§ 12) |
| `README.md` | non déposé | guide d'installation en 8 étapes |
| `favicon.ico` | racine | monogramme officiel Wellness, source des icônes |
| `assets/` | racine | logo Wellness pour fond sombre |

**Icônes :** produites depuis `favicon.ico`, le monogramme officiel Wellness
(W cerclé, `#C22026`, transparent, 135×134) fourni par le coach. Fond `#151515`,
marque à 72 % pour les icônes classiques, 76 % pour la maskable (12 % de marge par
côté, zone sûre respectée). Régénérables : voir § 9.

## 5. Modèle de données Firestore

Nesté ce qui n'a jamais de sens hors de son parent (lignes de modèle, lignes de
programme, séries d'une séance) ; gardé à plat ce qui doit être requêté par égalité
sur l'email à travers tous les parents (`attributions`, `seances`).

```
pratiquants/{email}                         # doc ID = email en minuscules
  nom, role, admin, statut, telephone, date_inscription, objectif, notes
  resume: { nbSeances, derniereSeanceLe }    # dénormalisé, écrit par le pratiquant en fin de séance
  pratiquants/{email}/prive/photo            # doc unique, coach-only
  pratiquants/{email}/maxis/{exerciceId}     # doc ID = exercice_id, coach-only en écriture
  pratiquants/{email}/activites/{activiteId} # auto-id, self-service
  pratiquants/{email}/recurrences/{id}       # planning personnel, self-service

exercices/{exerciceId}                       # doc ID = "EX001"...
modeles/{modeleId}                           # auto-id, coach-only
  modeles/{modeleId}/lignes/{ligneId}        # auto-id

attributions/{attributionId}                 # auto-id, TOP-LEVEL (requêtes par email+statut)
  email, modele_id, nom, date_debut, date_fin, statut, paye, notes, duree_semaines, cree_le
  nb_jours, nb_exercices                     # dénormalisés, lus par les listes
  attributions/{id}/programme/{ligneId}      # copie des lignes du modèle au moment de l'attribution
  attributions/{id}/ajustements/{exerciceId} # doc ID = exercice_id, écrit par le pratiquant lui-même

seances/{seanceId}                           # auto-id, TOP-LEVEL (requêtes par email+date)
  email, date, jour, duree_min, duree_prevue, ressenti, notes, exercices_finis: string[]
                                             # ↳ des ligne_id (voir « Une ligne, un compteur »)
  seances/{seanceId}/series/{serieId}        # auto-id
                                             # exercice_id (historique) + ligne_id (compteur)

commentaires/{commentaireId}                 # TOP-LEVEL
compteurs/exercices                          # doc unique { dernier }, transaction pour "EXnnn"
```

Les champs eux-mêmes ont presque tous survécu tels quels au portage (`cadence`,
`pct_rm`, `duree_s`, `pause_s`...) — c'est la couche données qui a changé
(`api()` → SDK Firestore direct), pas la forme des objets que les écrans
consomment. Les sous-sections qui suivent restent donc valables mot pour mot.

`jour` est un texte libre (ex. « Lundi — Haut ») : il devient l'onglet affiché dans
l'app. Les jours sont triés par jour de semaine (`triJours`), pas alphabétiquement —
sinon « Jeudi » passait avant « Lundi ».

### Les blocs

`bloc` regroupe les lignes qui s'enchaînent. **Plusieurs lignes partageant le même
`bloc` forment un superset ou un circuit** : on enchaîne les exercices, et le repos
n'intervient qu'à la fin du tour. `ordre` classe les exercices à l'intérieur du bloc.

`series` et `repos_s` sont lus sur la **première ligne du bloc** et valent pour tout
le bloc ; `reps_cible` et `charge_cible` restent propres à chaque ligne.

Une ligne seule dans son bloc = une série classique, comportement d'avant.

C'est le niveau « Travail » du modèle AppSheet (§ 13), repris dans sa forme légère :
un champ, pas une collection à part. La version complète — programmes réutilisables,
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

**Ces deux enchaînements ne partent que depuis le panneau de saisie.** Valider
une série depuis la pastille est un raccourci : il écrit la série et rien
d'autre, sans armer de minuteur. D'où la **rangée de chronos** en haut de
l'écran séance, sous les onglets de jours (`peindreChronos`) : un bouton par
temps mort du jour, qui lance `lancerMinuteur` à la main. Les durées ne sont
pas inventées — ce sont les `repos_s` des blocs et les `pause_s` des exercices
du jour affiché. Un jour sans aucun temps mort déclaré n'affiche pas de rangée
du tout ; le programme du coach fait foi.

**Les boutons ne portent que la durée** — « 45 s », « 1 min 30 ». Pause et
repos ne se distinguent que dans l'enchaînement automatique, où le mot dit
d'où vient le temps mort ; lancé à la main, un chrono de 30 s est un chrono de
30 s. La déduplication porte donc sur la seule durée : un repos et une pause
de même longueur ne font qu'un bouton.

### Cadence

`cadence` est un tempo en quatre temps, dans l'ordre
**montée · position haute · descente · position basse**.
« 1-0-3-1 » = montée en 1 s, pas d'arrêt en haut, descente en 3 s, 1 s en bas.

**Les tirets se tapent tout seuls.** Quatre chiffres collés suffisent : « 1031 »
devient « 1-0-3-1 ». Les tirets sont évidents et pénibles à saisir sur un clavier de
téléphone. Un temps à deux chiffres — un maintien de 10 secondes — demande encore les
tirets : « 1-10-1-0 ». Le champ n'est réécrit qu'une fois les quatre chiffres posés,
et seulement si le curseur est au bout, pour ne pas le déplacer en pleine frappe.

Affichée en pastille sur la carte et en toutes lettres dans la saisie, accompagnée
d'une **courbe** : le temps en abscisse, la position de la charge en ordonnée, une
ligne rouge entre les deux guides. La pente donne la vitesse, le plat donne l'arrêt.
Fonction `courbeCadence()` dans `index.html`, SVG inline, aucune dépendance.

Purement indicatif : rien n'est chronométré dessus.

### Une ligne, un compteur

Un même exercice peut revenir **plusieurs fois dans un bloc** — Zercher squat en
4 × 6 à 50 kg, puis 4 × 12 à 30 kg. Ce sont deux lignes de programme distinctes,
et chacune compte ses propres séries : deux pastilles indépendantes, que le
pratiquant valide séparément. Rien ne les associe.

C'est pour ça que la série écrite porte **deux** identifiants :

| Champ | Sert à |
|---|---|
| `exercice_id` | l'historique de l'exercice, tous programmes confondus — « dernière fois », record, maxi estimé |
| `ligne_id` | le compteur de la séance en cours — l'id du doc `attributions/{id}/programme/{ligneId}` |

`exercices_finis` porte lui aussi des `ligne_id` : clore une ligne ne clôt pas
l'autre. Les séances écrites avant l'ajout de `ligne_id` n'en ont pas ; `dataSeance`
répartit alors leurs séries sur les lignes de leur exercice, dans l'ordre, chacune
jusqu'à son nombre prévu. Sans ce repli, la première ligne héritait de tout.

**Le compteur ne dépasse jamais la consigne.** Une fois les séries prévues
validées, la pastille est pleine et inerte, et le bouton du panneau passe à
« Les N séries sont faites ». Un verrou par ligne (`enEcriture`) empêche deux
appuis rapprochés d'écrire chacun leur série avant que l'autre n'ait été comptée —
la pastille répond plus vite que Firestore.

### Exercices au temps

`duree_s` renseigné bascule l'exercice en mode chrono et `reps_cible` est ignoré.
Une valeur numérique donne un décompte (le gainage à 45 s), la valeur `max` un
chrono qui monte jusqu'à l'échec. La série enregistrée porte alors `duree_s` au lieu
de `reps` — c'est pour ça que `logSerie_` accepte l'un **ou** l'autre.

## 6. Accès aux données — fonctions `index.html`

Plus d'API : chaque écran appelle le SDK Firestore directement. La table ci-dessous
mappe l'ancienne action serveur à la fonction qui l'a remplacée, pour retrouver un
comportement documenté dans un vieux commit ou un commentaire Apps Script.

| Ancienne action | Fonction actuelle | Notes |
|---|---|---|
| `bootstrap` | `chargerProfil` | lecture directe de `pratiquants/{email}` |
| `seance` | `dataSeance` / `chargerSeance` | assemble aussi maxi, ajustement, historique borné (5 dernières séries/exercice) |
| `demarrer` | `demarrerSeance` | invariant global (§ voir plus bas), pas par jour |
| `serie` | `enregistrerSerie` | écrit `exercice_id` **et** `ligne_id` (voir « Une ligne, un compteur ») |
| `terminer` | `terminerSeance` | met aussi à jour `resume.nbSeances` du profil, même lot |
| `finirExercice` / `reprendreExercice` | `finirExercice` / `reprendreExercice` | `arrayUnion`/`arrayRemove` sur `exercices_finis`, par `ligne_id` |
| `annuler` | `supprimerSeance` | |
| `historique` | `dataHistorique` | |
| `calendrier` | `dataCalendrier` | |
| `catalogue` | `dataCatalogue` | |
| `coachAthletes` | `dataCoachAthletes` | assiduité approximée depuis `resume.nbSeances`, pas un vrai recalcul — évite de lire l'historique de tous les athlètes à chaque ouverture |
| `coachDetail` | `dataCoachDetail` | |
| `exerciceSave` / `exerciceSuppr` | `sauverExercice` / `supprimerExercice` | l'id `EXnnn` vient d'une transaction sur `compteurs/exercices`, plus un scan du plus grand id |
| `programme` | `dataProgramme` | |
| `programmeSave` / `programmeJour` | `sauverLignesJour` / `supprimerLignesJour` | partagées avec les modèles, même structure |
| `modeles` / `modele` | `dataModeles` / `dataModele` | |
| `modeleSave` / `modeleSuppr` | `sauverModele` / `supprimerModele` | |
| `modeleJourSave` / `modeleJour` | `sauverLignesJour` / `supprimerLignesJour` | |
| `attributions` | `dataAttributions` | |
| `attribuer` | `creerAttribution` | pas de vraie transaction, voir § 8 |
| `attributionMaj` / `attributionSuppr` | `majAttribution` / `supprimerAttribution` | |
| `ajuster` | `ajusterCharge` | écrit par le pratiquant sur sa propre attribution |
| `pratiquantCreer` / `pratiquantSave` | `creerPratiquant` / `sauverPratiquant` | |
| `photoSave` / `photoSuppr` | `sauverPhoto` / `supprimerPhoto` | coach uniquement, règle |
| `maxis` / `maxiSave` / `maxiSuppr` | `dataMaxis` / `sauverMaxi` / `supprimerMaxi` | l'estimation Epley n'est plus persistée, voir § 8 |
| `commenter` / `commentairesLus` | `commenter` / `marquerCommentairesLus` | |
| `activiteSave` / `activiteSuppr` | `sauverActivite` / `supprimerActivite` | |
| `messageType` | `dataMessageType` | composé côté client, plus de serveur à appeler |
| `notifierMail` | *(pas d'équivalent)* | nécessite le second projet Apps Script du § 7 de PRODUCTION.md, pas construit ; `mailto:` en attendant |
| `lot`, `maintenance.*` | *(retirés)* | `lot` n'amortissait qu'une latence Apps Script disparue ; `maintenance.*` est le travail de `scripts/seed.mjs` |

## 7. Sécurité en place

Portée entièrement par `firestore.rules`, plus aucun routeur serveur derrière le
SDK — une règle mal écrite est une faille immédiate, pas un bug discret :

- `estMoi(email)` : le champ `email.lower()` du jeton Firebase Auth doit égaler la
  cible de la lecture/écriture — jamais un paramètre du client
- `estCoach()` / `estAdmin()` : lus par `get()` sur `pratiquants/{email}`, pas par
  un custom claim — évite toute Cloud Function, reste sur le plan Spark
- `statutOk()` : un pratiquant *Inactif*/*Archivé* ne peut plus écrire (mais lit
  toujours), même règle qu'avant sous Apps Script
- Modèles et catalogue d'exercices en écriture : coach uniquement ; le pratiquant ne
  voit jamais un modèle, seulement sa copie dans `attributions/{id}/programme`
- Photos, Maxis (écriture) : réservées au coach — un pratiquant ne gère ni ses
  photos de suivi ni son propre 1RM mesuré
- Activités libres, ajustements de charge, planning personnel : self-service,
  écrits par le pratiquant sur ses propres documents
- `admin:true` peut réécrire un historique déjà clos (séance, série) et attribuer
  les rôles ; le journal d'audit prévu au plan (`audit/`) n'est pas construit

## 8. Pièges rencontrés — à ne pas réapprendre

### Firestore (backend actuel)

**Un pratiquant qui lit `modeles/{id}` directement se fait refuser.** La règle est
coach-only : la durée d'un programme, par exemple, doit être copiée sur l'attribution
à sa création (`duree_semaines`) plutôt que relue depuis le modèle source — sinon
l'écran d'accueil du pratiquant plante en silence à « Missing or insufficient
permissions » dès qu'il a un programme actif.

**Les transactions du SDK client ne lisent pas de requête, seulement des documents
un par un.** L'invariant « pas deux séances ouvertes à la fois » ou « une seule
attribution En cours » ne peut donc pas être une vraie transaction côté navigateur :
c'est une lecture puis une écriture, avec le bouton désactivé pendant l'appel comme
seule garde contre un double-tap. Risque accepté, pas contourné.

**`serverTimestamps: 'estimate'` est nécessaire dès qu'on relit un document tout
juste écrit.** Sans cette option, un champ `serverTimestamp()` pas encore confirmé
par le serveur vaut `null` — une séance qu'on vient de créer semble alors ne pas
exister, et un contrôle d'invariant qui la cherche la rate.

**Composite index et `collectionGroup`** : une requête qui traverse plusieurs
parents (ex. l'historique d'un exercice, tous jours confondus, via
`collectionGroup('series')`) exige un index composite déclaré dans
`firestore.indexes.json` et déployé — sinon Firestore refuse la requête avec un
lien de création dans le message d'erreur, pas un résultat vide.

**Toute écriture qui n'a pas de filet (`try/catch`) autour de son chargement laisse
l'écran bloqué sur « Chargement… » pour toujours** si Firestore refuse pour une
raison quelconque, sans le moindre message — pas d'erreur réseau bruyante comme
avec un appel HTTP classique. Chaque écran (`vueX`) doit encadrer sa lecture
principale.

**L'estimation du 1RM par formule d'Epley n'est plus recalculée sur tout
l'historique.** Les règles réservent l'écriture de `maxis` au coach ; le client ne
peut donc plus persister une estimation. `dataSeance` l'approxime en mémoire depuis
les cinq dernières séries connues de l'exercice (déjà lues pour « dernier »/
« record »), pas depuis toute la carrière du pratiquant — une estimation moins
précise mais bornée.

### Apps Script (backend historique, `apps-script/`)

Conservé pour mémoire : rien de tout ça n'est plus appelé, mais utile si le second
projet autonome pour l'e-mail (PRODUCTION.md § 7) doit être construit.

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
pratiquant : grille mensuelle, bilan du mois, détail au clic sur un jour. Chargé une
fois sur douze mois, la navigation entre mois ne recharge rien.

Deux natures d'événement s'y côtoient, et se distinguent d'un regard :

| | Dans la grille | Au clic |
|---|---|---|
| Séance du programme | case en **aplat rouge**, point plein | séries, volume, durée, ressenti |
| Activité libre | case **en contour**, point clair | sport, durée, distance, effort |

Un jour qui porte les deux montre les deux points. Le bilan du mois compte les
séances et les activités **séparément** : mélanger ce que le coach a prescrit et ce
que le pratiquant a ajouté de lui-même fausserait la lecture de l'assiduité.

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

`dataSeance` et `chargerProfil` lisent les lignes de l'attribution en cours via
`attributionActive` (`attributions/{id}/programme`). Sans attribution active, le
pratiquant voit l'écran « Aucun programme pour l'instant » — plus de repli sur des
lignes non rattachées, chaque ligne de programme appartient désormais à une
attribution précise.

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

## 8 quinquies. Aucune migration obligatoire (historique, Apps Script)

Cette section décrivait l'auto-création des onglets/colonnes manquants sous
Sheets — sans objet avec Firestore, qui n'a pas de schéma à faire évoluer : un champ
absent sur un document se lit simplement comme absent, sans étape préalable. Conservé
pour mémoire, comme le reste des sections marquées « historique » de ce chapitre.

## 8 sexies. Charges en pourcentage du max

`pct_rm` sur une ligne de programme remplace la charge fixe : la charge est
recalculée à chaque lecture depuis le 1RM du pratiquant, et suit donc sa
progression sans que le coach ait à retoucher le programme.

```
Squat · 5 tours
  ├─ 3 reps à 90 %   ─┐ même exercice, même bloc
  └─ 12 reps à 60 %  ─┘ top set puis back-off
```

**D'où vient le 1RM.** Une valeur saisie par le coach dans `pratiquants/{email}/maxis`
fait foi — écriture réservée au coach par les règles, un pratiquant ne peut pas la
poser lui-même. À défaut, `dataSeance` l'estime depuis les **cinq dernières** séries
connues de l'exercice (déjà lues pour « dernier »/« record », pas de lecture
supplémentaire) par la formule d'Epley, `1RM ≈ charge × (1 + reps / 30)`, en retenant
la meilleure des cinq. Avant la migration Firestore, le serveur retenait la meilleure
de **toute la carrière** du pratiquant — un calcul qu'un navigateur ne peut plus se
permettre en lecture à chaque ouverture de séance ; l'estimation est donc un peu
moins précise qu'avant, mais bornée. Les séries de plus de 15 répétitions sont
ignorées, Epley y devient trop optimiste.

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

**Avant la migration Firestore**, deux mécanismes maison géraient ça : un cache de
lecture dans `localStorage` (`lire()`), et une file d'écriture rejouée au retour du
réseau (`ecrire()`), limitée à cinq actions qui décrivent un fait daté plutôt qu'un
état global. Une séance démarrée hors ligne recevait un identifiant provisoire
(`LOC-…`), substitué partout une fois la séance vraiment créée au rejeu.

**Depuis la migration**, tout ce mécanisme a disparu — `persistentLocalCache` du SDK
Firestore fait ce travail nativement : les lectures sont servies depuis le cache
local, les écritures sont appliquées optimistiquement (l'ID du document est généré
côté client dès l'appel, avant même la confirmation réseau) et rejouées dans l'ordre
au retour du réseau. Plus de file à gérer à la main, plus d'identifiant provisoire :
chaque écriture a son ID définitif dès le départ. Le bandeau « Hors ligne » restant
dans `index.html` est un indicateur générique lié à `navigator.onLine`, plus lié à
un mécanisme de file.

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

**La photo du pratiquant** s'affiche en pastille dès la liste des athlètes, et en
grand sur sa fiche. À défaut, ses initiales.

Le fichier est **réduit dans le navigateur** avant l'envoi : carré de 256 px recadré
au centre, en JPEG, la qualité baissant par paliers jusqu'à tenir sous 44 000
caractères. Une cellule de Sheet en accepte 50 000, et une liste de 40 athlètes ne
doit pas peser des mégaoctets.

Les images vivent dans un onglet `Photos` séparé, joint à la demande : sans ça,
chaque lecture d'une fiche traînerait quelques kilo-octets d'image pour rien.
Aucun service externe, aucune portée Drive supplémentaire.

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

### Le gabarit d'import

Pour verser un programme sans passer par le dépôt : `modele-import.xlsx`, à la
racine, sert de gabarit — une notice, la fiche du modèle (onglet **Fiche**), la
grille à remplir (onglet **Programme**, exercices désignés par leur nom), et la
liste des exercices disponibles en référence. Rempli, `Réglages ▸ Importer un
programme` le lit dans le navigateur (SheetJS) et écrit un modèle dans Firestore —
plus d'aller-retour par un onglet du classeur Google, l'ancien sas a disparu avec
Sheets.

Rien n'est créé si un seul nom d'exercice de l'onglet Programme est introuvable au
catalogue — `importerModele` renvoie la liste des noms en défaut plutôt que de
produire un programme troué.

**Il ne contient aucun contenu acheté**, seulement la structure.

## 8 quindecies. L'accueil du pratiquant

Écran d'arrivée, calqué sur ce que HexFit fait bien et débarrassé de ce qu'il fait
en trop.

**Ce qu'on affiche.** Une salutation selon l'heure, la **prochaine séance
programmée** avec son échéance — aujourd'hui, demain, dans trois jours — et le
**programme en cours** : nom, semaine sur durée, barre d'assiduité. Puis deux liens,
« Voir le détail » et « Tous mes programmes ».

**Sans le détail des exercices.** L'accueil dit quoi et quand, pas comment. Le
contenu de la séance est à un appui.

`accueil_()` calcule la prochaine séance en comparant les jours du programme au jour
courant, modulo sept. Une séance du jour **déjà close** renvoie à la semaine
suivante : sinon l'app proposerait éternellement de refaire ce qui vient d'être fait.
Vérifié sur les sept jours de la semaine.

**La navigation du pratiquant** devient Accueil · Calendrier · Progrès. L'écran de
séance n'est plus un onglet mais une destination, atteinte depuis l'accueil.

## 8 sexdecies. Activités libres

Tout ne se passe pas dans le programme : une sortie course, un match, une séance
improvisée. `Coach ▸ … ▸ ＋ Consigner une activité` enregistre sport, date, durée,
distance, **perception de l'effort de 0 à 10** et notes.

Le sport se choisit dans une liste groupée par famille — salle, course, vélo, eau,
collectif, raquette, combat, souplesse, glisse. Volontairement courte : de quoi
couvrir ce que font vraiment des pratiquants de musculation, pas un catalogue de
fédération. « Séance libre » couvre la séance à nu, hors programme.

Les activités remontent à trois endroits : l'accueil du pratiquant, son calendrier,
et la **fiche que consulte le coach** — section « Activités hors programme ». Voir
qu'un pratiquant a couru trois fois dans la semaine change la lecture de son
assiduité, et c'est une information qu'aucune séance prescrite ne donne.

### Ce qu'on a repris de HexFit, et ce qu'on a écarté

| | |
|---|---|
| Repris | accueil qui dit la prochaine séance et le programme en cours |
| Repris | saisie d'activité libre avec liste de sports et effort perçu 0-10 |
| Repris | bande de jours marquant ceux qui portent quelque chose (déjà dans le calendrier) |
| **Écarté** | nutrition — hors sujet pour ce coach |
| **Écarté** | messagerie intégrée — SMS, e-mail et WhatsApp existent déjà et le coach les maîtrise |

La messagerie mérite un mot : c'est un canal de plus à surveiller, un historique de
plus à conserver, et une conversation qui n'existe nulle part ailleurs. Le bouton
**Prévenir** (§ 8 duodecies) fait le travail avec les outils que tout le monde a déjà.

## 8 septendecies. La note du coach et le fil de l'exercice

Deux choses distinctes, souvent confondues.

**La note** est une consigne. Le coach l'écrit sur une ligne de programme, elle fait
partie de la prescription et se lit avec l'exercice — en liseré rouge sur la carte,
en grand dans l'écran de saisie, signée de son prénom. Colonne `note` de
`Programmes` et `ModeleLignes`, donc elle survit à la copie modèle → attribution.

Elle se distingue de la `consigne` du catalogue : celle-ci décrit le mouvement pour
tout le monde, la note s'adresse à **une personne sur cet exercice**. « Ne descends
pas plus bas que la parallèle tant que ton genou tire » n'a de sens que pour un seul
pratiquant.

**Le fil** est une conversation. Coach et pratiquant écrivent tour à tour, attachés à
l'exercice. Bulles rouges pour l'un, grises pour l'autre. Un compteur signale ce qui
attend une réponse : sur la carte de l'exercice côté pratiquant, sur la ligne de
l'athlète côté coach. Ouvrir le fil vaut lecture.

### Pourquoi ce n'est pas la messagerie qu'on a refusée

Une messagerie est un canal parallèle : un endroit de plus à surveiller, une
conversation qui flotte hors de tout contexte. Ici le propos reste **collé au
mouvement dont il parle**. On rouvre le développé couché six mois plus tard et on
retrouve la remarque sur l'épaule qui coinçait, à côté des charges de l'époque.

C'est aussi pour ça qu'il n'y a pas de notification : le mot attend sur l'exercice,
et se voit au moment où on en a besoin — quand on est devant la barre.

## 8 octodecies. Vitesse (historique, Apps Script)

Cette section détaillait l'optimisation d'un modèle devenu obsolète : chaque action
passait par Apps Script, qui mettait 0,5 à 2 s rien qu'à répondre, sur un « classeur
entier en mémoire » relu à chaque fois — mémoire de requête, cache des onglets
stables, photos différées, affichage immédiat depuis une copie locale (`lireVite()`).
C'est précisément cette latence incompressible qui a motivé le passage à Firestore
(PRODUCTION.md § 1) : les lectures vont directement du navigateur à la base, sans
serveur entre les deux, et `persistentLocalCache` sert le hors-ligne nativement.

**Ce qui reste comme discipline, sous une autre forme :**

- **Dénormaliser plutôt que recalculer à volée** — `resume.nbSeances` sur le profil
  évite de lire l'historique de tous les athlètes à l'ouverture de la liste
  (`dataCoachAthletes`) ; `nb_jours`/`nb_exercices` sur les attributions et modèles
  évitent de lire leurs sous-collections juste pour les compter.
- **Photos différées** : toujours vrai, `dataPhotos` part après la liste des
  athlètes, pas avec.
- **Historique borné** : la formule d'Epley et « dernier/record » ne lisent plus
  que les cinq dernières séries d'un exercice, pas toute la carrière (§ 8, Pièges
  Firestore).

**Le plafond des photos reste le même dans l'esprit**, juste porté ailleurs :
encodées en base64 dans un document Firestore (`prive/photo`) plutôt qu'une cellule
de classeur, chaque photo tient large sous la limite de 1 Mo par document. Au-delà
de cent pratiquants, les déplacer vers un stockage dédié reste l'idée de secours
(PRODUCTION.md § 6).

## 8 novodecies. On clique la ligne, pas l'icône

Partout où une ligne représente un enregistrement — un exercice du programme, une
fiche du catalogue, un maximum, un programme attribué — **la ligne entière ouvre
l'édition**. Les crayons ont disparu : ils étaient de petites cibles, et un pouce
en salle ne vise pas au pixel.

`lignesCliquables()` pose le comportement en une ligne de code par écran. Les
boutons imbriqués gardent leur rôle : supprimer, monter, prévenir, ouvrir un lien.
Un clic sur eux ne déclenche pas l'édition, un clic ailleurs sur la ligne si.

Les zones tactiles des boutons restants passent de 4 à 8 pixels de marge, pour la
même raison.

## 8 vicies. Glisser-déposer

Blocs et exercices se réordonnent au doigt dans l'éditeur. Un exercice peut passer
d'un bloc à l'autre, ce qui est le geste courant : on transforme deux séries isolées
en superset en tirant l'une dans l'autre.

**Pas de glisser-déposer HTML5.** Il n'existe pas au tactile, et le coach travaille
au téléphone. `triable()` passe par les événements pointeur, qui couvrent souris et
doigt sans dépendance ni bibliothèque à charger — l'app doit rester utilisable hors
ligne.

**Écouter le document, pas capturer le pointeur.** La première version appelait
`setPointerCapture` sur la poignée ; son échec interrompait le gestionnaire avant
même d'installer les écouteurs, et la poignée ne répondait à rien. `pointermove` et
`pointerup` sont désormais écoutés sur le document, qui voit tout — le doigt quitte
la poignée dès le premier centimètre de toute façon.

**Une poignée nommée par ce qu'elle déplace.** `[data-poignee="bloc"]` ou
`"exercice"`. Un sélecteur descendant attrapait les poignées d'exercices depuis le
bloc parent, et le second appel écrasait les liaisons du premier.

**Une poignée dédiée**, pas la ligne entière : attraper la ligne entrerait en conflit
avec le défilement. La poignée porte `touch-action: none`, ce qui dit au navigateur
de ne pas interpréter le geste comme un scroll.

**Des identités, pas des positions.** Chaque bloc et chaque exercice reçoit un `_uid`
au chargement. Après un déplacement, `relireOrdre()` relit le DOM et reconstruit
`S.ed` à partir de ces identités : une clé fondée sur la position se serait invalidée
au premier mouvement. Les réglages du bloc — tours, repos — suivent le bloc.

Vérifié sous Node avec un DOM simulé : bloc descendu en dernier, exercice déplacé
d'un bloc à l'autre, bloc entièrement vidé. Le bouton « monter » disparaît, devenu
inutile.

## 8 vicies bis. Le temps

### Estimer la durée d'une séance

`estimerDuree_()` additionne, en secondes :

- chaque série, soit les répétitions × la cadence — une fourchette « 8-10 » compte
  pour 9, « max » pour 10, une cadence absente vaut **2 s par répétition**, soit le
  tempo naturel : une seconde de montée, une de descente. Rien n'est inscrit dans le
  champ pour autant, l'absence de cadence reste l'absence de cadence ;
- les exercices au temps, à leur durée, « max » comptant pour 45 s ;
- les pauses à l'intérieur du bloc, entre deux exercices seulement ;
- les repos entre les tours, **un de moins que de tours** : le dernier repos est
  absorbé par le passage au bloc suivant ;
- **4 minutes par changement de bloc** — trouver le poste, charger la barre ;
- **10 minutes d'échauffement**, une seule fois.

Les trois constantes sont dans `CONFIG`. C'est une estimation de planification, pas
une promesse : elle ignore le temps passé à discuter ou à attendre un banc.

Elle s'affiche **arrondie à cinq minutes** et formulée, jamais annoncée comme un
calcul : 61 minutes devient « 1 heure », 95 devient « 1 h 35 ». Le mot « environ »
est inutile — personne ne prend une durée de séance pour une promesse à la minute,
et l'arrondi le dit déjà.

La durée s'affiche sur l'accueil, sur l'écran de séance, dans l'éditeur et sur les
programmes. **Chaque bloc affiche aussi la sienne**, sans l'échauffement ni le
changement de poste qui n'appartiennent à aucun bloc en particulier : c'est ce qui
permet de voir d'un coup d'œil quel bloc pèse dans la séance.

Côté pratiquant, un bloc à un seul exercice n'a pas d'en-tête — il ne se distingue
pas d'une série classique, et c'est voulu. Sa durée et son repos passent alors **sur
la carte de l'exercice**, faute de quoi ils ne s'afficheraient nulle part.

Les repos sont écrits en minutes dès qu'ils dépassent la minute : « 2 min 30 » plutôt
que « 150 s », qu'on ne lit pas. `dureeJour()` la recalcule côté client pour le jour en cours d'édition,
que le serveur ne connaît pas encore.

### Démarrer et suivre

Un bouton **Démarrer la séance** ouvre la séance explicitement, au lieu de la créer
en douce à la première série. Le bandeau devient alors un pendule : *23 min sur
43 prévues · 2/5 exercices*. Il bat à la minute — la seconde n'apprendrait rien et
réveillerait l'écran pour rien.

`demarrerSeance_` fige `duree_prevue` au démarrage : le programme peut changer
ensuite, la comparaison n'aurait plus de sens.

### Assiduité et régularité

Deux mesures distinctes, et le coach a besoin des deux.

**L'assiduité** répond « en fait-il assez ? » : nombre de séances, moyenne par
semaine, histogramme sur douze semaines où les activités libres se distinguent des
séances du programme.

**La régularité** répond « à quel rythme ? ». On mesure l'écart entre séances
consécutives, et on rapporte sa dispersion à sa moyenne : plus les écarts se
ressemblent, plus la note est haute. Elle n'est pas calculée sous trois écarts.

La distinction n'est pas théorique. Vérifié : douze séances régulières donnent 80,
les **mêmes douze séances** tassées au début puis plus rien donnent 0. L'assiduité
est identique, la progression ne le sera pas.

**Le temps réel contre le prévu** complète le tableau. Un dépassement systématique
dit que les repos sont trop courts sur le papier ou qu'on traîne entre les exercices ;
une séance plus rapide que prévu dit des repos écourtés ou des séries sautées.

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

### Les deux thèmes

Sombre par défaut — c'est l'identité de l'enseigne, et une salle est rarement en
plein jour. Un thème clair a été ajouté, réglable par **chaque** utilisateur,
coach comme pratiquant, par le bouton ◐ de l'en-tête. Trois valeurs : `sombre`,
`clair`, `auto` (« comme le téléphone »).

Le choix vit dans `localStorage` sous `muscu.theme`, **pas dans le classeur** : le
même compte peut vouloir du clair sur l'ordinateur et du sombre sur le téléphone
en salle.

Rien n'est dupliqué : le clair **redéfinit les mêmes jetons**, jamais une règle de
composant. Deux sélecteurs y mènent — `:root[data-theme="clair"]` pour le choix
explicite, `:root.sys-clair` que le script d'amorçage pose quand `auto` et que le
système est en clair. Ce script est **en tête de document**, avant le premier
pixel : posé plus bas, l'écran clignoterait en sombre avant de virer au clair.
`matchMedia` reste écouté pour qu'`auto` suive le téléphone app ouverte.

Les couleurs en dur ont dû devenir des jetons pour que le clair existe :
`--sunk` (champs, vignettes), `--press` (appui), `--lift` (glissé), `--veil`
(voile des modales), `--nav-bg`, `--relief` (ombre portée, nulle en sombre), et
le trio sémantique `--warn-ink/-bg`, `--ok-ink/-bg`, `--bad-ink/-bg`, distinct de
l'accent de marque.

Un renversement à connaître : **`--brand-ink` vaut `#E05253` en sombre et
`#A61E1F` en clair.** Le rouge officiel, illisible en texte sur fond noir (2,4:1),
redevient le bon choix sur fond clair (7,4:1). C'est le même rôle, pas la même
valeur.

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

Le dessin montre **la barre entière**, symétrique : bague, disques, fût, disques,
bague. Les disques sont chargés comme on les charge vraiment — le plus lourd contre
le fût, les plus petits vers l'''extérieur.

    100 kg   |oO————Oo|      40 par côté : 25 + 15
    130 kg   |·OO————OO·|    55 par côté : 25 + 25 + 5

Deux versions ont raté avant celle-ci : la première posait les disques au milieu du
fût, la seconde ne dessinait qu'''un côté. Une barre est symétrique et se charge par
les bouts, les deux comptent.

## 10. Prochaines étapes

Ce qui reste, par ordre d'utilité décroissante — le détail et le « pourquoi » sont
dans `PRODUCTION.md` § 5.

1. **Importer les vrais programmes de Jérémy** depuis `Réglages ▸ Importer un
   programme`, avec `modele-import.xlsx` rempli. Le catalogue, lui, est déjà le vrai
   (171 exercices, seedé une fois par `scripts/seed.mjs`).
2. **Éprouver l'app en salle**, téléphone en main entre deux séries. Safari sur iOS,
   Chrome sur Android.
3. **Décider ce que le pratiquant peut ajuster d'autre** que la charge — les
   répétitions, par exemple (§ 8 octies).
4. **Construire l'écran de tableau de bord** qui remplace l'ancien rapport
   hebdomadaire par e-mail (`rapportHebdo`, disparu avec Apps Script) — assiduité de
   tous les athlètes en un coup d'œil, à la demande plutôt qu'un envoi programmé.
5. **Passer l'écran de consentement Google (Firebase Auth) en Production** avant
   d'ouvrir aux 40 pratiquants. En mode Test, seuls les comptes explicitement
   ajoutés se connectent.

## 11. Idées d'évolution non implémentées

- Notification au coach lors d'un record battu
- Export PDF du bilan mensuel — plus de `DocumentApp` sans un Apps Script dédié ;
  une lib JS côté client est la piste la plus simple maintenant
- Comparaison entre pratiquants suivant le même modèle
- Archivage annuel des séries — moins urgent qu'avec un classeur, Firestore n'a pas
  de plafond de lignes comparable
- Envoi d'e-mail direct depuis le compte du coach : second projet Apps Script
  autonome, sans classeur (PRODUCTION.md § 7) — `mailto:` fait l'affaire en attendant

## 12. Outillage local — clasp

**`apps-script/` n'est plus le backend de l'app** (§ 2) : ce qui suit reste vrai pour
qui touche à cette archive, ou construit le second projet Apps Script autonome dédié
à l'e-mail (PRODUCTION.md § 7) — plus pour développer l'app elle-même.

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
